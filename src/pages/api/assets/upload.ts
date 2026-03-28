import type { APIRoute } from "astro"
import { Result } from "better-result"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { type AssetType, assetsTable } from "@/lib/db/schemas"
import { getR2Storage } from "@/lib/storage"

const forbidden = () => Response.json({ error: "Forbidden" }, { status: 403 })

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals.user)) return forbidden()

  const formDataResult = await Result.tryPromise({
    try: () => request.formData(),
    catch: () => new Error("Failed to parse form data"),
  })

  if (Result.isError(formDataResult)) {
    return Response.json(
      { error: "Failed to parse form data" },
      { status: 400 },
    )
  }

  const formData = formDataResult.value
  const file = formData.get("file") as File | null

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  // Get asset settings
  const settings = await db.query.assetSettingsTable.findFirst()
  const maxSizeMB = settings?.maxUploadSizeMB ?? 50
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (file.size > maxSizeBytes) {
    return Response.json(
      { error: `File size exceeds ${maxSizeMB}MB limit` },
      { status: 413 },
    )
  }

  const r2 = getR2Storage()

  const bufferResult = await Result.tryPromise({
    try: async () => Buffer.from(await file.arrayBuffer()),
    catch: () => new Error("Failed to read file buffer"),
  })

  if (Result.isError(bufferResult)) {
    return Response.json({ error: "Failed to read file" }, { status: 400 })
  }

  const uploadResult = await r2.uploadAsset(
    bufferResult.value,
    file.name,
    file.type || "application/octet-stream",
  )

  if (uploadResult.isErr()) {
    return Response.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const { url, type, size, key } = uploadResult.value

  // Save to database
  const assetResult = await Result.tryPromise({
    try: async () => {
      const [asset] = await db
        .insert(assetsTable)
        .values({
          filename: key,
          originalName: file.name,
          type: type as AssetType,
          size,
          url,
        })
        .returning()
      return asset
    },
    catch: (e) =>
      new Error(
        `Failed to save asset: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(assetResult)) {
    return Response.json({ error: assetResult.error.message }, { status: 500 })
  }

  return Response.json(assetResult.value, { status: 201 })
}
