<script lang="ts" module>
export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  confirmVariant?: "default" | "destructive"
  cancelText?: string
}
</script>

<script lang="ts">
  import Button from "@/components/ui/button/button.svelte"
  import * as Dialog from "@/components/ui/dialog"

  let open = $state(false)
  let resolvePromise: ((value: boolean) => void) | null = null

  let options: ConfirmOptions = $state({
    title: "",
    description: "",
    confirmText: "Confirm",
    confirmVariant: "default",
    cancelText: "Cancel",
  })

  export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
    options = {
      confirmText: "Confirm",
      confirmVariant: "default",
      cancelText: "Cancel",
      ...opts,
    }
    open = true
    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    open = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleCancel() {
    open = false
    resolvePromise?.(false)
    resolvePromise = null
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{options.title}</Dialog.Title>
      {#if options.description}
        <Dialog.Description>{options.description}</Dialog.Description>
      {/if}
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={handleCancel}>
        {options.cancelText}
      </Button>
      <Button
        variant={options.confirmVariant}
        onclick={handleConfirm}
      >
        {options.confirmText}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
