import { ATTRS, LOOKUPS, ORGANIZATIONS, USERS } from '../../data/seed'
import { MULTI_LOOKUPS } from '../configurations/configData'
import { dateText } from '../../lib/clock'

export const fullName = (u) => `${u.firstName} ${u.lastName}`

export const KINDS = [
  { value: 'organization', label: 'Organization' },
  { value: 'unit', label: 'Department / unit' },
]

/* Level names, attribute labels and lookup keys are written in three different
   casings across the schema ("Business unit", `business_unit`, `businessUnit`).
   Comparing them on a slug is what lets a level find its attribute without a
   hand-maintained table that would fall out of date the moment a tenant adds a
   level of its own. */
const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const SAMPLE = USERS[0] || {}

/**
 * The lookup attributes a hierarchy level may be bound to.
 *
 * A level of the multi-level lookup only names a tier — "site". What supplies
 * the node its data is an attribute backed by a single-level lookup, because
 * that is the field an identity actually carries and therefore the only thing
 * a unit can be matched on. An attribute that no identity stores is excluded:
 * binding to it would produce a tree of one empty node.
 */
export const LOOKUP_ATTRS = ATTRS.filter((a) => a.src && LOOKUPS[a.src] && a.id in SAMPLE)

export const attrById = (id) => LOOKUP_ATTRS.find((a) => a.id === id) || null

export const lookupById = (id) => MULTI_LOOKUPS.find((m) => String(m.id) === String(id)) || null

/** The attribute a level binds to unless the operator has chosen another. */
export const defaultAttrFor = (level) => {
  const l = slug(level)
  return LOOKUP_ATTRS.find((a) => slug(a.label) === l)
    || LOOKUP_ATTRS.find((a) => slug(a.src) === l)
    || null
}

export const defaultBindings = (lookupId) => {
  const lk = lookupById(lookupId)
  if (!lk) return {}
  const out = {}
  lk.levels.forEach((lv) => {
    const a = defaultAttrFor(lv)
    if (a) out[lv] = a.id
  })
  return out
}

/** The levels of a hierarchy paired with the attribute each one reads. */
export const levelsOf = (h) => {
  const lk = h && lookupById(h.lookupId)
  if (!lk) return []
  return lk.levels.map((level) => ({ level, attr: attrById((h.bindings || {})[level]) }))
}

export const emptyOverrides = () => ({ added: [], edits: {}, removed: [] })

export const ROOT_NAME = (ORGANIZATIONS.find((o) => !o.parent) || ORGANIZATIONS[0] || {}).name || 'Tenant'

export const UNASSIGNED = 'Unassigned'

export const HIERARCHIES = [
  {
    id: 1,
    name: 'Operating hierarchy',
    description: 'Region, business unit and site — the structure identity scoping is evaluated against.',
    lookupId: 1,
    bindings: defaultBindings(1),
    unassigned: true,
    updated: '2026-06-18',
    overrides: emptyOverrides(),
  },
  {
    id: 2,
    name: 'Workplace hierarchy',
    description: 'Office level over department, as Human Resources maintains it.',
    lookupId: 3,
    bindings: defaultBindings(3),
    unassigned: false,
    updated: '2026-04-21',
    overrides: emptyOverrides(),
  },
]

/**
 * Project the identity population through a hierarchy's levels.
 *
 * The tree is not a register: every derived node is one distinct value of the
 * attribute bound to that level, and an identity sits in exactly the node its
 * own attribute values lead to. That is what makes the structure reproducible —
 * rebuild it and you get the same tree, because the tree was never stored.
 *
 * Node ids encode the path rather than an index, so a unit keeps its id across
 * a rebuild and the overrides layered on it keep pointing at the right node.
 */
