import type { APIRoute } from "astro"
import { eq } from "drizzle-orm"

import { isAdmin } from "@/lib/auth/is-admin"
import { db } from "@/lib/db/client"
import { clustersTable } from "@/lib/db/schemas"

const forbidden = () => Response.json({ error: "Forbidden" }, { status: 403 })

export const GET: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals.user)) return forbidden()

  const { id } = params
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 })
  }

  const cluster = await db.query.clustersTable.findFirst({
    where: eq(clustersTable.id, id),
  })

  if (!cluster) {
    return Response.json({ error: "Cluster not found" }, { status: 404 })
  }

  return Response.json(cluster)
}
