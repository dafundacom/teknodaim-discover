<script lang="ts">
import { Image } from "@unpic/svelte"
import { authClient } from "@/lib/auth/client"
import { userStore } from "@/stores/user"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/ui/theme-toggle.svelte"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

let user = $state(userStore.get())
let isOnAdminPage = $state(false)

$effect(() => {
  return userStore.subscribe((u) => {
    user = u
  })
})

$effect(() => {
  isOnAdminPage =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin")
})

async function handleSignIn() {
  const result = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
  })
  if (result.data?.url) {
    window.location.href = result.data.url
  }
}

async function handleSignOut() {
  await authClient.signOut()
  window.location.href = "/"
}
</script>

{#if user}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#if user.image}
        <Image
          src={user.image}
          alt={user.name ?? "User"}
          layout="fixed"
          width={32}
          height={32}
          class="size-8 rounded-full"
          referrerpolicy="no-referrer"
        />
      {:else}
        <div
          class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
        >
          {(user.name ?? user.email).charAt(0).toUpperCase()}
        </div>
      {/if}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel>
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-medium">{user.name ?? "User"}</span>
          <span class="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <a href="/library" class="w-full">My Library</a>
      </DropdownMenuItem>
      {#if user?.role === "admin" && !isOnAdminPage}
        <DropdownMenuItem>
          <a href="/admin" class="w-full">Admin</a>
        </DropdownMenuItem>
      {/if}
      <DropdownMenuSeparator />
      <ThemeToggle />
      {#if user.role === "admin"}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <a href="/api/internal/pipeline/run" class="w-full">
            Run Pipeline
          </a>
        </DropdownMenuItem>
      {/if}
      <DropdownMenuSeparator />
      <DropdownMenuItem onclick={handleSignOut}>
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
{:else}
  <Button variant="outline" size="sm" onclick={handleSignIn}>
    Sign in
  </Button>
{/if}
