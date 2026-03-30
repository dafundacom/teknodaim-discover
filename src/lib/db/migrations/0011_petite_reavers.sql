CREATE TABLE "article_section_translations" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"language" text NOT NULL,
	"heading" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_translations" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"language" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"content" text NOT NULL,
	"is_auto_translated" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_section_translations" ADD CONSTRAINT "article_section_translations_section_id_article_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."article_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "section_translation_section_idx" ON "article_section_translations" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "section_translation_language_idx" ON "article_section_translations" USING btree ("language");--> statement-breakpoint
CREATE INDEX "translation_article_idx" ON "article_translations" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "translation_language_idx" ON "article_translations" USING btree ("language");