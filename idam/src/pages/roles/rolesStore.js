import { useSyncExternalStore } from 'react'
import { ROLES } from '../../data/seed'
import { decorate } from './roleModel'

/**
 * The role catalog.
 *
 * Shared by the list, the add form, the edit form and the record, which are
 * four screens now — a role created on one has to exist on the others.
 */

const listeners = new Set()
let state = ROLES.map(decorate)

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const emit = () => listeners.forEach((l) => l())

export const getRoles = () => state
export const writeRoles = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}
export const useRoles = () => useSyncExternalStore(subscribe, getRoles, getRoles)

export const roleByKey = (rows, key) => rows.find((r) => String(r.id) === String(key)) || null

export const patchRole = (id, changes) => writeRoles(
  (rs) => rs.map((r) => (String(r.id) === String(id) ? { ...r, ...changes } : r)),
)

export const dropRoles = (ids) => {
  const set = new Set(ids.map(String))
  writeRoles((rs) => rs.filter((r) => !set.has(String(r.id))))
}
