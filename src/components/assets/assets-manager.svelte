<script lang="ts">
import AssetCard from "@/components/assets/asset-card.svelte"
import AssetPreviewDialog from "@/components/assets/asset-preview-dialog.svelte"
import AssetSkeleton from "@/components/assets/asset-skeleton.svelte"
import DeleteAssetDialog from "@/components/assets/delete-asset-dialog.svelte"
import TypeFilter from "@/components/assets/type-filter.svelte"
import UploadDropzone from "@/components/assets/upload-dropzone.svelte"
import UploadProgress from "@/components/assets/upload-progress.svelte"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon } from "@lucide/svelte"
import { toast } from "svelte-sonner"
import type { Asset, AssetType } from "@/types/asset"

interface Upload {
  file: File
  progress: number
}

let {
  assets: initialAssets,
  maxUploadSizeMB,
}: {
  assets: Asset[]
  maxUploadSizeMB: number
} = $props()

let assets = $state<Asset[]>(initialAssets)
let selectedType = $state<AssetType | null>(null)
let loading = $state(false)
let deleteDialogOpen = $state(false)
let previewDialogOpen = $state(false)
let selectedAsset = $state<Asset | null>(null)
let uploads = $state<Upload[]>([])
let uploadDialogOpen = $state(false)

const filteredAssets = $derived(
  selectedType ? assets.filter((a) => a.type === selectedType) : assets,
)

async function handleUpload(file: File) {
  uploadDialogOpen = true
  const upload: Upload = { file, progress: 0 }
  uploads = [...uploads, upload]

  const formData = new FormData()
  formData.append("file", file)

  try {
    const res = await fetch("/api/assets/upload", {
      method: "POST",
      body: formData,
    })

    if (res.ok) {
      const asset = await res.json()
      assets = [asset, ...assets]
      toast.success(`Uploaded ${file.name}`)
    } else {
      const error = await res.text()
      toast.error(error || `Failed to upload ${file.name}`)
    }
  } catch (error) {
    toast.error(`Failed to upload ${file.name}`)
  } finally {
    uploads = uploads.filter((u) => u !== upload)
    if (uploads.length === 0) {
      uploadDialogOpen = false
    }
  }
}

function handleDeleteRequest(asset: Asset) {
  selectedAsset = asset
  deleteDialogOpen = true
}

async function handleDeleteConfirm() {
  if (!selectedAsset) return

  const res = await fetch(`/api/assets/${selectedAsset.id}`, {
    method: "DELETE",
  })

  if (res.ok) {
    assets = assets.filter((a) => a.id !== selectedAsset?.id)
    toast.success("Asset deleted")
  } else {
    toast.error("Failed to delete asset")
  }

  deleteDialogOpen = false
  selectedAsset = null
}

function handlePreview(asset: Asset) {
  selectedAsset = asset
  previewDialogOpen = true
}
</script>

<div class="space-y-6">
  <UploadDropzone onUpload={handleUpload} maxSizeMB={maxUploadSizeMB} />

  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <TypeFilter {selectedType} onTypeChange={(t) => (selectedType = t)} />
    <p class="text-muted-foreground text-sm">{filteredAssets.length} assets</p>
  </div>

  {#if loading}
    <AssetSkeleton />
  {:else if filteredAssets.length === 0}
    <div class="text-center py-12">
      <ImageIcon class="text-muted-foreground/50 mx-auto mb-4 size-12" />
      <p class="text-muted-foreground font-medium">No assets found</p>
      <p class="text-muted-foreground text-sm">
        {#if selectedType}
          No {selectedType} assets match your filter.
        {:else}
          Upload your first asset to get started.
        {/if}
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {#each filteredAssets as asset (asset.id)}
        <AssetCard {asset} onPreview={handlePreview} onDelete={handleDeleteRequest} />
      {/each}
    </div>
  {/if}

  {#if uploads.length > 0}
    <div class="space-y-2">
      {#each uploads as upload}
        <UploadProgress filename={upload.file.name} size={upload.file.size} progress={upload.progress} />
      {/each}
    </div>
  {/if}
</div>

<DeleteAssetDialog
  bind:open={deleteDialogOpen}
  asset={selectedAsset}
  onConfirm={handleDeleteConfirm}
/>

<AssetPreviewDialog
  bind:open={previewDialogOpen}
  asset={selectedAsset}
  onDelete={handleDeleteRequest}
/>
