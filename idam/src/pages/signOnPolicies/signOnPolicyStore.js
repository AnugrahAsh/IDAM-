import { useSyncExternalStore } from 'react'
import { ME, nextId } from '../../data/seed'
import { stampText } from '../../lib/clock'
import { seedPolicies } from './signOnPolicyData'

/**
 * The sign-on policy register.
 *
 * Shared by the list, the policy forms, the record and the rule builder — a
 * rule saved on its own page has to be on the record's Rules tab when the
 * builder hands back.
 *
 * Each writer names the endpoint it stands in for, with the casing
 * normalised: the previous console called `/signOnPolicy/...` for most
 * operations and `/signonpolicy/...` for edits, which breaks behind any
 * case-sensitive proxy.
 */

const listeners = new Set()
let state = seedPolicies()

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const emit = () => listeners.forEach((l) => l())

export const getPolicies = () => state
export const writePolicies = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}
export const usePolicies = () => useSyncExternalStore(subscribe, getPolicies, getPolicies)

export const policyByKey = (rows, key) => rows.find((p) => String(p.id) === String(key)) || null

const touched = (p) => ({ ...p, modifiedOn: stampText(), modifiedBy: ME.username })

const mapPolicy = (id, fn) => writePolicies(
  (ps) => ps.map((p) => (String(p.id) === String(id) ? touched(fn(p)) : p)),
)

const nextRuleId = () => state.reduce((m, p) => p.rules.reduce((n, r) => Math.max(n, r.id), m), 0) + 1
const nextMappingId = () => state.reduce((m, p) => p.applications.reduce((n, a) => Math.max(n, a.mappingId), m), 0) + 1

const placed = (rules, rule, priority) => {
  const out = [...rules]
  out.splice(Math.max(0, Math.min(priority - 1, out.length)), 0, rule)
  return out
}

// POST /signOnPolicy/add { name, description }
export const insertPolicy = (draft) => {
  const id = nextId(state)
  writePolicies((ps) => [...ps, {
    id,
    name: draft.name,
    description: draft.description,
    status: draft.status,
    createdOn: stampText(),
    createdBy: ME.username,
    modifiedOn: null,
    modifiedBy: null,
    rules: [],
    applications: [],
  }])
  return id
}

// PUT /signOnPolicy/update { policyId, name, description, isActive }
export const updatePolicy = (id, changes) => mapPolicy(id, (p) => ({ ...p, ...changes }))

export const setPolicyStatus = (ids, status) => {
  const set = new Set(ids.map(String))
  writePolicies((ps) => ps.map((p) => (set.has(String(p.id)) && p.status !== status ? touched({ ...p, status }) : p)))
}

// DELETE /signOnPolicy/delete { policyId }
export const deletePolicies = (ids) => {
  const set = new Set(ids.map(String))
  writePolicies((ps) => ps.filter((p) => !set.has(String(p.id))))
}

// POST /signOnPolicy/rules/add — then PATCH .../rules/reorder when the rule is
// not placed last, because the add endpoint takes no priority.
export const insertRule = (policyId, rule, priority) => {
  const id = nextRuleId()
  mapPolicy(policyId, (p) => ({ ...p, rules: placed(p.rules, { ...rule, id }, priority) }))
  return id
}

// No rule update endpoint was observed in the audited console; the edit screen
// reuses the add form. Stands in for whichever call replaces a rule in place.
export const replaceRule = (policyId, ruleId, rule, priority) => mapPolicy(policyId, (p) => {
  const current = p.rules.find((r) => r.id === ruleId)
  if (!current) return p
  const rest = p.rules.filter((r) => r.id !== ruleId)
  return { ...p, rules: placed(rest, { ...current, ...rule, id: ruleId }, priority) }
})

// DELETE /signOnPolicy/rules/delete { policyId, ruleId }
export const deleteRule = (policyId, ruleId) => mapPolicy(policyId, (p) => ({ ...p, rules: p.rules.filter((r) => r.id !== ruleId) }))

// PATCH /signOnPolicy/{policyId}/rules/reorder { ruleIds }
export const reorderRules = (policyId, ruleIds) => mapPolicy(policyId, (p) => {
  const byId = new Map(p.rules.map((r) => [r.id, r]))
  const ordered = ruleIds.map((id) => byId.get(id)).filter(Boolean)
  // A rule added since the order was drafted keeps its place at the end.
  return { ...p, rules: [...ordered, ...p.rules.filter((r) => !ruleIds.includes(r.id))] }
})

// POST /signOnPolicy/applications/add { policyId, application } — once per application
export const attachApplications = (policyId, appIds) => {
  let mappingId = nextMappingId()
  mapPolicy(policyId, (p) => {
    const held = new Set(p.applications.map((m) => String(m.appId)))
    const added = appIds
      .filter((appId) => !held.has(String(appId)))
      .map((appId) => ({ appId, mappingId: mappingId++, attachedOn: stampText(), attachedBy: ME.username }))
    return { ...p, applications: [...p.applications, ...added] }
  })
}

// DELETE /signOnPolicy/applications/delete { mappingId } — once per mapping
export const detachApplications = (policyId, mappingIds) => {
  const set = new Set(mappingIds.map(String))
  mapPolicy(policyId, (p) => ({ ...p, applications: p.applications.filter((m) => !set.has(String(m.mappingId))) }))
}
