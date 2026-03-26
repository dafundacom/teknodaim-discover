ALTER TABLE "articles" ADD COLUMN "content_fingerprint" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "normalized_url" text;--> statement-breakpoint
CREATE INDEX "article_content_fingerprint_idx" ON "articles" USING btree ("content_fingerprint");--> statement-breakpoint
CREATE INDEX "feed_item_normalized_url_idx" ON "feed_items" USING btree ("normalized_url");