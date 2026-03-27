import type { Result } from "better-result"
import { Result as R } from "better-result"
import { eq, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { articlesTable, feedItemsTable } from "@/lib/db/schemas"
import { logger } from "@/lib/logger"
import { cleanExtractedText, deduplicateContent } from "./content-cleaner"
import { compareFingerprints, generateFingerprint } from "./fingerprinter"
import { extractCanonicalUrl, normalizeUrl } from "./url-normalizer"

const DUPLICATE_THRESHOLD = 0.85

export function normalizeAndCheckUrl(
  url: string,
  html?: string,
): Result<string, Error> {
  return R.try({
    try: () => {
      const canonical = html ? extractCanonicalUrl(html, url) : null
      return canonical ?? normalizeUrl(url)
    },
    catch: (e: unknown) =>
      e instanceof Error ? e : new Error("URL normalization failed"),
  })
}

export async function checkUrlDuplicate(
  normalizedUrl: string,
): Promise<boolean> {
  const existing = await db.query.feedItemsTable.findFirst({
    where: eq(feedItemsTable.normalizedUrl, normalizedUrl),
    columns: { id: true },
  })

  return existing !== null
}

export function cleanArticleContent(content: string): string {
  const cleaned = cleanExtractedText(content)
  return deduplicateContent(cleaned)
}

export async function checkContentDuplicate(
  content: string,
): Promise<{ isDuplicate: boolean; fingerprint: string; matchScore?: number }> {
  const fingerprint = generateFingerprint(content)

  if (!fingerprint) {
    return { isDuplicate: false, fingerprint: "" }
  }

  const recentArticles = await db.query.articlesTable.findMany({
    where: sql`${articlesTable.publishedAt} > NOW() - INTERVAL '7 days'`,
    columns: { id: true, contentFingerprint: true, title: true },
  })

  for (const article of recentArticles) {
    if (!article.contentFingerprint) continue

    const similarity = compareFingerprints(
      fingerprint,
      article.contentFingerprint,
    )

    if (similarity >= DUPLICATE_THRESHOLD) {
      logger.info(
        {
          fingerprint,
          existingId: article.id,
          existingTitle: article.title,
          similarity,
        },
        "Content duplicate detected",
      )
      return { isDuplicate: true, fingerprint, matchScore: similarity }
    }
  }

  return { isDuplicate: false, fingerprint }
}

export interface DeduplicationResult {
  isDuplicate: boolean
  reason?: "url" | "content"
  normalizedUrl?: string
  contentFingerprint?: string
  matchScore?: number
}

export async function deduplicateArticle(
  url: string,
  html: string,
  content: string,
): Promise<DeduplicationResult> {
  const normalizedResult = normalizeAndCheckUrl(url, html)

  if (R.isOk(normalizedResult)) {
    const normalizedUrl = normalizedResult.value
    const isUrlDuplicate = await checkUrlDuplicate(normalizedUrl)

    if (isUrlDuplicate) {
      return {
        isDuplicate: true,
        reason: "url",
        normalizedUrl,
      }
    }
  }

  const cleanedContent = cleanArticleContent(content)
  const contentCheck = await checkContentDuplicate(cleanedContent)

  if (contentCheck.isDuplicate) {
    return {
      isDuplicate: true,
      reason: "content",
      contentFingerprint: contentCheck.fingerprint,
      matchScore: contentCheck.matchScore,
    }
  }

  return {
    isDuplicate: false,
    normalizedUrl: R.isOk(normalizedResult)
      ? normalizedResult.value
      : normalizeUrl(url),
    contentFingerprint: contentCheck.fingerprint,
  }
}
