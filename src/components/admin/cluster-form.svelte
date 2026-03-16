<script lang="ts">
import Button from "@/components/ui/button/button.svelte"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "svelte-sonner"
import ModelSelector from "@/components/model-selector.svelte"

let {
  cluster = null,
  onSuccess,
}: {
  cluster?: {
    id: string
    topic: string
    keywords: string[]
    aiModel: string | null
  } | null
  onSuccess?: () => void
} = $props()

let topic = $state(cluster?.topic ?? "")
let keywords = $state(cluster?.keywords?.join(", ") ?? "")
let aiModel = $state(cluster?.aiModel ?? "")
let loading = $state(false)

$effect(() => {
  if (cluster) {
    topic = cluster.topic
    keywords = cluster.keywords.join(", ")
    aiModel = cluster.aiModel ?? ""
  } else {
    topic = ""
    keywords = ""
    aiModel = ""
  }
})

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault()
  if (!topic.trim()) {
    toast.error("Topic is required")
    return
  }

  loading = true
  try {
    const endpoint = cluster
      ? `/api/admin/clusters/${cluster.id}`
      : "/api/admin/clusters"
    const method = cluster ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: cluster?.id,
        topic: topic.trim(),
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        aiModel: aiModel || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Failed to save cluster")
      return
    }

    toast.success(cluster ? "Cluster updated" : "Cluster created")
    if (!cluster) {
      topic = ""
      keywords = ""
      aiModel = ""
    }
    onSuccess?.()
  } catch {
    toast.error("Network error")
  } finally {
    loading = false
  }
}
</script>

<form
  onsubmit={handleSubmit}
  class="space-y-4 rounded-xl border border-border bg-card p-6"
>
  <h3 class="font-semibold">
    {cluster ? "Edit Cluster" : "Add Cluster"}
  </h3>

  <div class="space-y-2">
    <Label for="cluster-topic">Topic</Label>
    <Input
      id="cluster-topic"
      placeholder="Technology News"
      bind:value={topic}
    />
    <p class="text-xs text-muted-foreground">
      The main topic or theme for this cluster.
    </p>
  </div>

  <div class="space-y-2">
    <Label for="cluster-keywords">Keywords (comma-separated)</Label>
    <Input
      id="cluster-keywords"
      placeholder="tech, software, ai, startup"
      bind:value={keywords}
    />
    <p class="text-xs text-muted-foreground">
      Keywords used to identify articles for this cluster.
    </p>
  </div>

  <ModelSelector bind:value={aiModel} />

  <div class="flex gap-2">
    <Button type="submit" disabled={loading}>
      {#if loading}
        Saving...
      {:else}
        {cluster ? "Update" : "Add Cluster"}
      {/if}
    </Button>
  </div>
</form>
