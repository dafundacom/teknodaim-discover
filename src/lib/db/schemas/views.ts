import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { createCustomId } from "@/lib/utils/custom-id"

export const articleViewsTable = pgTable("article_views", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => createCustomId()),
  articleId: varchar("articleId").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipHash: varchar("ip_hash", { length: 64 }).notNull(),
  userAgentHash: varchar("user_agent_hash", { length: 64 }).notNull(),
  fingerprint: varchar("fingerprint", { length: 64 }),
  sessionId: varchar("session_id", { length: 64 }),
})

export const insertArticleViewSchema = createInsertSchema(articleViewsTable)
export const updateArticleViewSchema = createUpdateSchema(articleViewsTable)

export type SelectArticleView = typeof articleViewsTable.$inferSelect
export type InsertArticleView = typeof articleViewsTable.$inferInsert
