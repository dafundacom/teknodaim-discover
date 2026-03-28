import { defineMiddleware, sequence } from "astro:middleware"
import { Result, TaggedError } from "better-result"

import { hashApiKey } from "@/lib/api-keys"
import { auth } from "@/lib/auth"
import {
  getApiKeyByHash,
  updateApiKeyLastUsed,
} from "@/lib/db/queries/api-keys"

export class SchedulerInitError extends TaggedError("SchedulerInitError")<{
  message: string
  cause?: unknown
}>() {}

async function initSchedulerSafe(): Promise<void> {
  const result = await Result.tryPromise({
    try: async () => {
      const { initScheduler } = await import("@/lib/pipeline/scheduler")
      await initScheduler()
    },
    catch: (e) =>
      new SchedulerInitError({
        message: "Failed to initialize scheduler",
        cause: e,
      }),
  })

  if (Result.isError(result)) {
    console.error("Failed to initialize scheduler:", result.error)
  }
}

void initSchedulerSafe()

const sessionMiddleware = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  })

  context.locals.user = session?.user ?? null
  context.locals.session = session?.session ?? null

  return next()
})

const apiKeyMiddleware = defineMiddleware(async (context, next) => {
  if (context.locals.user) {
    return next()
  }

  const authHeader = context.request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return next()
  }

  const apiKey = authHeader.slice(7).trim()
  if (!apiKey) {
    return next()
  }

  const result = await Result.tryPromise({
    try: async () => {
      const keyHash = hashApiKey(apiKey)
      const apiKeyRecord = await getApiKeyByHash(keyHash)

      if (!apiKeyRecord) {
        return null
      }

      if (!apiKeyRecord.isActive) {
        return null
      }

      const user = await auth.api.getUser({
        query: { id: apiKeyRecord.userId },
      })

      if (!user) {
        return null
      }

      void updateApiKeyLastUsed(apiKeyRecord.id)

      return user
    },
    catch: (e) =>
      new Error(
        `API key auth error: ${e instanceof Error ? e.message : String(e)}`,
      ),
  })

  if (Result.isError(result)) {
    console.error("API key auth error:", result.error)
    return next()
  }

  if (result.value) {
    context.locals.user = result.value
    context.locals.apiKeyAuth = true
  }

  return next()
})

const authGuardMiddleware = defineMiddleware((context, next) => {
  const { pathname } = context.url
  const user = context.locals.user

  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/internal")

  if (isAdminRoute && user?.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    return context.redirect("/login")
  }

  if (pathname.startsWith("/library") && !user) {
    return context.redirect("/login")
  }

  return next()
})

export const onRequest = sequence(
  sessionMiddleware,
  apiKeyMiddleware,
  authGuardMiddleware,
)
