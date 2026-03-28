import type { APIRoute } from "astro"
import { Result } from "better-result"
import { eq, sql } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { articlesTable, feedItemsTable } from "@/lib/db/schemas"

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals.user)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await Result.tryPromise({
    try: async () => {
      const statusCounts = await db
        .select({
          status: feedItemsTable.status,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(feedItemsTable)
        .groupBy(feedItemsTable.status)

      const statusMap = Object.fromEntries(
        statusCounts.map((row) => [row.status, row.count]),
      )

      const [articleResult] = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(articlesTable)

      const recentArticles = await db
        .select({
          id: articlesTable.id,
          title: articlesTable.title,
          slug: articlesTable.slug,
          publishedAt: articlesTable.publishedAt,
        })
        .from(articlesTable)
        .orderBy(sql`${articlesTable.publishedAt} desc`)
        .limit(5)

      const pendingItems = await db
        .select({
          id: feedItemsTable.id,
          title: feedItemsTable.title,
          status: feedItemsTable.status,
          publishedAt: feedItemsTable.publishedAt,
        })
        .from(feedItemsTable)
        .where(eq(feedItemsTable.status, "pending"))
        .orderBy(sql`${feedItemsTable.publishedAt} desc`)
        .limit(10)

      return {
        stats: {
          pending: statusMap.pending ?? 0,
          processing: statusMap.processing ?? 0,
          processed: statusMap.processed ?? 0,
          failed: statusMap.failed ?? 0,
          totalArticles: articleResult?.count ?? 0,
        },
        recentArticles,
        pendingItems,
      }
    },
    catch: (e) =>
      new Error(
        `Failed to fetch pipeline status: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(result)) {
    console.error("Pipeline status error:", result.error)
    return Response.json(
      { error: "Failed to fetch pipeline status" },
      { status: 500 },
    )
  }

  return Response.json(result.value)
}
