import { Result as R } from "better-result"

import { db } from "@/lib/db/client"
import { assetsTable } from "@/lib/db/schemas"
import { logger } from "@/lib/logger"
import { getR2Storage } from "@/lib/storage"
import { ImageUploadError } from "./errors"

export interface UploadedImage {
  url: string
  assetId: string | null
}

/**
 * Upload an image to R2 storage and create an asset record.
 * Returns the R2 URL and asset ID.
 */
export async function uploadImageToR2(
  imageUrl: string,
  options?: {
    context?: string
    onError?: (error: Error) => void
  },
): Promise<UploadedImage> {
  const context = options?.context ?? "image"
  logger.info({ imageUrl, context }, `${context} upload: fetching image`)

  const fetchResult = await R.tryPromise({
    try: () => fetch(imageUrl),
    catch: (e) =>
      new ImageUploadError({
        message: `Failed to fetch ${context} ${imageUrl}`,
        cause: e,
      }),
  })

  if (R.isError(fetchResult)) {
    logger.warn(
      { imageUrl, error: fetchResult.error.message, context },
      `${context} upload: fetch failed`,
    )
    if (options?.onError) {
      options.onError(fetchResult.error)
    }
    return { url: imageUrl, assetId: null }
  }

  if (!fetchResult.value.ok) {
    logger.warn(
      { imageUrl, status: fetchResult.value.status, context },
      `${context} upload: fetch returned non-OK status`,
    )
    return { url: imageUrl, assetId: null }
  }

  const response = fetchResult.value
  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.startsWith("image/")) {
    logger.warn(
      { imageUrl, contentType, context },
      `${context} upload: skipped — not an image content-type`,
    )
    return { url: imageUrl, assetId: null }
  }

  const bufferResult = await R.tryPromise({
    try: async () => Buffer.from(await response.arrayBuffer()),
    catch: (e) =>
      new ImageUploadError({
        message: `Failed to read ${context} buffer`,
        cause: e,
      }),
  })

  if (R.isError(bufferResult)) {
    logger.warn(
      { imageUrl, error: bufferResult.error.message, context },
      `${context} upload: buffer read failed`,
    )
    if (options?.onError) {
      options.onError(bufferResult.error)
    }
    return { url: imageUrl, assetId: null }
  }

  const buffer = bufferResult.value
  logger.info(
    { imageUrl, size: buffer.byteLength, contentType, context },
    `${context} upload: fetched image, uploading to R2`,
  )

  const r2 = getR2Storage()
  const uploadResult = await r2.uploadImage(buffer, contentType)

  if (R.isError(uploadResult)) {
    logger.error(
      { imageUrl, error: uploadResult.error.message, context },
      `${context} upload: R2 upload failed`,
    )
    if (options?.onError) {
      options.onError(uploadResult.error)
    }
    return { url: imageUrl, assetId: null }
  }

  const r2Url = uploadResult.value
  const filename = r2Url.split("/").pop() ?? "image.webp"

  const assetResult = await R.tryPromise({
    try: () =>
      db
        .insert(assetsTable)
        .values({
          filename,
          originalName: new URL(imageUrl).pathname.split("/").pop() ?? filename,
          type: "images",
          size: buffer.byteLength,
          url: r2Url,
        })
        .returning({ id: assetsTable.id }),
    catch: (e) =>
      new ImageUploadError({
        message: `Failed to insert asset row for ${context}`,
        cause: e,
      }),
  })

  if (R.isError(assetResult)) {
    logger.warn(
      { imageUrl, error: assetResult.error.message, context },
      `Asset row insert failed for ${context}, returning URL without assetId`,
    )
    if (options?.onError) {
      options.onError(assetResult.error)
    }
    return { url: r2Url, assetId: null }
  }

  logger.info(
    { imageUrl, r2Url, assetId: assetResult.value[0].id, context },
    `${context} upload: success`,
  )

  return { url: r2Url, assetId: assetResult.value[0].id }
}

/**
 * Extract image URLs from markdown content using regex.
 * Matches ![alt](url) pattern.
 */
export function extractMarkdownImageUrls(content: string): string[] {
  const urls: string[] = []
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g
  const matches = content.matchAll(regex)

  for (const match of matches) {
    const url = match[2]
    if (url && !urls.includes(url)) {
      urls.push(url)
    }
  }

  return urls
}

/**
 * Extract image URLs from HTML img tags.
 * Matches <img src="url"> pattern.
 */
export function extractHtmlImageUrls(content: string): string[] {
  const urls: string[] = []
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const matches = content.matchAll(regex)

  for (const match of matches) {
    const url = match[1]
    if (url && !urls.includes(url)) {
      urls.push(url)
    }
  }

  return urls
}

/**
 * Extract all unique image URLs from content (markdown + HTML).
 */
export function extractImageUrls(content: string): string[] {
  const markdownUrls = extractMarkdownImageUrls(content)
  const htmlUrls = extractHtmlImageUrls(content)
  const allUrls = [...markdownUrls, ...htmlUrls]

  // Remove duplicates while preserving order
  return allUrls.filter((url, index) => allUrls.indexOf(url) === index)
}

/**
 * Replace image URLs in content with their R2 counterparts.
 */
export function replaceImageUrls(
  content: string,
  urlMap: Map<string, string>,
): string {
  let result = content

  // Replace markdown images
  for (const [originalUrl, r2Url] of urlMap) {
    const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const markdownRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedUrl}\\)`, "g")
    result = result.replace(markdownRegex, `![$1](${r2Url})`)

    // Replace HTML img tags
    const htmlRegex = new RegExp(`src=["']${escapedUrl}["']`, "gi")
    result = result.replace(htmlRegex, `src="${r2Url}"`)
  }

  return result
}

/**
 * Process inline images in a section body.
 * Extracts URLs, uploads to R2, and replaces with R2 URLs.
 */
export async function processSectionImages(body: string): Promise<{
  processedBody: string
  uploadedCount: number
  failedCount: number
}> {
  const imageUrls = extractImageUrls(body)

  if (imageUrls.length === 0) {
    return { processedBody: body, uploadedCount: 0, failedCount: 0 }
  }

  logger.info(
    { imageCount: imageUrls.length },
    "Processing inline images in section",
  )

  const urlMap = new Map<string, string>()
  let uploadedCount = 0
  let failedCount = 0

  // Process images in parallel with concurrency limit
  const concurrencyLimit = 3
  const batches: string[][] = []

  for (let i = 0; i < imageUrls.length; i += concurrencyLimit) {
    batches.push(imageUrls.slice(i, i + concurrencyLimit))
  }

  for (const batch of batches) {
    const uploadPromises = batch.map(async (url) => {
      try {
        const result = await uploadImageToR2(url, { context: "inline-image" })

        if (result.url !== url) {
          urlMap.set(url, result.url)
          uploadedCount++
          logger.info(
            { originalUrl: url, r2Url: result.url },
            "Inline image uploaded to R2",
          )
        } else {
          // URL unchanged means upload failed, original preserved
          failedCount++
          logger.warn(
            { url },
            "Failed to upload inline image, preserving original URL",
          )
        }
      } catch (error) {
        failedCount++
        logger.warn(
          {
            url,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Error uploading inline image",
        )
      }
    })

    await Promise.all(uploadPromises)
  }

  const processedBody = replaceImageUrls(body, urlMap)

  logger.info(
    { uploadedCount, failedCount, total: imageUrls.length },
    "Section image processing complete",
  )

  return { processedBody, uploadedCount, failedCount }
}
