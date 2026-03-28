import type { APIRoute } from "astro"
import { Result } from "better-result"
import { eq } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { feedItemsTable } from "@/lib/db/schemas"
import { logger } from "@/lib/logger"

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const bodyResult = await Result.tryPromise({
    try: async () => {
      try {
        return await request.json()
      } catch {
        return {}
      }
    },
    catch: () => new Error("Failed to parse request body"),
  })

  if (Result.isError(bodyResult)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const resetType = bodyResult.value.type || "processing"

  if (resetType === "failed") {
    const failedResult = await Result.tryPromise({
      try: async () =>
        db.query.feedItemsTable.findMany({
          where: eq(feedItemsTable.status, "failed"),
          columns: { id: true, title: true },
        }),
      catch: (e) =>
        new Error(
          `Failed to query failed items: ${e instanceof Error ? e.message : "Unknown error"}`,
        ),
    })

    if (Result.isError(failedResult)) {
      logger.error(`Failed to reset pipeline: ${failedResult.error.message}`)
      return Response.json(
        { error: `Failed to reset: ${failedResult.error.message}` },
        { status: 500 },
      )
    }

    const failedItems = failedResult.value

    if (failedItems.length === 0) {
      return Response.json({
        success: true,
        message: "No failed items found",
        count: 0,
      })
    }

    const updateResult = await Result.tryPromise({
      try: async () => {
        await db
          .update(feedItemsTable)
          .set({
            status: "pending",
            errorMessage: null,
          })
          .where(eq(feedItemsTable.status, "failed"))
      },
      catch: (e) =>
        new Error(
          `Failed to update failed items: ${e instanceof Error ? e.message : "Unknown error"}`,
        ),
    })

    if (Result.isError(updateResult)) {
      logger.error(`Failed to reset pipeline: ${updateResult.error.message}`)
      return Response.json(
        { error: `Failed to reset: ${updateResult.error.message}` },
        { status: 500 },
      )
    }

    logger.info(`Reset ${failedItems.length} failed items to pending`)

    return Response.json({
      success: true,
      message: `Reset ${failedItems.length} failed items to pending`,
      count: failedItems.length,
    })
  }

  const stuckResult = await Result.tryPromise({
    try: async () =>
      db.query.feedItemsTable.findMany({
        where: eq(feedItemsTable.status, "processing"),
        columns: { id: true, title: true },
      }),
    catch: (e) =>
      new Error(
        `Failed to query stuck items: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(stuckResult)) {
    logger.error(`Failed to reset pipeline: ${stuckResult.error.message}`)
    return Response.json(
      { error: `Failed to reset: ${stuckResult.error.message}` },
      { status: 500 },
    )
  }

  const stuckItems = stuckResult.value

  if (stuckItems.length === 0) {
    return Response.json({
      success: true,
      message: "No stuck items found",
      count: 0,
    })
  }

  const updateResult = await Result.tryPromise({
    try: async () => {
      await db
        .update(feedItemsTable)
        .set({
          status: "pending",
          errorMessage: null,
        })
        .where(eq(feedItemsTable.status, "processing"))
    },
    catch: (e) =>
      new Error(
        `Failed to update stuck items: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(updateResult)) {
    logger.error(`Failed to reset pipeline: ${updateResult.error.message}`)
    return Response.json(
      { error: `Failed to reset: ${updateResult.error.message}` },
      { status: 500 },
    )
  }

  logger.info(`Reset ${stuckItems.length} stuck items to pending`)

  return Response.json({
    success: true,
    message: `Reset ${stuckItems.length} stuck items to pending`,
    count: stuckItems.length,
  })
}
