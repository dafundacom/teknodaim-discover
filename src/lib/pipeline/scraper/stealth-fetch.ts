import { logger } from "@/lib/logger"
import { CookieJar } from "./cookie-jar"
import { getRandomUserAgent } from "./user-agents"

interface StealthConfig {
  minDelayMs: number
  maxDelayMs: number
  maxRetries: number
  baseTimeoutMs: number
}

const DEFAULT_CONFIG: StealthConfig = {
  minDelayMs: 1000,
  maxDelayMs: 5000,
  maxRetries: 3,
  baseTimeoutMs: 30000,
}

const cookieJars = new Map<string, CookieJar>()

function getCookieJar(domain: string): CookieJar {
  if (!cookieJars.has(domain)) {
    cookieJars.set(domain, new CookieJar())
  }
  return cookieJars.get(domain)!
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRandomDelay(config: StealthConfig): number {
  const range = config.maxDelayMs - config.minDelayMs
  const jitter = Math.random() * range
  return config.minDelayMs + jitter
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

interface StealthFetchOptions {
  headers?: Record<string, string>
  referrer?: string
  config?: Partial<StealthConfig>
}

export async function stealthFetch(
  url: string,
  options: StealthFetchOptions = {},
): Promise<Response> {
  const config = { ...DEFAULT_CONFIG, ...options.config }
  const domain = getDomainFromUrl(url)
  const cookieJar = getCookieJar(domain)

  const delay = getRandomDelay(config)
  await sleep(delay)

  const userAgent = getRandomUserAgent()
  const cookies = cookieJar.getCookies(domain)

  const defaultHeaders: Record<string, string> = {
    "User-Agent": userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": options.referrer ? "same-origin" : "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    ...(cookies ? { Cookie: cookies } : {}),
  }

  if (options.referrer) {
    defaultHeaders.Referer = options.referrer
  }

  const fetchOptions: RequestInit = {
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      logger.debug({ url, attempt: attempt + 1 }, "Stealth fetch attempt")

      const response = await fetch(url, fetchOptions)

      cookieJar.setCookiesFromHeaders(domain, response.headers)

      if (response.status === 429 || response.status === 503) {
        const retryAfter = response.headers.get("Retry-After")
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : 2 ** attempt * 1000

        logger.warn(
          { url, status: response.status, waitMs },
          "Rate limited, backing off",
        )
        await sleep(waitMs)
        continue
      }

      if (response.headers.get("cf-mitigated") === "challenge") {
        logger.warn({ url }, "Cloudflare challenge detected")
        throw new Error(
          "Cloudflare challenge detected - manual intervention needed",
        )
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn(
        { url, attempt: attempt + 1, error: lastError.message },
        "Fetch failed",
      )

      if (attempt < config.maxRetries - 1) {
        const backoffMs = 2 ** attempt * 1000
        await sleep(backoffMs)
      }
    }
  }

  throw (
    lastError ??
    new Error(`Failed to fetch ${url} after ${config.maxRetries} attempts`)
  )
}
