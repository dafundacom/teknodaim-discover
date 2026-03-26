import { Readability } from "@mozilla/readability"
import type { Result } from "better-result"
import { Result as R } from "better-result"
import { JSDOM } from "jsdom"
import { cleanArticleContent } from "./dedup/service"
import { ArticleScrapeError } from "./errors"
import { uploadImageToR2 } from "./image-upload"
import { stealthFetch } from "./scraper/stealth-fetch"

export interface ScrapedArticle {
  title: string
  content: string
  textContent: string
  excerpt: string
  thumbnailUrl: string | null
  thumbnailAssetId: string | null
  siteName: string | null
}

function extractThumbnail(doc: Document, url: string): string | null {
  const ogImage = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content")
  if (ogImage) return ogImage

  const twitterImage = doc
    .querySelector('meta[name="twitter:image"]')
    ?.getAttribute("content")
  if (twitterImage) return twitterImage

  const firstImg = doc.querySelector("article img")?.getAttribute("src")
  if (firstImg) {
    const parsed = R.try(() => new URL(firstImg, url).href)
    return R.isOk(parsed) ? parsed.value : firstImg
  }

  return null
}

export function scrapeArticle(
  url: string,
): Promise<Result<ScrapedArticle, ArticleScrapeError>> {
  return R.gen(async function* () {
    const response = yield* R.await(
      R.tryPromise({
        try: () => stealthFetch(url),
        catch: (e) =>
          new ArticleScrapeError({
            message: `Failed to fetch ${url}`,
            cause: e,
          }),
      }),
    )

    if (!response.ok) {
      return R.err(
        new ArticleScrapeError({
          message: `HTTP ${response.status} fetching ${url}`,
        }),
      )
    }

    const html = yield* R.await(
      R.tryPromise({
        try: () => response.text(),
        catch: (e) =>
          new ArticleScrapeError({
            message: `Failed to read response body for ${url}`,
            cause: e,
          }),
      }),
    )

    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      return R.err(
        new ArticleScrapeError({
          message: `Readability failed to parse ${url}`,
        }),
      )
    }

    let thumbnailUrl = extractThumbnail(
      new JSDOM(html, { url }).window.document,
      url,
    )
    let thumbnailAssetId: string | null = null

    if (thumbnailUrl) {
      const uploaded = await uploadImageToR2(thumbnailUrl, {
        context: "thumbnail",
      })
      thumbnailUrl = uploaded.url
      thumbnailAssetId = uploaded.assetId
    }

    const textContent = cleanArticleContent(article.textContent ?? "")
    const excerpt = cleanArticleContent(article.excerpt ?? "")

    return R.ok({
      title: article.title ?? "Untitled",
      content: article.content ?? "",
      textContent,
      excerpt,
      thumbnailUrl,
      thumbnailAssetId,
      siteName: article.siteName ?? null,
    })
  })
}
