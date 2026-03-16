import type { Result } from "better-result"
import { Result as R } from "better-result"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  articleCategoriesTable,
  articleSectionsTable,
  articlesTable,
  categoriesTable,
  citationsTable,
  clustersTable,
  feedItemsTable,
} from "@/lib/db/schemas"
import { logger } from "@/lib/logger"
import type { SummarizedArticle } from "./ai-summarizer"
import { summarizeCluster } from "./ai-summarizer"
import { scrapeArticle } from "./article-scraper"
import type { ExtractedCitation } from "./citation-extractor"
import { extractCitationsFromCluster } from "./citation-extractor"
import { PipelineError } from "./errors"
import { ingestAllFeeds } from "./feed-ingestion"
import { clusterByTopic } from "./topic-clustering"

const DEFAULT_AI_MODEL = "gpt-4o-mini"
const VALID_AI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] as const

type AIModel = (typeof VALID_AI_MODELS)[number]

interface PipelineResult {
  feedsProcessed: number
  clustersFound: number
  articlesCreated: number
  errors: string[]
}

async function getModelForCluster(topic: string): Promise<string> {
  try {
    const cluster = await db.query.clustersTable.findFirst({
      where: eq(clustersTable.topic, topic),
      columns: { aiModel: true },
    })

    if (
      cluster?.aiModel &&
      VALID_AI_MODELS.includes(cluster.aiModel as AIModel)
    ) {
      return cluster.aiModel
    }
  } catch {
    // Fallback to default on error
  }

  return DEFAULT_AI_MODEL
}

function ensureCategory(slug: string): Promise<Result<string, PipelineError>> {
  return R.gen(async function* () {
    const existing = yield* R.await(
      R.tryPromise({
        try: () =>
          db.query.categoriesTable.findFirst({
            where: eq(categoriesTable.slug, slug),
            columns: { id: true },
          }),
        catch: (e) =>
          new PipelineError({
            message: `Failed to query category ${slug}`,
            cause: e,
          }),
      }),
    )

    if (existing) return R.ok(existing.id)

    const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")

    const [inserted] = yield* R.await(
      R.tryPromise({
        try: () =>
          db
            .insert(categoriesTable)
            .values({ name, slug })
            .returning({ id: categoriesTable.id }),
        catch: (e) =>
          new PipelineError({
            message: `Failed to insert category ${slug}`,
            cause: e,
          }),
      }),
    )

    return R.ok(inserted.id)
  })
}

interface ThumbnailInfo {
  url: string
  assetId: string | null
}

function storeArticle(
  summary: SummarizedArticle,
  citations: ExtractedCitation[],
  thumbnail?: ThumbnailInfo,
): Promise<Result<void, PipelineError>> {
  return R.gen(async function* () {
    const [article] = yield* R.await(
      R.tryPromise({
        try: () =>
          db
            .insert(articlesTable)
            .values({
              slug: summary.slug,
              title: summary.title,
              summary: summary.summary,
              content: summary.content,
              status: "published",
              sourceCount: citations.length,
              readingTimeMinutes: summary.readingTimeMinutes,
              publishedAt: new Date(),
              thumbnailUrl: thumbnail?.url ?? null,
              thumbnailAssetId: thumbnail?.assetId ?? null,
            })
            .returning({ id: articlesTable.id }),
        catch: (e) =>
          new PipelineError({
            message: `Failed to insert article "${summary.title}"`,
            cause: e,
          }),
      }),
    )

    if (summary.sections.length > 0) {
      yield* R.await(
        R.tryPromise({
          try: () =>
            db.insert(articleSectionsTable).values(
              summary.sections.map((section, i) => ({
                articleId: article.id,
                heading: section.heading,
                body: section.body,
                sortOrder: i,
              })),
            ),
          catch: (e) =>
            new PipelineError({
              message: `Failed to insert sections for "${summary.title}"`,
              cause: e,
            }),
        }),
      )
    }

    if (citations.length > 0) {
      yield* R.await(
        R.tryPromise({
          try: () =>
            db.insert(citationsTable).values(
              citations.map((citation, i) => ({
                articleId: article.id,
                url: citation.url,
                title: citation.title,
                domain: citation.domain,
                description: citation.description,
                sortOrder: i,
              })),
            ),
          catch: (e) =>
            new PipelineError({
              message: `Failed to insert citations for "${summary.title}"`,
              cause: e,
            }),
        }),
      )
    }

    for (const categorySlug of summary.categories) {
      const categoryResult = await ensureCategory(categorySlug)
      if (categoryResult.isErr()) {
        logger.warn(
          `Failed to ensure category "${categorySlug}": ${categoryResult.error.message}`,
        )
        continue
      }
      await R.tryPromise({
        try: () =>
          db
            .insert(articleCategoriesTable)
            .values({
              articleId: article.id,
              categoryId: categoryResult.value,
            })
            .onConflictDoNothing(),
        catch: (e) =>
          new PipelineError({
            message: `Failed to link category "${categorySlug}"`,
            cause: e,
          }),
      })
    }

    return R.ok(undefined)
  })
}

