<script lang="ts">
import { userStore, type ClientUser } from "@/stores/user"
import { initSavedSlugs } from "@/stores/saved-articles"
import { selectedCategoryStore } from "@/stores/selected-category"

let {
  user = null,
  savedSlugs = [],
  selectedCategory = "",
}: {
  user?: ClientUser | null
  savedSlugs?: string[]
  selectedCategory?: string
} = $props()

$effect(() => {
  userStore.set(user ?? null)
  initSavedSlugs(savedSlugs)
  selectedCategoryStore.set(selectedCategory)
})
</script>
