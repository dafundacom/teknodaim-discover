<script lang="ts">
import AdminTable from "@/components/admin/admin-table.svelte"
import ConfirmDialog from "@/components/ui/confirm-dialog.svelte"
import { toast } from "svelte-sonner"
import type { SelectCluster } from "@/lib/db/schemas/clusters"

type ClusterRow = SelectCluster

let {
  clusters,
}: {
  clusters: ClusterRow[]
} = $props()

let confirmDialog = $state<ConfirmDialog>()

async function handleEdit(row: ClusterRow) {
  const res = await fetch(`/api/admin/clusters/${row.id}`)
  if (!res.ok) return
  const cluster = await res.json()

  const form = document.getElementById("cluster-form")
  if (form) {
    form.scrollIntoView({ behavior: "smooth" })
    form.dispatchEvent(new CustomEvent("loadCluster", { detail: cluster }))
  }
}

async function handleDelete(row: ClusterRow) {
  const confirmed = await confirmDialog?.showConfirm({
    title: "Delete Cluster",
    description: `Are you sure you want to delete "${row.topic}"? This action cannot be undone.`,
    confirmText: "Delete",
    confirmVariant: "destructive",
    cancelText: "Cancel",
  })

  if (!confirmed) return

  const res = await fetch("/api/admin/clusters", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: row.id }),
  })

  if (res.ok) {
    toast.success("Cluster deleted successfully")
    window.location.reload()
  } else {
    const error = await res.text()
    toast.error(error || "Failed to delete cluster")
  }
}
</script>

<ConfirmDialog bind:this={confirmDialog} />

<AdminTable
  columns={[
    { key: "topic", label: "Topic", sortable: true },
    {
      key: "keywords",
      label: "Keywords",
      render: (row) => row.keywords.join(", "),
    },
    {
      key: "aiModel",
      label: "AI Model",
      render: (row) => row.aiModel ?? "Not set",
    },
  ]}
  rows={clusters}
  actions={[
    {
      label: "Edit",
      onClick: handleEdit,
    },
    {
      label: "Delete",
      variant: "destructive",
      onClick: handleDelete,
    },
  ]}
  emptyMessage="No clusters created yet."
/>