export function runPipeline(): Promise<Result<PipelineResult, PipelineError>> {
  return R.gen(async function* () {
    const result: PipelineResult = {
      feedsProcessed: 0,
      clustersFound: 0,
      articlesCreated: 0,
      errors: [],
    }

    logger.info("Pipeline: Starting feed ingestion...")
    const ingestionResult = await ingestAllFeeds()
    if (R.isError(ingestionResult)) {
      return R.err(
        new PipelineError({
          message: "Feed ingestion failed",
          cause: ingestionResult.error,
        }),
      )
    }
    result.feedsProcessed = ingestionResult.value.length

    logger.info("Pipeline: Fetching pending feed items...")
    const pendingItems = yield* R.await(
      R.tryPromise({
        try: () =>
          db.query.feedItemsTable.findMany({
            where: eq(feedItemsTable.status, "pending"),
          }),
        catch: (e) =>
          new PipelineError({
            message: "Failed to fetch pending feed items",
            cause: e,
          }),
      }),
    )

    if (pendingItems.length === 0) {
      logger.info("Pipeline: No pending items to process")
      return R.ok(result)
    }

    logger.info("Pipeline: Scraping articles for context...")
    const thumbnailsByLink = new Map<string, ThumbnailInfo>()
    for (const item of pendingItems) {
      if (!item.link) continue
      const scraped = await scrapeArticle(item.link)
      if (R.isOk(scraped)) {
        if (scraped.value.thumbnailUrl) {
          thumbnailsByLink.set(item.link, {
            url: scraped.value.thumbnailUrl,
            assetId: scraped.value.thumbnailAssetId,
          })
        }
        await R.tryPromise({
          try: () =>
            db
              .update(feedItemsTable)
              .set({ status: "processing" })
              .where(eq(feedItemsTable.id, item.id)),
          catch: (e) =>
            new PipelineError({
              message: `Failed to update item ${item.id} status`,
              cause: e,
            }),
        })
      }
    }

    logger.info("Pipeline: Clustering topics...")
    const clusters = clusterByTopic(pendingItems)
    result.clustersFound = clusters.length

    logger.info(`Pipeline: Processing ${clusters.length} clusters...`)

    for (const cluster of clusters) {
      const model = await getModelForCluster(cluster.topic)
      const summaryResult = await summarizeCluster(cluster, model)
      if (R.isError(summaryResult)) {
        result.errors.push(
          `Summary failed for "${cluster.topic}": ${summaryResult.error.message}`,
        )
        continue
      }

      const citationResult = extractCitationsFromCluster(cluster.items)
      const citations = R.isOk(citationResult) ? citationResult.value : []

      const thumbnail = cluster.items
        .filter(
          (item): item is typeof item & { link: string } => item.link !== null,
        )
        .map((item) => thumbnailsByLink.get(item.link))
        .find((t): t is ThumbnailInfo => t !== undefined)

      const storeResult = await storeArticle(
        summaryResult.value,
        citations,
        thumbnail,
      )

      if (storeResult.isErr()) {
        result.errors.push(
          `Store failed for "${cluster.topic}": ${storeResult.error.message}`,
        )
        for (const item of cluster.items) {
          await R.tryPromise({
            try: () =>
              db
                .update(feedItemsTable)
                .set({
                  status: "failed",
                  errorMessage: storeResult.error.message,
                })
                .where(eq(feedItemsTable.id, item.id)),
            catch: (e) =>
              new PipelineError({
                message: `Failed to mark item ${item.id} as failed`,
                cause: e,
              }),
          })
        }
        continue
      }

      result.articlesCreated++

      for (const item of cluster.items) {
        await R.tryPromise({
          try: () =>
            db
              .update(feedItemsTable)
              .set({ status: "processed", processedAt: new Date() })
              .where(eq(feedItemsTable.id, item.id)),
          catch: (e) =>
            new PipelineError({
              message: `Failed to mark item ${item.id} as processed`,
              cause: e,
            }),
        })
      }
    }

    logger.info(
      `Pipeline complete: ${result.articlesCreated} articles created from ${result.clustersFound} clusters`,
    )
    return R.ok(result)
  })
}
