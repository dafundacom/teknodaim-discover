import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import { createCustomId } from "@/lib/utils/custom-id"
import { feedSourcesTable } from "./feed-sources"

export const feedItemStatusEnum = [
  "pending",
  "processing",
  "processed",
  "failed",
  "skipped",
] as const
export type FeedItemStatus = (typeof feedItemStatusEnum)[number]

export const feedItemsTable = pgTable(
  "feed_items",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => createCustomId()),
    feedSourceId: text("feed_source_id")
      .notNull()
      .references(() => feedSourcesTable.id, { onDelete: "cascade" }),
    guid: text("guid").notNull(),
    title: text("title").notNull(),
    link: text("link").notNull(),
    description: text("description"),
    author: text("author"),
    publishedAt: timestamp("published_at"),
    status: text("status", { enum: feedItemStatusEnum })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    normalizedUrl: text("normalized_url"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => [
    index("feed_item_source_idx").on(table.feedSourceId),
    index("feed_item_status_idx").on(table.status),
    index("feed_item_guid_idx").on(table.guid),
    index("feed_item_published_idx").on(table.publishedAt),
    index("feed_item_normalized_url_idx").on(table.normalizedUrl),
  ],
)

export const insertFeedItemSchema = createInsertSchema(feedItemsTable)
export const updateFeedItemSchema = createUpdateSchema(feedItemsTable)

export type SelectFeedItem = typeof feedItemsTable.$inferSelect
export type InsertFeedItem = typeof feedItemsTable.$inferInsert

export const feedItemsRelations = relations(feedItemsTable, ({ one }) => ({
  feedSource: one(feedSourcesTable, {
    fields: [feedItemsTable.feedSourceId],
    references: [feedSourcesTable.id],
  }),
}))
