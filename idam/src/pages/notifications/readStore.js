import { useSyncExternalStore } from 'react'

/**
 * Which notifications the signed-in identity has read.
 *
 * The unread badge in the navigation and the UNREAD tile on the register have
 * to agree with each other and with what the operator has actually opened, so
 * read state lives in one place rather than being recomputed from the seed on
 * each screen. Persisted, because a badge that reappears on every reload reads
 * as broken.
 */

const KEY = 'tf-idam-notifications-read'

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

const listeners = new Set()
let state = load()

const emit = () => {
  try { localStorage.setItem(KEY, JSON.stringify([...state])) } catch { /* storage unavailable */ }
  listeners.forEach((l) => l())
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

export const getRead = () => state
export const isRead = (id) => state.has(String(id))

export const markRead = (ids) => {
  const next = new Set(state)
  ;[].concat(ids).forEach((id) => next.add(String(id)))
  state = next
  emit()
}

export const markUnread = (ids) => {
  const next = new Set(state)
  ;[].concat(ids).forEach((id) => next.delete(String(id)))
  state = next
  emit()
}

export const useRead = () => useSyncExternalStore(subscribe, getRead, getRead)

/** Applies read state to a list of notifications carrying a seed `unread` flag. */
export const withRead = (rows, read = state) => rows.map((r) => ({
  ...r,
  unread: r.unread && !read.has(String(r.id)),
}))
