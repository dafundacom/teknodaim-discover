<script lang="ts">
import Button from "@/components/ui/button/button.svelte"
import { savedSlugsStore, toggleSave } from "@/stores/saved-articles"
import { toast } from "svelte-sonner"

let { slug }: { slug: string } = $props()

let loading = $state(false)
let saved = $state(false)

$effect(() => {
  return savedSlugsStore.subscribe((set: Set<string>) => {
    saved = set.has(slug)
  })
})

async function toggle() {
  loading = true
  const result = await toggleSave(slug)
  if (result.error) {
    toast.error(result.error)
  } else {
    toast.success(result.saved ? "Saved to library" : "Removed from library")
  }
  loading = false
}
</script>

<Button
  variant={saved ? "default" : "outline"}
  size="sm"
  disabled={loading}
  onclick={toggle}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={saved ? "currentColor" : "none"}
    stroke="currentColor"
    stroke-width="2"
    class="mr-1.5 h-4 w-4"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
    />
  </svg>
  {saved ? "Saved" : "Save"}
</Button>
