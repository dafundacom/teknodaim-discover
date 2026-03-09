import { adminClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/svelte"
import { publicSiteUrl } from "@/lib/env"
import { ac, roles } from "./permission"

const baseURL =
  typeof window !== "undefined" ? window.location.origin : publicSiteUrl

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    adminClient({
      ac,
      roles,
      defaultRole: "user",
    }),
  ],
})
