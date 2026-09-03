import { useSyncExternalStore } from 'react'
import { USERS } from '../../data/seed'

/**
 * The identity register.
 *
 * The list, the add screen, the edit screen and the record view are four
 * separate screens now, and all four read and write the same identities. Held
 * in component state on the list, a user created on the add screen was lost the
 * moment the list unmounted — so the collection lives here and every screen
 * subscribes to it.
 */

const listeners = new Set()
let state = USERS

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const emit = () => listeners.forEach((l) => l())

export const getUsers = () => state

export const writeUsers = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}

export const useUsers = () => useSyncExternalStore(subscribe, getUsers, getUsers)

export const userByKey = (rows, key) => rows.find(
  (u) => String(u.id) === String(key) || u.username === key,
) || null

/** Applies a patch to one identity, wherever it is read from. */
export const patchUser = (id, patch) => writeUsers(
  (rows) => rows.map((r) => (String(r.id) === String(id) ? { ...r, ...patch } : r)),
)

export const removeUsers = (ids) => {
  const set = new Set(ids.map(String))
  writeUsers((rows) => rows.filter((r) => !set.has(String(r.id))))
}
