/**
 * Normalize an image URL to ensure it has a protocol.
 * Handles both R2 URLs and external URLs.
 */
export function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null

  // Already has protocol
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  // Add https:// if missing
  return `https://${url}`
}
