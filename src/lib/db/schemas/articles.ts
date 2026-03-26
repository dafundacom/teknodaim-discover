import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import { createCustomId } from "@/lib/utils/custom-id"
import { assetsTable } from "./assets"

export const articleStatusEnum = ["draft", "published", "archived"] as const
export type ArticleStatus = (typeof articleStatusEnum)[number]

export const articlesTable = pgTable(
  "articles",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => createCustomId()),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    status: text("status", { enum: articleStatusEnum })
      .notNull()
      .default("draft"),
    thumbnailUrl: text("thumbnail_url"),
    thumbnailAssetId: text("thumbnail_asset_id").references(
      () => assetsTable.id,
      { onDelete: "set null" },
    ),
    sourceCount: integer("source_count").notNull().default(0),
    readingTimeMinutes: integer("reading_time_minutes").notNull().default(1),
    contentFingerprint: text("content_fingerprint"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("article_slug_idx").on(table.slug),
    index("article_status_idx").on(table.status),
    index("article_published_idx").on(table.publishedAt),
    index("article_content_fingerprint_idx").on(table.contentFingerprint),
  ],
)

export const insertArticleSchema = createInsertSchema(articlesTable)
export const updateArticleSchema = createUpdateSchema(articlesTable)

export type SelectArticle = typeof articlesTable.$inferSelect
export type InsertArticle = typeof articlesTable.$inferInsert
