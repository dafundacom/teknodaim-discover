<script lang="ts" module>
export interface ArticleCardData {
  slug: string
  title: string
  summary: string
  thumbnailUrl: string | null
  sourceCount: number
  readingTimeMinutes: number
  publishedAt: string | Date | null
  categories?: { slug: string; name: string }[]
}
</script>

<script lang="ts">
  import Badge from "@/components/ui/badge/badge.svelte"
  import {
    savedSlugsStore,
    toggleSave,
  } from "@/stores/saved-articles"
  import { userStore } from "@/stores/user"
  import type { ClientUser } from "@/stores/user"
  import { toast } from "svelte-sonner"

  let {
    article,
    href,
  }: {
    article: ArticleCardData
    href?: string
  } = $props()

  let user: ClientUser | null = $state(null)
  let articleSaved = $state(false)
  let saving = $state(false)

  $effect(() => {
    return userStore.subscribe((u: ClientUser | null) => {
      user = u
    })
  })

  $effect(() => {
    return savedSlugsStore.subscribe((set: Set<string>) => {
      articleSaved = set.has(article.slug)
    })
  })

  async function handleSaveClick() {
    if (saving) return
    saving = true
    const result = await toggleSave(article.slug)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        result.saved ? "Saved to library" : "Removed from library",
      )
    }
    saving = false
  }

  const timeAgo = $derived(() => {
    if (!article.publishedAt) return ""
    const diff = Date.now() - new Date(article.publishedAt).getTime()
    const hours = Math.floor(diff / 3_600_000)
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(article.publishedAt).toLocaleDateString()
  })

  const link = $derived(href ?? `/article/${article.slug}`)
</script>

<div
  class="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
>
  {#if user}
    <button
      type="button"
      class="absolute right-3 top-3 z-10 rounded-md p-1 transition-colors hover:bg-accent {articleSaved
        ? 'text-primary'
        : 'text-muted-foreground/0 group-hover:text-muted-foreground'}"
      title={articleSaved ? "Remove from library" : "Save to library"}
      disabled={saving}
      onclick={handleSaveClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={articleSaved ? "currentColor" : "none"}
        stroke="currentColor"
        stroke-width="2"
        class="h-4 w-4"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
        />
      </svg>
    </button>
  {/if}
  <a class="block" href={link}>
    <div class="flex gap-4">
      {#if article.thumbnailUrl}
        <div class="hidden shrink-0 sm:block">
          <img
            src={article.thumbnailUrl}
            alt=""
            class="h-24 w-36 rounded-lg object-cover"
            loading="lazy"
          />
        </div>
      {/if}

      <div class="min-w-0 flex-1">
        <h3
          class="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary"
        >
          {article.title}
        </h3>

        <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {article.summary}
        </p>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          {#if article.categories?.length}
            {#each article.categories.slice(0, 3) as cat}
              <Badge variant="secondary" class="text-xs">
                {cat.name}
              </Badge>
            {/each}
          {/if}

          <span class="text-xs text-muted-foreground">
            {article.sourceCount} sources
          </span>

          <span class="text-xs text-muted-foreground">
            {article.readingTimeMinutes} min read
          </span>

          {#if article.publishedAt}
            <span class="text-xs text-muted-foreground">
              {timeAgo()}
            </span>
          {/if}
        </div>
      </div>
    </div>
  </a>
</div>
