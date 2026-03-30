interface ArticleContent {
  title: string
  summary: string
  content: string
}

interface SectionContent {
  heading: string
  body: string
}

interface TranslationResponse {
  translated: string
}

export const articleTranslationPrompt = (content: ArticleContent): string => {
  return `Translate the following article from English to Indonesian (Bahasa Indonesia).

Title: ${content.title}

Summary: ${content.summary}

Content: ${content.content}

Instructions:
- Translate all text to natural, professional Indonesian
- Preserve all HTML tags exactly as they appear (do not translate content inside tags)
- Maintain the original tone and style (professional, informative)
- Ensure the translation sounds natural to native Indonesian speakers
- Return the result as a JSON object with the following structure:
  {
    "title": "translated title",
    "summary": "translated summary",
    "content": "translated content with preserved HTML"
  }`
}

export const sectionTranslationPrompt = (section: SectionContent): string => {
  return `Translate the following section from English to Indonesian (Bahasa Indonesia).

Heading: ${section.heading}

Body: ${section.body}

Instructions:
- Translate all text to natural, professional Indonesian
- Preserve all HTML tags exactly as they appear (do not translate content inside tags)
- Maintain the original tone and style
- Ensure the translation sounds natural to native Indonesian speakers
- Return the result as a JSON object with the following structure:
  {
    "heading": "translated heading",
    "body": "translated body with preserved HTML"
  }`
}

export type { ArticleContent, SectionContent, TranslationResponse }
