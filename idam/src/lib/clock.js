// ---------------------------------------------------------------------------
// The platform clock.
//
// Every figure in this console is derived from a fixed dataset captured at one
// instant. When the status bar rendered the real wall clock instead, the two
// disagreed by however long ago that capture was, and the difference surfaced
// everywhere: a scheduler whose next run was in the past, a licence counting
// down the wrong number of days, "closes in 4 days" against a date already
// gone.
//
// So there is one clock, and this is it. Anything that needs to know the time
// asks here rather than asking the browser, which keeps every relative figure
// in the console consistent with the data it describes.
// ---------------------------------------------------------------------------

/* The instant the dataset represents. Everything relative is measured from it. */
export const NOW_MS = Date.UTC(2026, 7, 5, 9, 0)

export const now = () => new Date(NOW_MS)

const pad = (n) => String(n).padStart(2, '0')

/* `HH:MM:SS UTC`, as the status bar shows it. */
export const clockText = (d = now()) =>
  `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`

/* `YYYY-MM-DD`, the one date format this console renders. */
export const dateText = (d = now()) => d.toISOString().slice(0, 10)

/* `YYYY-MM-DD HH:MM`, the stamp used by registers and audit rows. */
export const stampText = (d = now()) => d.toISOString().slice(0, 16).replace('T', ' ')

/* Whole days between the platform clock and an ISO date, negative in the past. */
export const daysUntil = (iso) => {
  const t = Date.parse(String(iso).length <= 10 ? `${iso}T00:00:00Z` : String(iso).replace(' ', 'T') + 'Z')
  if (Number.isNaN(t)) return null
  return Math.round((t - NOW_MS) / 86400000)
}

/* How long ago something happened, phrased the way the registers phrase it. */
export const since = (iso) => {
  const t = Date.parse(String(iso).length <= 10 ? `${iso}T00:00:00Z` : String(iso).replace(' ', 'T') + 'Z')
  if (Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.round((NOW_MS - t) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}
