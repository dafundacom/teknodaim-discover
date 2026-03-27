<script lang="ts">
import { Download, Trash2 } from "@lucide/svelte"
import * as Dialog from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/utils/assets"
import type { Asset } from "@/types/asset"

let {
  open = $bindable(false),
  asset,
  onDelete,
}: {
  open?: boolean
  asset: Asset | null
  onDelete?: (asset: Asset) => void
} = $props()

function formatDate(date: Date | null): string {
  if (!date) return "Unknown"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function handleDownload() {
  if (asset?.url) {
    window.open(asset.url, "_blank")
  }
}

function handleDelete() {
  if (asset && onDelete) {
    onDelete(asset)
    open = false
  }
}
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="max-w-3xl">
      <Dialog.Header>
        <Dialog.Title>Asset Details</Dialog.Title>
      </Dialog.Header>
      {#if asset}
        <div class="space-y-4">
          {#if asset.type === "images"}
            <div class="bg-muted max-h-96 overflow-hidden rounded-lg">
              <img
                src={asset.url}
                alt={asset.originalName}
                class="size-full object-contain"
              />
            </div>
          {:else}
            <div
              class="bg-muted flex h-48 items-center justify-center rounded-lg"
            >
              <span class="text-muted-foreground text-4xl">{asset.type}</span>
            </div>
          {/if}
          <div class="space-y-2">
            <p class="font-medium">{asset.originalName}</p>
            <div class="text-muted-foreground space-y-1 text-sm">
              <p>Type: {asset.type}</p>
              <p>Size: {formatFileSize(asset.size)}</p>
              <p>Uploaded: {formatDate(asset.createdAt)}</p>
            </div>
          </div>
        </div>
        <Dialog.Footer class="gap-2">
          <Button variant="outline" onclick={handleDownload}>
            <Download class="mr-2 size-4" />
            Download
          </Button>
          {#if onDelete}
            <Button variant="destructive" onclick={handleDelete}>
              <Trash2 class="mr-2 size-4" />
              Delete
            </Button>
          {/if}
        </Dialog.Footer>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
