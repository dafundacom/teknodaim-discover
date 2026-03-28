import type { APIRoute } from "astro"
import { Result } from "better-result"
import { eq } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { createRedisCache } from "@/lib/cache"
import { db } from "@/lib/db/client"
import { categoriesTable } from "@/lib/db/schemas"

export const GET: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals.user)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = params
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 })
  }

  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1)

  if (!category) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(category)
}

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  if (!isAdmin(locals.user)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = params
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 })
  }

  const cache = createRedisCache()

  const bodyResult = await Result.tryPromise({
    try: () => request.json(),
    catch: () => new Error("Failed to parse request body"),
  })

  if (Result.isError(bodyResult)) {
    await cache.close()
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const body = bodyResult.value
  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (body.name !== undefined) updates.name = body.name
  if (body.slug !== undefined) updates.slug = body.slug
  if (body.description !== undefined) updates.description = body.description
  if (body.color !== undefined) updates.color = body.color
  if (body.iconUrl !== undefined) updates.iconUrl = body.iconUrl

  const updateResult = await Result.tryPromise({
    try: async () => {
      const [updated] = await db
        .update(categoriesTable)
        .set(updates)
        .where(eq(categoriesTable.id, id))
        .returning()
      return updated
    },
    catch: (e) =>
      new Error(
        `Failed to update category: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  await cache.close()

  if (Result.isError(updateResult)) {
    console.error("Category update error:", updateResult.error)
    return Response.json(
      { error: "Failed to update category" },
      { status: 500 },
    )
  }

  if (!updateResult.value) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await cache.deleteCache("categories:all")

  return Response.json(updateResult.value)
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals.user)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = params
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 })
  }

  const cache = createRedisCache()

  const deleteResult = await Result.tryPromise({
    try: async () => {
      const [deleted] = await db
        .delete(categoriesTable)
        .where(eq(categoriesTable.id, id))
        .returning({ id: categoriesTable.id })
      return deleted
    },
    catch: (e) =>
      new Error(
        `Failed to delete category: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  await cache.close()

  if (Result.isError(deleteResult)) {
    console.error("Category delete error:", deleteResult.error)
    return Response.json(
      { error: "Failed to delete category" },
      { status: 500 },
    )
  }

  if (!deleteResult.value) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await cache.deleteCache("categories:all")

  return Response.json({ success: true })
}
