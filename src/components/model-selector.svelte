<script lang="ts">
import { Label } from "@/components/ui/label"

interface ModelOption {
  value: string
  label: string
  description: string
  cost: string
}

const modelOptions: ModelOption[] = [
  {
    value: "gpt-4o",
    label: "GPT-4o",
    description: "High quality, balanced speed",
    cost: "$$$",
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description: "Fast and cost-effective",
    cost: "$",
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description: "Highest quality, slower",
    cost: "$$$$",
  },
]

let {
  value = $bindable(""),
  label = "AI Model",
  id = "ai-model-select",
}: {
  value?: string
  label?: string
  id?: string
} = $props()

function handleChange(e: Event) {
  const target = e.target as HTMLSelectElement
  value = target.value
}
</script>

<div class="space-y-2">
  <Label for={id}>{label}</Label>
  <select
    {id}
    value={value ?? ""}
    onchange={handleChange}
    class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <option value="">Default (GPT-4o Mini)</option>
    {#each modelOptions as model}
      <option value={model.value}>
        {model.label} - {model.description} ({model.cost})
      </option>
    {/each}
  </select>
  <p class="text-xs text-muted-foreground">
    Select the AI model for summarizing articles in this cluster.
  </p>
</div>
