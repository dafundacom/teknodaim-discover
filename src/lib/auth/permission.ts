import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

const statement = {
  ...defaultStatements,
  comment: ["moderate", "delete"],
  profile: ["view", "update"],
} as const

export const ac = createAccessControl(statement)

export const roles = {
  admin: ac.newRole({
    ...adminAc.statements,
    comment: ["moderate", "delete"],
    profile: ["view", "update"],
  }),
  user: ac.newRole({
    comment: [],
    profile: ["view", "update"],
  }),
}
