import type { APIRoute } from "astro"
import { Result } from "better-result"
import { z } from "zod"

import {
  deleteApiKeyByUserId,
  getApiKeyById,
  renameApiKey,
  toggleApiKeyStatus,
} from "@/lib/db/queries/api-keys"

const renameSchema = z.object({
  name: z.string().min(1).max(100),
})

const statusSchema = z.object({
  isActive: z.boolean(),
})

export const PATCH: APIRoute = async (context) => {
  const user = context.locals.user
  const keyId = context.params.id

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!keyId) {
    return new Response(JSON.stringify({ error: "Key ID required" }), {
      status: 400,
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

  const body = bodyResult.value

  if ("name" in body) {
    const parsed = renameSchema.safeParse(body)
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

    const keyResult = await Result.tryPromise({
      try: () => getApiKeyById(keyId),
      catch: () => new Error("Database error"),
    })

    if (Result.isError(keyResult) || !keyResult.value) {
      return new Response(JSON.stringify({ error: "Key not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const key = keyResult.value

    if (key.userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const updatedResult = await Result.tryPromise({
      try: () => renameApiKey(keyId, user.id, parsed.data.name),
      catch: (e) =>
        new Error(
          `Failed to rename key: ${e instanceof Error ? e.message : "Unknown error"}`,
        ),
    })

    if (Result.isError(updatedResult)) {
      return new Response(
        JSON.stringify({ error: updatedResult.error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const updatedKey = updatedResult.value

    return new Response(
      JSON.stringify({
        id: updatedKey?.id,
        name: updatedKey?.name,
        isActive: updatedKey?.isActive,
        createdAt: updatedKey?.createdAt,
        lastUsedAt: updatedKey?.lastUsedAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  if ("isActive" in body) {
    const parsed = statusSchema.safeParse(body)
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

    const keyResult = await Result.tryPromise({
      try: () => getApiKeyById(keyId),
      catch: () => new Error("Database error"),
    })

    if (Result.isError(keyResult) || !keyResult.value) {
      return new Response(JSON.stringify({ error: "Key not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const key = keyResult.value

    if (key.userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const updatedResult = await Result.tryPromise({
      try: () => toggleApiKeyStatus(keyId, user.id, parsed.data.isActive),
      catch: (e) =>
        new Error(
          `Failed to update key status: ${e instanceof Error ? e.message : "Unknown error"}`,
        ),
    })

    if (Result.isError(updatedResult)) {
      return new Response(
        JSON.stringify({ error: updatedResult.error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const updatedKey = updatedResult.value

    return new Response(
      JSON.stringify({
        id: updatedKey?.id,
        name: updatedKey?.name,
        isActive: updatedKey?.isActive,
        createdAt: updatedKey?.createdAt,
        lastUsedAt: updatedKey?.lastUsedAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  return new Response(JSON.stringify({ error: "Invalid request body" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  })
}

export const DELETE: APIRoute = async (context) => {
  const user = context.locals.user
  const keyId = context.params.id

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!keyId) {
    return new Response(JSON.stringify({ error: "Key ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const keyResult = await Result.tryPromise({
    try: () => getApiKeyById(keyId),
    catch: () => new Error("Database error"),
  })

  if (Result.isError(keyResult) || !keyResult.value) {
    return new Response(JSON.stringify({ error: "Key not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const key = keyResult.value

  if (key.userId !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const deleteResult = await Result.tryPromise({
    try: () => deleteApiKeyByUserId(keyId, user.id),
    catch: (e) =>
      new Error(
        `Failed to delete key: ${e instanceof Error ? e.message : "Unknown error"}`,
      ),
  })

  if (Result.isError(deleteResult)) {
    console.error("Error deleting API key:", deleteResult.error)
    return new Response(JSON.stringify({ error: "Failed to delete API key" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const deleted = deleteResult.value

  if (!deleted) {
    return new Response(JSON.stringify({ error: "Key not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
