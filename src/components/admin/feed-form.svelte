<script lang="ts">
import Button from "@/components/ui/button/button.svelte"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "svelte-sonner"
import { createForm } from "@tanstack/svelte-form"
import { z } from "zod"

let {
  feed = null,
  onSuccess,
  onCancel,
}: {
  feed?: {
    id: string
    name: string
    url: string
    enabled: boolean
  } | null
  onSuccess?: () => void
  onCancel?: () => void
} = $props()

const feedSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  enabled: z.boolean(),
})

interface FeedFormData {
  name: string
  url: string
  enabled: boolean
}

const form = createForm(() => ({
  defaultValues: {
    name: feed?.name ?? "",
    url: feed?.url ?? "",
    enabled: feed?.enabled ?? true,
  } as FeedFormData,
  validators: {
    onChange: feedSchema,
  },
  onSubmit: async ({ value }: { value: FeedFormData }) => {
    const endpoint = feed ? `/api/admin/feeds/${feed.id}` : "/api/admin/feeds"
    const method = feed ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: value.name.trim(),
        url: value.url.trim(),
        enabled: value.enabled,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Failed to save feed")
      return
    }

    toast.success(feed ? "Feed updated" : "Feed created")
    if (!feed) {
      form.reset()
    }
    onSuccess?.()
  },
}))

$effect(() => {
  if (feed) {
    form.setFieldValue("name", feed.name)
    form.setFieldValue("url", feed.url)
    form.setFieldValue("enabled", feed.enabled)
  }
})
</script>

<form
  onsubmit={(e) => {
    e.preventDefault()
    form.handleSubmit()
  }}
  class="space-y-4 rounded-xl border border-border bg-card p-6"
>
  <h3 class="font-semibold">
    {feed ? "Edit Feed Source" : "Add Feed Source"}
  </h3>

  <form.Field name="name">
    {#snippet children(field)}
      <div class="space-y-2">
        <Label for="feed-name">Name</Label>
        <Input
          id="feed-name"
          name="name"
          placeholder="TechCrunch AI"
          value={field.state.value as string}
          oninput={(e) => field.handleChange(e.currentTarget.value)}
          onblur={field.handleBlur}
        />
        {#if field.state.meta.errors.length > 0}
          <span class="text-sm text-red-500">{field.state.meta.errors[0]}</span>
        {/if}
      </div>
    {/snippet}
  </form.Field>

  <form.Field name="url">
    {#snippet children(field)}
      <div class="space-y-2">
        <Label for="feed-url">RSS Feed URL</Label>
        <Input
          id="feed-url"
          name="url"
          type="url"
          placeholder="https://example.com/rss"
          value={field.state.value as string}
          oninput={(e) => field.handleChange(e.currentTarget.value)}
          onblur={field.handleBlur}
        />
        {#if field.state.meta.errors.length > 0}
          <span class="text-sm text-red-500">{field.state.meta.errors[0]}</span>
        {/if}
      </div>
    {/snippet}
  </form.Field>

  <form.Field name="enabled">
    {#snippet children(field)}
      <div class="flex items-center gap-2">
        <input
          id="feed-enabled"
          name="enabled"
          type="checkbox"
          checked={field.state.value as boolean}
          onchange={(e) => field.handleChange(e.currentTarget.checked)}
          class="h-4 w-4 rounded border-border"
        />
        <Label for="feed-enabled">Enabled</Label>
      </div>
    {/snippet}
  </form.Field>

  <div class="flex gap-2">
    {#if onCancel}
      <Button type="button" variant="outline" onclick={onCancel}>
        Cancel
      </Button>
    {/if}
    <Button type="submit" disabled={form.state.isSubmitting}>
      {#if form.state.isSubmitting}
        Saving...
      {:else}
        {feed ? "Update" : "Add Feed"}
      {/if}
    </Button>
  </div>
</form>
