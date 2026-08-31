import { useSyncExternalStore } from 'react'
import { ATTRS, SECTIONS } from '../../data/seed'

/**
 * The identity schema.
 *
 * An attribute defined in Configurations is not a fact about the Configurations
 * screen: it has to appear on the Add/Edit User form, in the Users column
 * configurator, in the Users filter, in the Dynamic Policy attribute list and
 * in the employee-type applicability matrix — without a deploy. That is only
 * possible if all six surfaces read the same live registry, which is what this
 * is.
 *
 * Seeded from the shipped schema; the shipped definitions stay exported from
 * the seed for the surfaces that only need the platform baseline.
 */

const listeners = new Set()
let state = { attrs: ATTRS.map((a) => ({ ...a })), sections: SECTIONS.map((s) => ({ ...s })) }

const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

/** Module-scope subscription, for derived registries that are not components. */
export const subscribeSchema = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export const getSchema = () => state

export const writeSchema = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}

export const setAttrs = (next) => writeSchema((s) => ({
  ...s, attrs: typeof next === 'function' ? next(s.attrs) : next,
}))

export const setSections = (next) => writeSchema((s) => ({
  ...s, sections: typeof next === 'function' ? next(s.sections) : next,
}))

export const useSchema = () => useSyncExternalStore(subscribe, getSchema, getSchema)

/** Every defined attribute, in form order within its section. */
export const useAttrs = () => useSyncExternalStore(
  subscribe, () => state.attrs, () => state.attrs,
)

export const useSections = () => useSyncExternalStore(
  subscribe, () => state.sections, () => state.sections,
)

export const attrs = () => state.attrs
export const sections = () => state.sections

/** Attributes an administrator may see at all. `Hide` means hide. */
export const visibleAttrs = (list = state.attrs) => list.filter((a) => a.adminPerm !== 'Hide')

/** Attributes offered as a directory column. */
export const columnAttrs = (list = state.attrs) => visibleAttrs(list)

/** Attributes a filter or a policy condition may be written against.
 *  Free text bodies are excluded: nobody filters on a postal address. */
export const filterableAttrs = (list = state.attrs) => visibleAttrs(list).filter((a) => a.type !== 'textarea')

export const attrById = (id, list = state.attrs) => list.find((a) => a.id === id)

/** Form order: section order, then the attribute's own order. */
export const orderedAttrs = (sectionId, list = state.attrs) => list
  .filter((a) => a.section === sectionId)
  .sort((a, b) => (a.order || 0) - (b.order || 0))
