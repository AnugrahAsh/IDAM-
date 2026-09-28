import { REPORTS } from './reportDefs'

// Catalog metadata is derived from the reports themselves. The catalogue used
// to read record counts, the window each report covered and an export tally
// out of here and print all three; it shows no figures at all now, so what is
// left is how recently a report moved — in words — and the export ledger the
// report page still writes when a CSV is taken.

const parse = (ts) => {
  if (!ts) return null
  const t = Date.parse(`${String(ts).replace(' ', 'T')}${/\d{2}:\d{2}$/.test(ts) ? ':00' : ''}Z`)
  return Number.isNaN(t) ? null : t
}

// The export ledger is private to this module now that nothing renders it; the
// pin list is read by the catalogue itself.
const EXPORT_KEY = 'tf-idam-report-exports'
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

// Recorded when an operator actually downloads a CSV. Nothing prints the tally
// any more, but the report page keeps writing it: the ledger is the record of
// what this browser has taken out of the console, and it is not the report
// page's business that the catalogue stopped displaying it.
export const recordExport = (reportId) => {
  const all = readExports()
  const now = Date.now()
  all[reportId] = [...(all[reportId] || []), now].filter((t) => now - t < 30 * DAY)
  try { localStorage.setItem(EXPORT_KEY, JSON.stringify(all)) } catch { /* storage unavailable */ }
  return all[reportId].length
}

const stampsOf = (rows) => rows.map((r) => parse(r.ts)).filter(Boolean)

// The seed is a fixed snapshot, so age is measured against its own newest
// record across the whole catalog rather than against the wall clock — "Today"
// means the latest day anything in the console happened.
const ALL_STAMPS = REPORTS.flatMap((r) => stampsOf(r.rows()))
const CATALOG_NOW = ALL_STAMPS.length ? Math.max(...ALL_STAMPS) : Date.now()

/* How recently a report moved, said in words.
 *
 * It used to read "31 hrs ago". A catalogue that carries no figures should not
 * make its one remaining fact the exception, and "Yesterday" is the part of
 * "31 hrs ago" a reader choosing a report actually uses. Day boundaries are
 * counted off the epoch, which is UTC — the same clock the stamps are parsed
 * in — so the answer does not shift with the reader's zone. */
const dayOf = (t) => Math.floor(t / DAY)

export const freshness = (rows) => {
  const stamps = stampsOf(rows)
  if (!stamps.length) return 'No timestamps'
  const newest = Math.max(...stamps)
  if (CATALOG_NOW - newest < 36e5) return 'Just now'
  const days = dayOf(CATALOG_NOW) - dayOf(newest)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'This week'
  if (days < 14) return 'Last week'
  if (days < 31) return 'This month'
  return 'Earlier'
}
