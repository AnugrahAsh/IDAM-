import { ROLES, ROLE_PERMS } from '../data/seed'
import { migrateGrants } from '../data/permissionCatalog'

/**
 * Role-based access for the console shell.
 *
 * The console already carries a full permission register and a grant map per
 * role; what it lacked was a way for a screen to ask "may the signed-in
 * identity do this?". Pages that fold an administrative surface into the page
 * it publishes to — the Notification Center and Quick Links both do — need
 * exactly that question answered before they render a Manage affordance.
 *
 * Grants run through `migrateGrants` so a role authored against an older
 * module name still resolves after a rename.
 */

const cache = new Map()

export const grantsFor = (roleId) => {
  const key = String(roleId)
  if (!cache.has(key)) cache.set(key, migrateGrants(ROLE_PERMS[roleId] || {}))
  return cache.get(key)
}

export const roleFor = (roleId) => ROLES.find((r) => String(r.id) === String(roleId)) || ROLES[0]

/**
 * `can(grants, module)` asks whether the module is reachable at all;
 * `can(grants, module, perm)` asks for one named permission, and an array of
 * permissions is read as "any of these".
 */
export const can = (grants, module, perm) => {
  const held = grants[module]
  if (!held || !held.length) return false
  if (!perm) return true
  if (Array.isArray(perm)) return perm.some((p) => held.includes(p))
  return held.includes(perm)
}

/** Selectable roles for the "view as" switch in the account menu. */
export const ROLE_OPTIONS = ROLES.map((r) => ({ id: r.id, name: r.name, description: r.description }))
