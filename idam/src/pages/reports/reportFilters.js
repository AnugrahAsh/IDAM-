/**
 * The report filter model.
 *
 * One generic field set — a date and a user box — either over-filters a report
 * that holds richer data or asks for data the report never carried. So a report
 * declares the filters it can honestly answer, and this module turns that
 * declaration into matching, chips and counts. One engine, a different field
 * set per report.
 *
 * A spec is:
 *   { id, label, type, ... }
 *     type 'dateRange' — value { from, to }, compared against `field` (default `ts`)
 *     type 'text'      — value string, matched as a substring across `fields`
 *     type 'select'    — value string, compared for equality against `field`
 *     type 'multi'     — value string[], row matches when its `field` is in the set
 *
 * `value(row)` reads a field the row keeps somewhere other than a top level key;
 * `match(row, value)` replaces the comparison outright for a derived question
 * ("dormant more than 90 days") that no single column answers.
 */

import { dayOf, niceDate } from './reportData'

export const blankValue = (spec) => {
  if (spec.type === 'dateRange') return { from: '', to: '' }
  if (spec.type === 'multi') return []
  return ''
}

export const blankValues = (specs = []) =>
  Object.fromEntries(specs.map((s) => [s.id, blankValue(s)]))

export const isSet = (spec, v) => {
  if (v == null) return false
  if (spec.type === 'dateRange') return Boolean(v.from || v.to)
  if (spec.type === 'multi') return v.length > 0
  return String(v).trim() !== ''
}

const readValue = (spec, row) => {
  if (spec.value) return spec.value(row)
  return row[spec.field || spec.id]
}

export const optionValue = (o) => (o && o.value !== undefined ? o.value : o)
export const optionLabel = (o) => (o && o.label !== undefined ? o.label : o)

/** The human name of a stored option value, for the chip and the drawer. */
export const labelOf = (spec, v) => {
  const hit = (spec.options || []).find((o) => String(optionValue(o)) === String(v))
  return hit ? String(optionLabel(hit)) : String(v)
}

export const rangeLabel = (from, to) => {
  if (!from && !to) return 'All time'
  if (from && to) return `${niceDate(from)} – ${niceDate(to)}`
  if (from) return `From ${niceDate(from)}`
  return `Up to ${niceDate(to)}`
}

const matchOne = (spec, row, v) => {
  if (spec.match) return spec.match(row, v)

  if (spec.type === 'dateRange') {
    const d = dayOf(spec.value ? spec.value(row) : row[spec.field || 'ts'])
    // A row that carries no date is not evidence that it falls outside the
    // window, so a date filter narrows the rows that have one and leaves the
    // undated ones where they are.
    if (!d) return true
    if (v.from && d < v.from) return false
    if (v.to && d > v.to) return false
    return true
  }

  if (spec.type === 'text') {
    const needle = String(v).trim().toLowerCase()
    const fields = spec.fields || [spec.field || spec.id]
    return fields.some((f) => String(row[f] ?? '').toLowerCase().includes(needle))
  }

  if (spec.type === 'multi') {
    const cell = String(readValue(spec, row) ?? '')
    return v.some((x) => String(x) === cell)
  }

  return String(readValue(spec, row) ?? '') === String(v)
}

/** Every set filter narrows the result: they combine, they do not compete. */
export const applyReportFilters = (specs = [], rows = [], values = {}) => {
  const live = specs.filter((s) => isSet(s, values[s.id]))
  if (!live.length) return rows
  return rows.filter((row) => live.every((s) => matchOne(s, row, values[s.id])))
}

export const countActive = (specs = [], values = {}) =>
  specs.reduce((a, s) => a + (isSet(s, values[s.id]) ? 1 : 0), 0)

const valueText = (spec, v) => {
  if (spec.type === 'dateRange') return rangeLabel(v.from, v.to)
  if (spec.type === 'multi') {
    if (v.length <= 2) return v.map((x) => labelOf(spec, x)).join(', ')
    return `${v.length} selected`
  }
  return labelOf(spec, v)
}

/**
 * What the active-filter row shows. Each chip names the field as well as the
 * value, because "Failed" on its own does not say whether it is a delivery
 * status or a sign-in outcome.
 */
export const filterChips = (specs = [], values = {}) => specs
  .filter((s) => isSet(s, values[s.id]))
  .map((s) => ({ id: s.id, label: s.label, text: valueText(s, values[s.id]) }))
