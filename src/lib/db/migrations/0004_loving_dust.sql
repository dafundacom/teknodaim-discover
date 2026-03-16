CREATE TABLE "clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"ai_model" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cluster_topic_idx" ON "clusters" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "cluster_ai_model_idx" ON "clusters" USING btree ("ai_model");