/**
 * How the platform renders a moment.
 *
 * Everything the console stores is UTC. What an operator reads — and what an
 * export contains — is decided by the tenant's Date & Time settings, so the
 * formatting lives here rather than in each screen, and every screen that shows
 * a timestamp asks the same function.
 *
 * Conversion is done with `Intl.DateTimeFormat` and a real IANA zone rather
 * than a stored numeric offset, because an offset is wrong twice a year in any
 * zone that observes daylight saving.
 */

export const TIMEZONES = [
  'Asia/Calcutta', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Australia/Sydney', 'UTC',
]

export const DATE_FORMATS = [
  { value: 'dd-MM-yyyy', sample: '31-12-2026' },
  { value: 'dd/MM/yyyy', sample: '31/12/2026' },
  { value: 'yyyy-MM-dd', sample: '2026-12-31' },
  { value: 'MM/dd/yyyy', sample: '12/31/2026' },
  { value: 'dd MMM yyyy', sample: '31 Dec 2026' },
]

export const TIME_FORMATS = [
  { value: '12h', label: '12-hour (hh:mm AM/PM)' },
  { value: '24h', label: '24-hour (HH:mm)' },
]

export const LOCALES = [
  { value: 'en-IN', label: 'English (India) — en-IN' },
  { value: 'en-GB', label: 'English (UK) — en-GB' },
  { value: 'en-US', label: 'English (US) — en-US' },
  { value: 'hi-IN', label: 'Hindi (India) — hi-IN' },
  { value: 'fr-FR', label: 'French (France) — fr-FR' },
  { value: 'de-DE', label: 'German (Germany) — de-DE' },
  { value: 'ar-AE', label: 'Arabic (UAE) — ar-AE' },
]

export const WEEK_STARTS = ['Sunday', 'Monday', 'Saturday']

export const TLS_VERSIONS = ['TLS 1.2', 'TLS 1.3']
export const SYSLOG_FRAMINGS = ['Octet counting (RFC 5425)', 'Non-transparent framing (LF)']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The wall-clock parts of `date` as they read in `timezone`. */
export const partsIn = (date, timezone) => {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    const out = {}
    fmt.formatToParts(date).forEach((p) => { if (p.type !== 'literal') out[p.type] = p.value })
    // Midnight comes back as hour 24 in some engines.
    if (out.hour === '24') out.hour = '00'
    return out
  } catch {
    // An unknown zone should degrade to UTC, not blank the screen.
    const pad = (n) => String(n).padStart(2, '0')
    return {
      year: String(date.getUTCFullYear()), month: pad(date.getUTCMonth() + 1), day: pad(date.getUTCDate()),
      hour: pad(date.getUTCHours()), minute: pad(date.getUTCMinutes()), second: pad(date.getUTCSeconds()),
    }
  }
}

/** The zone's offset from UTC at that instant, as `+05:30`. */
export const offsetIn = (date, timezone) => {
  const p = partsIn(date, timezone)
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  const mins = Math.round((asUtc - date.getTime()) / 60000)
  const sign = mins < 0 ? '-' : '+'
  const abs = Math.abs(mins)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

export const formatDate = (date, cfg) => {
  const p = partsIn(date, cfg.timezone)
  switch (cfg.dateFormat) {
    case 'dd/MM/yyyy': return `${p.day}/${p.month}/${p.year}`
    case 'yyyy-MM-dd': return `${p.year}-${p.month}-${p.day}`
    case 'MM/dd/yyyy': return `${p.month}/${p.day}/${p.year}`
    case 'dd MMM yyyy': return `${p.day} ${MONTHS[+p.month - 1]} ${p.year}`
    default: return `${p.day}-${p.month}-${p.year}`
  }
}

export const formatTime = (date, cfg) => {
  const p = partsIn(date, cfg.timezone)
  const h24 = +p.hour
  const secs = cfg.displaySeconds ? `:${p.second}` : ''
  if (cfg.timeFormat === '24h') return `${p.hour}:${p.minute}${secs}`
  const suffix = h24 >= 12 ? 'pm' : 'am'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${String(h12).padStart(2, '0')}:${p.minute}${secs} ${suffix}`
}

export const formatDateTime = (date, cfg) => `${formatDate(date, cfg)} ${formatTime(date, cfg)}`

/** ISO-8601 with the zone's own offset — what an integration would receive. */
export const formatIsoOffset = (date, timezone) => {
  const p = partsIn(date, timezone)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offsetIn(date, timezone)}`
}

const UNITS = [
  ['year', 31536000], ['month', 2592000], ['day', 86400],
  ['hour', 3600], ['minute', 60], ['second', 1],
]

/** "in 3 minutes" / "2 hours ago", in the tenant's locale. */
export const formatRelative = (date, cfg, now = new Date()) => {
  const diff = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diff)
  const [unit, secs] = UNITS.find(([, s]) => abs >= s) || ['second', 1]
  try {
    return new Intl.RelativeTimeFormat(cfg.locale, { numeric: 'auto' })
      .format(Math.round(diff / secs), unit)
  } catch {
    return `${Math.round(abs / secs)} ${unit}${Math.round(abs / secs) === 1 ? '' : 's'} ${diff < 0 ? 'ago' : 'from now'}`
  }
}

/**
 * Reads a stored `YYYY-MM-DD HH:MM[:SS]` stamp as UTC. The console's seed data
 * and its logs are written in that shape, and treating them as local time would
 * silently shift every timestamp by the reader's own offset.
 */
export const parseStamp = (stamp) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(stamp || ''))
  if (!m) return null
  const [, y, mo, d, hh, mi, ss] = m
  return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi, ss ? +ss : 0))
}
