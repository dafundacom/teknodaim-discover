<script lang="ts">
import * as Card from "@/components/ui/card"
import Progress from "@/components/ui/progress.svelte"
import { formatFileSize } from "@/lib/utils/assets"

let {
  filename,
  size,
  progress,
}: {
  filename: string
  size: number
  progress: number
} = $props()
</script>

<Card.Root>
  <Card.Content class="space-y-3 p-4">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <p class="truncate font-medium">{filename}</p>
        <p class="text-muted-foreground text-sm">{formatFileSize(size)}</p>
      </div>
      <span class="text-sm font-medium">{progress}%</span>
    </div>
    <Progress value={progress} />
  </Card.Content>
</Card.Root>
