export const databaseUrl =
  process.env.DATABASE_URL ?? import.meta.env.DATABASE_URL
export const redisUrl = process.env.REDIS_URL ?? import.meta.env.REDIS_URL
export const redisKeyPrefix =
  process.env.REDIS_KEY_PREFIX ??
  import.meta.env.REDIS_KEY_PREFIX ??
  "app_cache:"

export const openaiApiKey =
  process.env.OPENAI_API_KEY ?? import.meta.env.OPENAI_API_KEY

export const publicSiteUrl =
  process.env.PUBLIC_SITE_URL ?? import.meta.env.PUBLIC_SITE_URL

export const authSecret =
  process.env.BETTER_AUTH_SECRET ?? import.meta.env.BETTER_AUTH_SECRET
export const authUrl =
  process.env.BETTER_AUTH_URL ?? import.meta.env.BETTER_AUTH_URL
export const publicGoogleClientId =
  process.env.PUBLIC_GOOGLE_CLIENT_ID ?? import.meta.env.PUBLIC_GOOGLE_CLIENT_ID
export const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ?? import.meta.env.GOOGLE_CLIENT_SECRET
