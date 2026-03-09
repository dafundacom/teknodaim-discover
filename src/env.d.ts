/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="astro/astro-jsx" />

type BetterAuthUser = import("better-auth").User

interface User extends BetterAuthUser {
  role?: string | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: Date | null
}

// biome-ignore lint/style/noNamespace: Astro requires namespace declaration
declare namespace App {
  interface Locals {
    user: User | null
    session: import("better-auth").Session | null
  }
}
