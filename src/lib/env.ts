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

export const cfAccountId =
  process.env.CF_ACCOUNT_ID ?? import.meta.env.CF_ACCOUNT_ID
export const r2AccessKey =
  process.env.R2_ACCESS_KEY ?? import.meta.env.R2_ACCESS_KEY
export const r2Bucket = process.env.R2_BUCKET ?? import.meta.env.R2_BUCKET
const rawR2Domain = process.env.R2_DOMAIN ?? import.meta.env.R2_DOMAIN
export const r2Domain =
  rawR2Domain && !rawR2Domain.startsWith("http")
    ? `https://${rawR2Domain}`
    : rawR2Domain
export const r2SecretKey =
  process.env.R2_SECRET_KEY ?? import.meta.env.R2_SECRET_KEY
