<script lang="ts">
import AdminTable from "@/components/admin/admin-table.svelte"
import ConfirmDialog from "@/components/ui/confirm-dialog.svelte"
import { toast } from "svelte-sonner"
interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  articleCount: number
}

let {
  categories,
}: {
  categories: CategoryRow[]
} = $props()

let confirmDialog = $state<ConfirmDialog>()

async function handleDelete(row: CategoryRow) {
  const confirmed = await confirmDialog?.showConfirm({
    title: "Delete Category",
    description: `Are you sure you want to delete "${row.name}"? This action cannot be undone.`,
    confirmText: "Delete",
    confirmVariant: "destructive",
    cancelText: "Cancel",
  })

  if (!confirmed) return

  const res = await fetch(`/api/admin/categories/${row.id}`, {
    method: "DELETE",
  })

  if (res.ok) {
    toast.success("Category deleted successfully")
    window.location.reload()
  } else {
    const error = await res.text()
    toast.error(error || "Failed to delete category")
  }
}
</script>

<ConfirmDialog bind:this={confirmDialog} />

<AdminTable
  columns={[
    { key: "name", label: "Name", sortable: true },
    { key: "slug", label: "Slug" },
    { key: "articleCount", label: "Articles", sortable: true },
  ]}
  rows={categories}
  actions={[
    {
      label: "Delete",
      variant: "destructive",
      onClick: handleDelete,
    },
  ]}
  emptyMessage="No categories created yet."
/>
