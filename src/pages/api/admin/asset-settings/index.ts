import type { APIRoute } from "astro"
import { Result } from "better-result"
import { eq } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { assetSettingsTable } from "@/lib/db/schemas"

const forbidden = () => Response.json({ error: "Forbidden" }, { status: 403 })

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals.user)) return forbidden()

  const result = await Result.tryPromise({
    try: async () => {
      const settings = await db.query.assetSettingsTable.findFirst()
      return settings?.maxUploadSizeMB ?? 50
    },
    catch: (e) =>
      new Error(
        `Failed to fetch settings: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(result)) {
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  return Response.json({ maxUploadSizeMB: result.value })
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals.user)) return forbidden()

  const bodyResult = await Result.tryPromise({
    try: () => request.json(),
    catch: () => new Error("Failed to parse request body"),
  })

  if (Result.isError(bodyResult)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { maxUploadSizeMB } = bodyResult.value

  if (maxUploadSizeMB === undefined || maxUploadSizeMB === null) {
    return Response.json(
      { error: "maxUploadSizeMB is required" },
      { status: 400 },
    )
  }

  const size = Number.parseInt(String(maxUploadSizeMB), 10)

  if (Number.isNaN(size) || size <= 0 || size > 500) {
    return Response.json(
      { error: "maxUploadSizeMB must be between 1 and 500" },
      { status: 400 },
    )
  }

  const existingResult = await Result.tryPromise({
    try: () => db.query.assetSettingsTable.findFirst(),
    catch: () => new Error("Database query failed"),
  })

  if (Result.isError(existingResult)) {
    return Response.json(
      { error: "Failed to check existing settings" },
      { status: 500 },
    )
  }

  const saveResult = await Result.tryPromise({
    try: async () => {
      if (existingResult.value) {
        await db
          .update(assetSettingsTable)
          .set({ maxUploadSizeMB: size })
          .where(eq(assetSettingsTable.id, existingResult.value.id))
      } else {
        await db.insert(assetSettingsTable).values({ maxUploadSizeMB: size })
      }
    },
    catch: (e) =>
      new Error(
        `Failed to save settings: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(saveResult)) {
    return Response.json({ error: saveResult.error.message }, { status: 500 })
  }

  return Response.json({ maxUploadSizeMB: size })
}
