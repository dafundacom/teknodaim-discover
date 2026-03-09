import type { APIRoute } from "astro"
import { auth } from "@/lib/auth"

export const ALL: APIRoute = async (ctx) => {
  ctx.request.headers.set("x-forwarded-for", ctx.clientAddress)
  return await auth.handler(ctx.request)
}
