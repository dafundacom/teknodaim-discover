import type { APIRoute } from "astro"
import { Result } from "better-result"
import { eq } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { assetsTable } from "@/lib/db/schemas"
import { getR2Storage } from "@/lib/storage"

const forbidden = () => Response.json({ error: "Forbidden" }, { status: 403 })

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals.user)) return forbidden()

  const { id } = params

  if (!id) {
    return Response.json({ error: "Asset ID is required" }, { status: 400 })
  }

  // Get asset to find the key
  const assetResult = await Result.tryPromise({
    try: async () => {
      const asset = await db.query.assetsTable.findFirst({
        where: eq(assetsTable.id, id),
      })
      return asset
    },
    catch: () => new Error("Database query failed"),
  })

  if (Result.isError(assetResult) || !assetResult.value) {
    return Response.json({ error: "Asset not found" }, { status: 404 })
  }

  const asset = assetResult.value

  // Delete from R2
  const r2 = getR2Storage()
  const deleteResult = await r2.deleteFile(asset.filename)

  if (deleteResult.isErr()) {
    console.error("Failed to delete from R2:", deleteResult.error)
    // Continue to delete from database even if R2 deletion fails
  }

  // Delete from database
  const dbDeleteResult = await Result.tryPromise({
    try: async () => {
      await db.delete(assetsTable).where(eq(assetsTable.id, id))
    },
    catch: (e) =>
      new Error(
        `Failed to delete asset: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(dbDeleteResult)) {
    return Response.json(
      { error: dbDeleteResult.error.message },
      { status: 500 },
    )
  }

  return Response.json({ deleted: true })
}
