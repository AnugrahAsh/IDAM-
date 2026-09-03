import { PERMISSION_CATALOG, bandPerms, isWritePerm } from '../data/permissionCatalog'

export { isWritePerm, bandPerms, PERMISSION_CATALOG }

/**
 * Kept as a `has`-shaped value so the pickers read the same either way:
 * membership of "the write set" is a question about the verb, not a lookup in
 * a hand-maintained list that would drift the moment a permission is added.
 */
export const WRITE_PERMS = { has: isWritePerm }

export const permTotal = (catalog) => catalog.reduce((a, m) => a + m.perms.length, 0)

export const permCount = (catalog, granted) => catalog.reduce((a, m) => {
  const held = granted[m.name] || []
  return a + held.filter((p) => m.perms.includes(p)).length
}, 0)

/** Bands across a whole catalogue — used by the read-only permission matrix. */
export const permGroups = (catalog) => {
  const present = []
  const seen = new Set()
  catalog.forEach((m) => m.perms.forEach((p) => {
    if (!seen.has(p)) { seen.add(p); present.push(p) }
  }))
  return bandPerms(present)
}

/** Bands within one module — used by the role permission picker. */
export const permBands = (perms) => bandPerms(perms)
