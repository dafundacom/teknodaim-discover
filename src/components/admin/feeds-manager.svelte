<script lang="ts">
import AdminTable from "@/components/admin/admin-table.svelte"
import ConfirmDialog from "@/components/ui/confirm-dialog.svelte"
import * as Dialog from "@/components/ui/dialog"
import Button from "@/components/ui/button/button.svelte"
import { Plus } from "@lucide/svelte"
import { toast } from "svelte-sonner"
import type { SelectFeedSource } from "@/lib/db/schemas/feed-sources"
import FeedForm from "./feed-form.svelte"

type FeedRow = SelectFeedSource

let {
  feeds,
}: {
  feeds: FeedRow[]
} = $props()

let confirmDialog = $state<ConfirmDialog>()
let editDialogOpen = $state(false)
let addDialogOpen = $state(false)
let selectedFeed = $state<FeedRow | null>(null)

async function handleDelete(row: FeedRow) {
  const confirmed = await confirmDialog?.showConfirm({
    title: "Delete Feed Source",
    description: `Are you sure you want to delete "${row.name}"? This action cannot be undone.`,
    confirmText: "Delete",
    confirmVariant: "destructive",
    cancelText: "Cancel",
  })

  if (!confirmed) return

  const res = await fetch(`/api/admin/feeds/${row.id}`, {
    method: "DELETE",
  })

  if (res.ok) {
    toast.success("Feed source deleted successfully")
    window.location.reload()
  } else {
    const error = await res.text()
    toast.error(error || "Failed to delete feed source")
  }
}

function handleEdit(row: FeedRow) {
  selectedFeed = row
  editDialogOpen = true
}

function handleEditSuccess() {
  editDialogOpen = false
  selectedFeed = null
  window.location.reload()
}

function handleAddSuccess() {
  addDialogOpen = false
  window.location.reload()
}
</script>

<ConfirmDialog bind:this={confirmDialog} />

<Dialog.Root bind:open={editDialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-[425px]">
      {#if selectedFeed}
        <FeedForm
          feed={selectedFeed}
          onSuccess={handleEditSuccess}
          onCancel={() => {
            editDialogOpen = false
            selectedFeed = null
          }}
        />
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-[425px]">
      <FeedForm
        onSuccess={handleAddSuccess}
        onCancel={() => (addDialogOpen = false)}
      />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<div class="space-y-4">
  <div class="flex justify-end">
    <Button onclick={() => (addDialogOpen = true)}>
      <Plus class="h-4 w-4" />
      Add Feed
    </Button>
  </div>

  <AdminTable
  columns={[
    { key: "name", label: "Name", sortable: true },
    { key: "url", label: "URL" },
    {
      key: "enabled",
      label: "Status",
      render: (row) =>
        row.enabled ? "Active" : "Disabled",
    },
  ]}
  rows={feeds}
  actions={[
    {
      label: "Edit",
      variant: "default",
      onClick: handleEdit,
    },
    {
      label: "Delete",
      variant: "destructive",
      onClick: handleDelete,
    },
  ]}
  emptyMessage="No feed sources configured yet."
/>
</div>
