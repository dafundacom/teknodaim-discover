<script lang="ts">
import AdminTable from "@/components/admin/admin-table.svelte"
import ConfirmDialog from "@/components/ui/confirm-dialog.svelte"
import { toast } from "svelte-sonner"
import type { SelectFeedSource } from "@/lib/db/schemas/feed-sources"

type FeedRow = SelectFeedSource

let {
  feeds,
}: {
  feeds: FeedRow[]
} = $props()

let confirmDialog = $state<ConfirmDialog>()

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
</script>

<ConfirmDialog bind:this={confirmDialog} />

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
      label: "Delete",
      variant: "destructive",
      onClick: handleDelete,
    },
  ]}
  emptyMessage="No feed sources configured yet."
/>
