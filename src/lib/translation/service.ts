import { openai } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import type { Result } from "better-result"
import { Result as R, TaggedError } from "better-result"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/client"
import {
  articleSectionsTable,
  articleSectionTranslationsTable,
  articlesTable,
  articleTranslationsTable,
  type SelectArticle,
  type SelectArticleSection,
  type SelectArticleSectionTranslation,
  type SelectArticleTranslation,
} from "@/lib/db/schemas"
import { logger } from "@/lib/logger"
import { articleTranslationPrompt, sectionTranslationPrompt } from "./prompts"

export class TranslationError extends TaggedError("TranslationError")<{
  message: string
  cause?: unknown
}>() {}

export interface ArticleWithTranslations {
  article: SelectArticle
  translation: SelectArticleTranslation | null
  sections: Array<{
    section: SelectArticleSection
    translation: SelectArticleSectionTranslation | null
  }>
}

const translatedArticleSchema = z.object({
  title: z.string().describe("Translated article title"),
  summary: z.string().describe("Translated article summary"),
  content: z
    .string()
    .describe("Translated article content with preserved HTML"),
})

const translatedSectionSchema = z.object({
  heading: z.string().describe("Translated section heading"),
  body: z.string().describe("Translated section body with preserved HTML"),
})

// biome-ignore lint/suspicious/useAwait: R.gen uses async generators
export async function translateArticle(
  articleId: string,
  targetLanguage: string,
): Promise<Result<void, TranslationError>> {
  return R.gen(async function* () {
    const existingTranslation = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(articleTranslationsTable)
            .where(
              and(
                eq(articleTranslationsTable.articleId, articleId),
                eq(articleTranslationsTable.language, targetLanguage),
              ),
            )
            .limit(1)
          return result[0] ?? null
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to check existing translation for article ${articleId}`,
            cause: e,
          }),
      }),
    )

    if (existingTranslation) {
      logger.info(
        { articleId, language: targetLanguage },
        "Translation already exists, skipping",
      )
      return R.ok(undefined)
    }

    const article = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(articlesTable)
            .where(eq(articlesTable.id, articleId))
            .limit(1)
          return result[0] ?? null
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to fetch article ${articleId}`,
            cause: e,
          }),
      }),
    )

    if (!article) {
      return R.err(
        new TranslationError({
          message: `Article not found: ${articleId}`,
        }),
      )
    }

    const prompt = articleTranslationPrompt({
      title: article.title,
      summary: article.summary,
      content: article.content,
    })

    const translated = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await generateText({
            model: openai("gpt-4o-mini"),
            output: Output.object({ schema: translatedArticleSchema }),
            prompt,
          })
          if (!result.output) {
            throw new Error("AI returned no structured output")
          }
          return result.output
        },
        catch: (e) =>
          new TranslationError({
            message: `AI translation failed for article ${articleId}`,
            cause: e,
          }),
      }),
    )

    yield* R.await(
      R.tryPromise({
        try: async () => {
          await db.insert(articleTranslationsTable).values({
            articleId,
            language: targetLanguage,
            title: translated.title,
            summary: translated.summary,
            content: translated.content,
            isAutoTranslated: true,
          })
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to save translation for article ${articleId}`,
            cause: e,
          }),
      }),
    )

    logger.info(
      { articleId, language: targetLanguage },
      "Article translated successfully",
    )

    return R.ok(undefined)
  })
}

// biome-ignore lint/suspicious/useAwait: R.gen uses async generators
export async function translateSection(
  sectionId: string,
  targetLanguage: string,
): Promise<Result<void, TranslationError>> {
  return R.gen(async function* () {
    const existingTranslation = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(articleSectionTranslationsTable)
            .where(
              and(
                eq(articleSectionTranslationsTable.sectionId, sectionId),
                eq(articleSectionTranslationsTable.language, targetLanguage),
              ),
            )
            .limit(1)
          return result[0] ?? null
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to check existing translation for section ${sectionId}`,
            cause: e,
          }),
      }),
    )

    if (existingTranslation) {
      logger.info(
        { sectionId, language: targetLanguage },
        "Section translation already exists, skipping",
      )
      return R.ok(undefined)
    }

    const section = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(articleSectionsTable)
            .where(eq(articleSectionsTable.id, sectionId))
            .limit(1)
          return result[0] ?? null
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to fetch section ${sectionId}`,
            cause: e,
          }),
      }),
    )

    if (!section) {
      return R.err(
        new TranslationError({
          message: `Section not found: ${sectionId}`,
        }),
      )
    }

    const prompt = sectionTranslationPrompt({
      heading: section.heading,
      body: section.body,
    })

    const translated = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await generateText({
            model: openai("gpt-4o-mini"),
            output: Output.object({ schema: translatedSectionSchema }),
            prompt,
          })
          if (!result.output) {
            throw new Error("AI returned no structured output")
          }
          return result.output
        },
        catch: (e) =>
          new TranslationError({
            message: `AI translation failed for section ${sectionId}`,
            cause: e,
          }),
      }),
    )

    yield* R.await(
      R.tryPromise({
        try: async () => {
          await db.insert(articleSectionTranslationsTable).values({
            sectionId,
            language: targetLanguage,
            heading: translated.heading,
            body: translated.body,
          })
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to save translation for section ${sectionId}`,
            cause: e,
          }),
      }),
    )

    logger.info(
      { sectionId, language: targetLanguage },
      "Section translated successfully",
    )

    return R.ok(undefined)
  })
}

// biome-ignore lint/suspicious/useAwait: R.gen uses async generators
export async function getArticleInLanguage(
  articleId: string,
  language: string,
): Promise<Result<ArticleWithTranslations | null, TranslationError>> {
  return R.gen(async function* () {
    const article = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(articlesTable)
            .where(eq(articlesTable.id, articleId))
            .limit(1)
          return result[0] ?? null
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to fetch article ${articleId}`,
            cause: e,
          }),
      }),
    )

    if (!article) {
      return R.ok(null)
    }

    const translation = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(articleTranslationsTable)
            .where(
              and(
                eq(articleTranslationsTable.articleId, articleId),
                eq(articleTranslationsTable.language, language),
              ),
            )
            .limit(1)
          return result[0] ?? null
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to fetch translation for article ${articleId}`,
            cause: e,
          }),
      }),
    )

    const sections = yield* R.await(
      R.tryPromise({
        try: async () => {
          return await db
            .select()
            .from(articleSectionsTable)
            .where(eq(articleSectionsTable.articleId, articleId))
            .orderBy(articleSectionsTable.sortOrder)
        },
        catch: (e) =>
          new TranslationError({
            message: `Failed to fetch sections for article ${articleId}`,
            cause: e,
          }),
      }),
    )

    const sectionsWithTranslations: Array<{
      section: SelectArticleSection
      translation: SelectArticleSectionTranslation | null
    }> = []

    for (const section of sections) {
      const sectionTranslation = yield* R.await(
        R.tryPromise({
          try: async () => {
            const result = await db
              .select()
              .from(articleSectionTranslationsTable)
              .where(
                and(
                  eq(articleSectionTranslationsTable.sectionId, section.id),
                  eq(articleSectionTranslationsTable.language, language),
                ),
              )
              .limit(1)
            return result[0] ?? null
          },
          catch: (e) =>
            new TranslationError({
              message: `Failed to fetch translation for section ${section.id}`,
              cause: e,
            }),
        }),
      )

      sectionsWithTranslations.push({
        section,
        translation: sectionTranslation,
      })
    }

    return R.ok({
      article,
      translation,
      sections: sectionsWithTranslations,
    })
  })
}
