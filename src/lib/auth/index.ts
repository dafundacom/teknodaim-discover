import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"
import { db } from "@/lib/db/client"
import * as schema from "@/lib/db/schemas"
import { authUrl, googleClientSecret, publicGoogleClientId } from "@/lib/env"
import { ac, roles } from "./permission"

export const auth = betterAuth({
  baseURL: authUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.usersTable,
      session: schema.sessionsTable,
      account: schema.accountsTable,
      verification: schema.verificationsTable,
    },
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: publicGoogleClientId,
      clientSecret: googleClientSecret,
      redirectURI: `${authUrl}/api/auth/callback/google`,
    },
  },
  plugins: [
    admin({
      ac,
      roles,
      defaultRole: "user",
    }),
  ],
})
