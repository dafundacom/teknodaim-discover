import type { APIRoute } from "astro"
import { Result } from "better-result"
import { z } from "zod"

import { generateApiKey, generateApiKeyId, hashApiKey } from "@/lib/api-keys"
import { createApiKey, getApiKeysByUserId } from "@/lib/db/queries/api-keys"

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

export const GET: APIRoute = async (context) => {
  const user = context.locals.user

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const result = await Result.tryPromise({
    try: async () => {
      const keys = await getApiKeysByUserId(user.id)

      return keys.map((key) => ({
        id: key.id,
        name: key.name,
        isActive: key.isActive,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      }))
    },
    catch: (e) =>
      new Error(
        `Failed to fetch API keys: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(result)) {
    console.error("Error fetching API keys:", result.error)
    return new Response(JSON.stringify({ error: "Failed to fetch API keys" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify(result.value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const bodyResult = await Result.tryPromise({
    try: () => context.request.json(),
    catch: () => new Error("Failed to parse request body"),
  })

  if (Result.isError(bodyResult)) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const parsed = createApiKeySchema.safeParse(bodyResult.value)

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: parsed.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const { name } = parsed.data
  const apiKey = generateApiKey()
  const keyHash = hashApiKey(apiKey)
  const keyId = generateApiKeyId()
  const defaultName = `API Key ${new Date().toLocaleDateString()}`

  const createResult = await Result.tryPromise({
    try: async () => {
      await createApiKey({
        id: keyId,
        userId: user.id,
        name: name ?? defaultName,
        keyHash,
        isActive: true,
      })
    },
    catch: (e) =>
      new Error(
        `Failed to create API key: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(createResult)) {
    console.error("Error creating API key:", createResult.error)
    return new Response(JSON.stringify({ error: "Failed to create API key" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({
      id: keyId,
      name: name ?? defaultName,
      key: apiKey,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    },
  )
}