export function buildTree(h) {
  const root = {
    id: 'root',
    name: ROOT_NAME,
    kind: 'organization',
    levelLabel: 'Tenant root',
    status: 'Active',
    members: [],
    children: [],
    derived: true,
  }

  const levels = levelsOf(h).filter((l) => l.attr)
  if (!levels.length) return root

  const place = (parent, pool, depth) => {
    if (depth >= levels.length) {
      parent.members = pool
      return
    }
    const { attr, level } = levels[depth]
    const groups = new Map()
    pool.forEach((u) => {
      const raw = u[attr.id]
      const key = raw == null || String(raw).trim() === ''
        ? (h.unassigned ? UNASSIGNED : null)
        : String(raw)
      if (key === null) return
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(u)
    })
    ;[...groups.keys()].sort((a, b) => a.localeCompare(b)).forEach((k) => {
      const node = {
        id: `${parent.id}/${encodeURIComponent(k)}`,
        name: k,
        kind: depth === 0 ? 'organization' : 'unit',
        levelLabel: attr.label,
        level,
        status: 'Active',
        members: [],
        children: [],
        derived: true,
      }
      parent.children.push(node)
      place(node, groups.get(k), depth + 1)
    })
  }

  place(root, USERS, 0)
  return root
}

/**
 * Lay the operator's own changes over the projection.
 *
 * A unit added, renamed or removed by hand is kept as an override rather than
 * written into the tree, because the tree is rebuilt from the lookup every time
 * the source changes. Storing the edit separately is the only way both facts
 * survive: the lookup stays the source of the shape, and the hand-made change
 * is not silently lost on the next rebuild.
 */
export function applyOverrides(root, ov = emptyOverrides()) {
  const removed = new Set(ov.removed || [])
  const edits = ov.edits || {}
  const byParent = new Map()
  ;(ov.added || []).forEach((n) => {
    const list = byParent.get(n.parentId) || []
    list.push(n)
    byParent.set(n.parentId, list)
  })

  const visit = (node) => {
    const out = { ...node, ...(edits[node.id] || {}), children: [] }
    node.children.forEach((c) => { if (!removed.has(c.id)) out.children.push(visit(c)) })
    ;(byParent.get(node.id) || []).forEach((n) => {
      if (removed.has(n.id)) return
      out.children.push(visit({ ...n, levelLabel: 'Added by hand', members: [], children: [], derived: false }))
    })
    return out
  }

  return visit(root)
}

/** Ids present in a projection, used to tell a stranded override from a live one. */
export const idsIn = (node, acc = new Set()) => {
  acc.add(node.id)
  node.children.forEach((c) => idsIn(c, acc))
  return acc
}

/**
 * How a hierarchy's hand-made changes fare against a given projection.
 *
 * "Stranded" is the honest word for an override whose parent no longer exists
 * in the source: it is not deleted, it simply has nowhere to hang until the
 * source produces that parent again.
 */
export function overrideReport(h, derivedRoot) {
  const ov = h.overrides || emptyOverrides()
  const live = idsIn(derivedRoot)
  const addedIds = new Set((ov.added || []).map((n) => n.id))
  const attaches = (n) => live.has(n.parentId) || addedIds.has(n.parentId)
  const stranded = (ov.added || []).filter((n) => !attaches(n)).length
  const renamed = Object.keys(ov.edits || {}).filter((id) => live.has(id)).length
  const hidden = (ov.removed || []).filter((id) => live.has(id)).length
  return {
    added: (ov.added || []).length,
    stranded,
    renamed,
    hidden,
    total: (ov.added || []).length + Object.keys(ov.edits || {}).length + (ov.removed || []).length,
  }
}

/** Units and depth a projection produces, for the before/after read in Configure. */
export function measure(root) {
  let units = 0
  let depth = 0
  let users = 0
  const walk = (n, d) => {
    units += 1
    users += n.members.length
    if (d > depth) depth = d
    n.children.forEach((c) => walk(c, d + 1))
  }
  walk(root, 0)
  return { units, depth: depth + 1, users }
}

export const today = () => dateText()
