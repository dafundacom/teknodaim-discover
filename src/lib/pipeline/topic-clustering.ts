import type { SelectFeedItem } from "@/lib/db/schemas"

export interface TopicCluster {
  topic: string
  keywords: string[]
  items: SelectFeedItem[]
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "not",
    "no",
    "he",
    "she",
    "they",
    "we",
    "you",
    "i",
    "my",
    "his",
    "her",
    "their",
    "our",
    "your",
    "as",
    "if",
    "so",
    "than",
    "then",
    "about",
    "into",
    "through",
    "after",
    "before",
    "between",
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
}

function computeSimilarity(kwA: string[], kwB: string[]): number {
  const setA = new Set(kwA)
  const setB = new Set(kwB)
  const intersection = [...setA].filter((w) => setB.has(w))
  const union = new Set([...setA, ...setB])
  return union.size > 0 ? intersection.length / union.size : 0
}

function getUniqueSourceCount(items: SelectFeedItem[]): number {
  return new Set(items.map((item) => item.feedSourceId)).size
}

export function clusterByTopic(
  items: SelectFeedItem[],
  similarityThreshold = 0.15,
  timeWindowHours = 72,
  minUniqueSources = 2,
): TopicCluster[] {
  const now = Date.now()
  const cutoff = now - timeWindowHours * 60 * 60 * 1000

  const recentItems = items.filter((item) => {
    const publishedTime =
      item.publishedAt?.getTime() ?? item.fetchedAt.getTime()
    return publishedTime >= cutoff
  })

  const itemKeywords = recentItems.map((item) => ({
    item,
    keywords: extractKeywords(`${item.title} ${item.description ?? ""}`),
  }))

  const clusters: TopicCluster[] = []
  const assigned = new Set<string>()

  for (const { item, keywords } of itemKeywords) {
    if (assigned.has(item.id)) continue

    const cluster: TopicCluster = {
      topic: item.title,
      keywords: [...keywords],
      items: [item],
    }
    assigned.add(item.id)

    for (const other of itemKeywords) {
      if (assigned.has(other.item.id)) continue

      const similarity = computeSimilarity(keywords, other.keywords)
      if (similarity >= similarityThreshold) {
        cluster.items.push(other.item)
        cluster.keywords = [
          ...new Set([...cluster.keywords, ...other.keywords]),
        ]
        assigned.add(other.item.id)
      }
    }

    const hasEnoughSources =
      getUniqueSourceCount(cluster.items) >= minUniqueSources

    if (cluster.items.length >= minUniqueSources && hasEnoughSources) {
      clusters.push(cluster)
    }
  }

  const unclustered = recentItems.filter((item) => !assigned.has(item.id))
  for (const item of unclustered) {
    const keywords = extractKeywords(`${item.title} ${item.description ?? ""}`)
    clusters.push({
      topic: item.title,
      keywords,
      items: [item],
    })
  }

  return clusters.sort((a, b) => b.items.length - a.items.length)
}
