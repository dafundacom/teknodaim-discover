<script lang="ts">
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const STORAGE_KEY = "admin-sidebar-open"

function getInitialState(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) {
    return stored === "true"
  }
  // Default: open on desktop (lg+), closed on mobile
  return window.innerWidth >= 1024
}

function updateSidebarState(isOpen: boolean) {
  const sidebar = document.getElementById("admin-sidebar")
  if (!sidebar) return

  if (isOpen) {
    sidebar.classList.remove("-ml-64")
    sidebar.classList.add("lg:ml-0")
  } else {
    sidebar.classList.add("-ml-64")
    sidebar.classList.remove("lg:ml-0")
  }
}

let isOpen = $state(getInitialState())

// Apply initial state
$effect(() => {
  updateSidebarState(isOpen)
})

function toggleSidebar() {
  isOpen = !isOpen
  localStorage.setItem(STORAGE_KEY, String(isOpen))
  updateSidebarState(isOpen)
}

// Handle resize
function handleResize() {
  const isDesktop = window.innerWidth >= 1024
  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored === null) {
    // No stored preference, use default based on screen size
    isOpen = isDesktop
    updateSidebarState(isOpen)
  }
}

$effect(() => {
  window.addEventListener("resize", handleResize)
  return () => {
    window.removeEventListener("resize", handleResize)
  }
})
</script>

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <Button
        variant="ghost"
        size="icon"
        onclick={toggleSidebar}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {#if isOpen}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m16 15-3-3 3-3" />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m14 9 3 3-3 3" />
          </svg>
        {/if}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <p>{isOpen ? "Close sidebar" : "Open sidebar"}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
