import { REPORTS } from './reportDefs'

// Catalog metadata is derived from the reports themselves: how much each one
// holds, how fresh it is, and how often it has actually been exported. Nothing
// here is a stored attribute — it is read from the rows on every render.

const parse = (ts) => {
  if (!ts) return null
  const t = Date.parse(`${String(ts).replace(' ', 'T')}${/\d{2}:\d{2}$/.test(ts) ? ':00' : ''}Z`)
  return Number.isNaN(t) ? null : t
}

export const EXPORT_KEY = 'tf-idam-report-exports'
export const PIN_KEY = 'tf-idam-report-pins'
const DAY = 86400000

const readExports = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(EXPORT_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

// Recorded when an operator actually downloads a CSV, so "exports" counts real
// downloads rather than an invented figure.
export const recordExport = (reportId) => {
  const all = readExports()
  const now = Date.now()
  all[reportId] = [...(all[reportId] || []), now].filter((t) => now - t < 30 * DAY)
  try { localStorage.setItem(EXPORT_KEY, JSON.stringify(all)) } catch { /* storage unavailable */ }
  return all[reportId].length
}

export const exportsFor = (reportId, now = Date.now()) =>
  (readExports()[reportId] || []).filter((t) => now - t < 30 * DAY).length

export const totalExports = (now = Date.now()) =>
  Object.values(readExports()).reduce((a, list) => a + list.filter((t) => now - t < 30 * DAY).length, 0)

const stampsOf = (rows) => rows.map((r) => parse(r.ts)).filter(Boolean)

export const freshness = (rows) => {
  const stamps = stampsOf(rows)
  if (!stamps.length) return { label: 'No timestamps', newest: null, oldest: null }
  const newest = Math.max(...stamps)
  const oldest = Math.min(...stamps)
  // The seed is a fixed snapshot: age is measured against its own newest record
  // across the whole catalog, so "just now" means the latest thing that happened.
  const age = CATALOG_NOW - newest
  const hrs = Math.round(age / 36e5)
  const label = age < 36e5 ? 'Just now'
    : age < DAY ? `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ago`
      : `${Math.round(age / DAY)}d ago`
  return { label, newest, oldest }
}

const ALL_STAMPS = REPORTS.flatMap((r) => stampsOf(r.rows()))
export const CATALOG_NOW = ALL_STAMPS.length ? Math.max(...ALL_STAMPS) : Date.now()
export const CATALOG_OLDEST = ALL_STAMPS.length ? Math.min(...ALL_STAMPS) : null

/* The window a report actually covers — the question the trend line was being
   asked to imply and could not answer. A ledger that holds one day says so. */
const dayLabel = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const spanLabel = (oldest, newest) => {
  if (!oldest || !newest) return null
  const from = dayLabel(oldest)
  const to = dayLabel(newest)
  return from === to ? from : `${from} – ${to}`
}

export const monthLabel = (t) => (t
  ? new Date(t).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  : '—')
