import { Result as R } from "better-result"
import { eq } from "drizzle-orm"
import type { ArticleWithTranslations } from "@/lib/translation/service"
import { getArticleInLanguage } from "@/lib/translation/service"
import { db } from "./client"
import { articlesTable, savedArticlesTable } from "./schemas"

export async function getSavedSlugsForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: articlesTable.slug })
    .from(savedArticlesTable)
    .innerJoin(
      articlesTable,
      eq(savedArticlesTable.articleId, articlesTable.id),
    )
    .where(eq(savedArticlesTable.userId, userId))

  return rows.map((r) => r.slug)
}

export async function getArticleBySlugWithLanguage(
  slug: string,
  language: string,
): Promise<ArticleWithTranslations | null> {
  const article = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.slug, slug))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!article) {
    return null
  }

  const result = await getArticleInLanguage(article.id, language)

  if (R.isError(result)) {
    throw result.error
  }

  return result.value
}
