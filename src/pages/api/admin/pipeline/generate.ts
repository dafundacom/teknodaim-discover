import type { APIRoute } from "astro"
import { Result } from "better-result"
import { eq } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { feedItemsTable } from "@/lib/db/schemas"
import { logger } from "@/lib/logger"
import { runPipelineForItems } from "@/lib/pipeline/single-item-processor"

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const bodyResult = await Result.tryPromise({
    try: () => request.json(),
    catch: () => new Error("Failed to parse request body"),
  })

  if (Result.isError(bodyResult)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { feedItemId } = bodyResult.value

  if (!feedItemId) {
    return Response.json({ error: "feedItemId is required" }, { status: 400 })
  }

  const feedItemResult = await Result.tryPromise({
    try: async () =>
      db.query.feedItemsTable.findFirst({
        where: eq(feedItemsTable.id, feedItemId),
      }),
    catch: () => new Error("Database query failed"),
  })

  if (Result.isError(feedItemResult) || !feedItemResult.value) {
    return Response.json({ error: "Feed item not found" }, { status: 404 })
  }

  const feedItem = feedItemResult.value

  if (feedItem.status === "processed") {
    return Response.json(
      { error: "Feed item already processed" },
      { status: 400 },
    )
  }

  if (feedItem.status === "processing") {
    return Response.json(
      { error: "Feed item is already being processed" },
      { status: 400 },
    )
  }

  logger.info(`Starting single item processing for: ${feedItemId}`)

  const result = await runPipelineForItems([feedItemId])

  if (result.isErr()) {
    logger.error(`Failed to process ${feedItemId}: ${result.error.message}`)
    return Response.json(
      { error: `Failed: ${result.error.message}` },
      { status: 500 },
    )
  }

  const { articleId, status } = result.value

  if (status === "processed" && articleId) {
    return Response.json({
      success: true,
      message: "Article generated successfully!",
      articleId,
    })
  }

  if (status === "skipped") {
    return Response.json({
      success: true,
      message: "Item was skipped (duplicate content)",
    })
  }

  return Response.json(
    { error: `Processing failed with status: ${status}` },
    { status: 500 },
  )
}
