import type { Result } from "better-result"
import { Result as R } from "better-result"
import { eq, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  articleSectionsTable,
  articlesTable,
  citationsTable,
  feedItemsTable,
} from "@/lib/db/schemas"
import { logger } from "@/lib/logger"
import { summarizeCluster } from "@/lib/pipeline/ai-summarizer"
import { scrapeArticle } from "@/lib/pipeline/article-scraper"
import { extractCitationsFromCluster } from "@/lib/pipeline/citation-extractor"
import { PipelineError } from "@/lib/pipeline/errors"
import { processSectionImages } from "@/lib/pipeline/image-upload"

interface SingleItemResult {
  articleId?: string
  status: "processed" | "failed" | "skipped"
}

export async function runPipelineForItems(
  feedItemIds: string[],
): Promise<Result<SingleItemResult, PipelineError>> {
  const items = await db.query.feedItemsTable.findMany({
    where: eq(feedItemsTable.id, feedItemIds[0]),
    with: {
      feedSource: true,
    },
  })

  if (items.length === 0) {
    return R.err(
      new PipelineError({
        message: "No items found to process",
      }),
    )
  }

  const item = items[0]

  await db
    .update(feedItemsTable)
    .set({ status: "processing" })
    .where(eq(feedItemsTable.id, item.id))

  if (!item.link) {
    await db
      .update(feedItemsTable)
      .set({ status: "skipped" })
      .where(eq(feedItemsTable.id, item.id))
    return R.ok({ status: "skipped" })
  }

  const scraped = await scrapeArticle(item.link)
  if (R.isError(scraped)) {
    await db
      .update(feedItemsTable)
      .set({
        status: "failed",
        errorMessage: `Scrape failed: ${scraped.error.message}`,
      })
      .where(eq(feedItemsTable.id, item.id))
    return R.ok({ status: "failed" })
  }

  const cluster = {
    topic: item.title ?? "Untitled",
    keywords: [],
    items: [item],
  }

  const summaryResult = await summarizeCluster(cluster, "gpt-4o-mini")
  if (R.isError(summaryResult)) {
    await db
      .update(feedItemsTable)
      .set({
        status: "failed",
        errorMessage: `Summary failed: ${summaryResult.error.message}`,
      })
      .where(eq(feedItemsTable.id, item.id))
    return R.ok({ status: "failed" })
  }

  const { checkContentDuplicate } = await import("./dedup/service")
  const dedupCheck = await checkContentDuplicate(summaryResult.value.content)

  if (dedupCheck.isDuplicate) {
    await db
      .update(feedItemsTable)
      .set({
        status: "skipped",
        errorMessage: `Duplicate content (match: ${dedupCheck.matchScore?.toFixed(2)})`,
      })
      .where(eq(feedItemsTable.id, item.id))
    return R.ok({ status: "skipped" })
  }

  try {
    const [article] = await db
      .insert(articlesTable)
      .values({
        slug: summaryResult.value.slug,
        title: summaryResult.value.title,
        summary: summaryResult.value.summary,
        content: summaryResult.value.content,
        status: "published",
        sourceCount: 1,
        readingTimeMinutes: summaryResult.value.readingTimeMinutes,
        publishedAt: sql`NOW()`,
      })
      .returning({ id: articlesTable.id })

    if (summaryResult.value.sections.length > 0) {
      const processedSections = await Promise.all(
        summaryResult.value.sections.map(async (section, i) => {
          const { processedBody } = await processSectionImages(
            section.body,
            item.link,
          )
          return {
            articleId: article.id,
            heading: section.heading,
            body: processedBody,
            sortOrder: i,
          }
        }),
      )

      await db.insert(articleSectionsTable).values(processedSections)
    }

    const citationResult = extractCitationsFromCluster([item])
    if (R.isOk(citationResult) && citationResult.value.length > 0) {
      await db.insert(citationsTable).values(
        citationResult.value.map((citation, i) => ({
          articleId: article.id,
          url: citation.url,
          title: citation.title,
          domain: citation.domain,
          description: citation.description,
          sortOrder: i,
        })),
      )
    }

    await db
      .update(feedItemsTable)
      .set({ status: "processed" })
      .where(eq(feedItemsTable.id, item.id))

    logger.info(
      `Successfully created article ${article.id} from item ${item.id}`,
    )

    return R.ok({ articleId: article.id, status: "processed" })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Single item processor error: ${message}`)

    for (const itemId of feedItemIds) {
      await db
        .update(feedItemsTable)
        .set({
          status: "failed",
          errorMessage: message,
        })
        .where(eq(feedItemsTable.id, itemId))
    }

    return R.err(
      new PipelineError({
        message: `Processing failed: ${message}`,
        cause: error,
      }),
    )
  }
}
