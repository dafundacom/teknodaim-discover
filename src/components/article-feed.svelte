<script lang="ts">
import Skeleton from "@/components/ui/skeleton/skeleton.svelte"
import { selectedCategoryStore } from "@/stores/selected-category"
import ArticleCard from "./article-card.svelte"
import type { ArticleCardData } from "./article-card.svelte"

let {
  initialArticles = [],
  initialTotal = 0,
  pageSize = 20,
}: {
  initialArticles?: ArticleCardData[]
  initialTotal?: number
  pageSize?: number
} = $props()

let articles = $state<ArticleCardData[]>([])
let total = $state(0)
let page = $state(1)
let loading = $state(false)
let category = $state(selectedCategoryStore.get())

$effect(() => {
  articles = initialArticles
  total = initialTotal
})

$effect(() => {
  return selectedCategoryStore.subscribe((value: string) => {
    category = value
  })
})

const hasMore = $derived(articles.length < total)

async function loadMore() {
  loading = true
  const nextPage = page + 1
  const params = new URLSearchParams({
    page: String(nextPage),
    limit: String(pageSize),
  })
  if (category) params.set("category", category)

  const res = await fetch(`/api/articles?${params}`)
  if (res.ok) {
    const data = await res.json()
    articles = [...articles, ...data.articles]
    total = data.total
    page = nextPage
  }
  loading = false
}
</script>

<div class="space-y-4">
  {#each articles as article (article.slug)}
    <ArticleCard {article} />
  {/each}

  {#if loading}
    <div class="space-y-4">
      {#each { length: 3 } as _}
        <div class="rounded-xl border border-border p-4">
          <Skeleton class="mb-2 h-5 w-3/4" />
          <Skeleton class="mb-3 h-4 w-full" />
          <div class="flex gap-2">
            <Skeleton class="h-5 w-16" />
            <Skeleton class="h-5 w-16" />
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if hasMore && !loading}
    <div class="flex justify-center pt-4">
      <button
        class="rounded-lg border border-border bg-card px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        onclick={loadMore}
      >
        Load more articles
      </button>
    </div>
  {/if}

  {#if articles.length === 0 && !loading}
    <div class="py-12 text-center text-muted-foreground">
      <p class="text-lg font-medium">No articles yet</p>
      <p class="mt-1 text-sm">
        Check back soon for AI-curated insights.
      </p>
    </div>
  {/if}
</div>
