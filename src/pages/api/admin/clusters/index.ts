import type { APIRoute } from "astro"
import { eq } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { aiModelEnum, clustersTable } from "@/lib/db/schemas"
import { createCustomId } from "@/lib/utils/custom-id"

const forbidden = () => Response.json({ error: "Forbidden" }, { status: 403 })

const validateAIModel = (model: string | null | undefined): string | null => {
  if (!model) return null
  if (!aiModelEnum.includes(model as (typeof aiModelEnum)[number])) {
    return null
  }
  return model
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals.user)) return forbidden()

  const clusters = await db.query.clustersTable.findMany({
    orderBy: [clustersTable.topic],
  })
  return Response.json(clusters)
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals.user)) return forbidden()
  const body = await request.json()
  const { topic, keywords, aiModel } = body

  if (!topic) {
    return Response.json({ error: "topic is required" }, { status: 400 })
  }

  const validatedModel = validateAIModel(aiModel)
  if (aiModel && !validatedModel) {
    return Response.json(
      {
        error: `Invalid aiModel. Must be one of: ${aiModelEnum.join(", ")}`,
      },
      { status: 400 },
    )
  }

  const [cluster] = await db
    .insert(clustersTable)
    .values({
      id: createCustomId(),
      topic,
      keywords: keywords ?? [],
      aiModel: validatedModel,
    })
    .returning()

  return Response.json(cluster, { status: 201 })
}

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals.user)) return forbidden()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  if (updates.aiModel !== undefined) {
    const validatedModel = validateAIModel(updates.aiModel)
    if (updates.aiModel && !validatedModel) {
      return Response.json(
        {
          error: `Invalid aiModel. Must be one of: ${aiModelEnum.join(", ")}`,
        },
        { status: 400 },
      )
    }
    updates.aiModel = validatedModel
  }

  const [updated] = await db
    .update(clustersTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(clustersTable.id, id))
    .returning()

  if (!updated) {
    return Response.json({ error: "Cluster not found" }, { status: 404 })
  }

  return Response.json(updated)
}

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals.user)) return forbidden()
  const body = await request.json()
  const { id } = body

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  await db.delete(clustersTable).where(eq(clustersTable.id, id))

  return Response.json({ deleted: true })
}
