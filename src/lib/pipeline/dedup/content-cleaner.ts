const BOILERPLATE_PATTERNS = [
  /^\s*read more\s*$/i,
  /^\s*related articles?\s*$/i,
  /^\s*share this\s*$/i,
  /^\s*follow us\s*$/i,
  /^\s*subscribe\s*$/i,
  /^\s*more from\s*/i,
  /^\s*you may also like\s*$/i,
  /^\s*sponsored content\s*$/i,
  /^\s*advertisement\s*$/i,
  /^\s*loading\.\.\.\s*$/i,
  /^\s*click here\s*/i,
  /^\s*learn more\s*$/i,
  /^\s*continue reading\s*$/i,
  /^\s*editor['']s note\s*:/i,
  /^\s*disclaimer\s*:/i,
  /^\s*about the author\s*:/i,
  /^\s*tags\s*:/i,
  /^\s*categories\s*:/i,
  /^\s*published\s*:/i,
  /^\s*updated\s*:/i,
  /^\s*\d+\s*(min|minute)s?\s*(read|reading)\s*$/i,
  /^\s*by\s+\w+\s+\w+\s*$/i,
]

const REPEATED_PHRASE_MIN_LENGTH = 20

function isBoilerplate(text: string): boolean {
  const trimmed = text.trim()
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim()
}

function findRepeatedParagraphs(paragraphs: string[]): Set<number> {
  const toRemove = new Set<number>()
  const normalizedMap = new Map<string, number>()

  for (let i = 0; i < paragraphs.length; i++) {
    const normalized = paragraphs[i]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim()

    if (normalized.length < REPEATED_PHRASE_MIN_LENGTH) {
      continue
    }

    if (normalizedMap.has(normalized)) {
      toRemove.add(i)
    } else {
      normalizedMap.set(normalized, i)
    }
  }

  return toRemove
}

function findNearDuplicates(
  paragraphs: string[],
  threshold = 0.9,
): Set<number> {
  const toRemove = new Set<number>()

  for (let i = 0; i < paragraphs.length; i++) {
    if (toRemove.has(i)) continue

    for (let j = i + 1; j < paragraphs.length; j++) {
      if (toRemove.has(j)) continue

      const similarity = calculateSimilarity(paragraphs[i], paragraphs[j])
      if (similarity >= threshold) {
        toRemove.add(j)
      }
    }
  }

  return toRemove
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )

  if (words1.size === 0 || words2.size === 0) {
    return 0
  }

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

export function deduplicateContent(text: string): string {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)

  const filtered = paragraphs.filter((p) => !isBoilerplate(p))

  const exactDuplicates = findRepeatedParagraphs(filtered)
  const nearDuplicates = findNearDuplicates(filtered)

  const uniqueParagraphs = filtered.filter((_, index) => {
    return !exactDuplicates.has(index) && !nearDuplicates.has(index)
  })

  return normalizeWhitespace(uniqueParagraphs.join("\n\n"))
}

export function cleanExtractedText(text: string): string {
  let cleaned = text

  cleaned = cleaned.replace(/\[\s*\d+\s*\]/g, "")

  cleaned = cleaned.replace(/\(\s*\d+\s*\)/g, "")

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  cleaned = cleaned.replace(/\t/g, " ")

  cleaned = cleaned.replace(/\u200B/g, "")
  cleaned = cleaned.replace(/\u200C/g, "")
  cleaned = cleaned.replace(/\u200D/g, "")
  cleaned = cleaned.replace(/\uFEFF/g, "")

  return normalizeWhitespace(cleaned)
}
