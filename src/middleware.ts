import { defineMiddleware, sequence } from "astro:middleware"
import { auth } from "@/lib/auth"

async function initSchedulerSafe(): Promise<void> {
  try {
    const { initScheduler } = await import("@/lib/pipeline/scheduler")
    await initScheduler()
  } catch (e) {
    console.error("Failed to initialize scheduler:", e)
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

export const onRequest = sequence(sessionMiddleware, authGuardMiddleware)
