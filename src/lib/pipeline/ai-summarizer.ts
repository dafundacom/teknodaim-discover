import { openai } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import type { Result } from "better-result"
import { Result as R } from "better-result"
import { slugify } from "transliteration"
import { z } from "zod"

import { createCustomId } from "@/lib/utils/custom-id"
import { AISummarizationError } from "./errors"
import type { TopicCluster } from "./topic-clustering"

export interface SummarizedArticle {
  slug: string
  title: string
  summary: string
  content: string
  sections: { heading: string; body: string }[]
  categories: string[]
  readingTimeMinutes: number
}

const articleSchema = z.object({
  title: z.string().describe("Concise, engaging headline for the article"),
  summary: z
    .string()
    .describe("2-3 sentence executive summary of the key findings"),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("Section heading"),
        body: z
          .string()
          .describe("Section content as clean HTML (no markdown)"),
      }),
    )
    .describe("Article body broken into logical sections"),
  categories: z
    .array(z.string())
    .describe(
      "1-3 category slugs like tech, finance, science, health, business",
    ),
})

function estimateReadingTime(text: string): number {
  const wordCount = text.split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

function generateSlug(title: string): string {
  const base = slugify(title)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  const suffix = createCustomId().slice(0, 8)
  return `${base}-${suffix}`
}

export function summarizeCluster(
  cluster: TopicCluster,
  model = "gpt-4o-mini",
): Promise<Result<SummarizedArticle, AISummarizationError>> {
  return R.gen(async function* () {
    const sourceTexts = cluster.items
      .map(
        (item, i) =>
          `[Source ${i + 1}] ${item.title}\n${item.description ?? ""}`,
      )
      .join("\n\n")

    const object = yield* R.await(
      R.tryPromise({
        try: async () => {
          const result = await generateText({
            model: openai(model),
            output: Output.object({ schema: articleSchema }),
            prompt: `You are a journalist writing for a news discovery platform similar to Perplexity.
Synthesize the following ${cluster.items.length} source articles into a single comprehensive article.
Write in a clear, professional tone. Include all key facts and perspectives.
Use semantic HTML tags in section bodies: <p> for paragraphs, <strong> for emphasis, <ul>/<li> for lists, <h3> for subheadings. Do NOT use markdown.

Topic: ${cluster.topic}
Keywords: ${cluster.keywords.slice(0, 10).join(", ")}

Sources:
${sourceTexts}`,
          })
          if (!result.output) {
            throw new Error("AI returned no structured output")
          }
          return result.output
        },
        catch: (e) =>
          new AISummarizationError({
            message: `AI summarization failed for topic "${cluster.topic}"`,
            cause: e,
          }),
      }),
    )

    const content = object.sections
      .map(
        (s) =>
          `<section class="article-section"><h2>${s.heading}</h2>${s.body}</section>`,
      )
      .join("\n")

    const fullText = `${object.summary}\n\n${content}`

    return R.ok({
      slug: generateSlug(object.title),
      title: object.title,
      summary: object.summary,
      content,
      sections: object.sections,
      categories: object.categories,
      readingTimeMinutes: estimateReadingTime(fullText),
    })
  })
}
