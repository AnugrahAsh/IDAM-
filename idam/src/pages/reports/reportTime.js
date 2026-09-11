import { getSettings } from '../settings/settingsStore'
import { formatDateTime, offsetIn, parseStamp, partsIn } from '../../lib/datetime'

/**
 * How a report renders its timestamps.
 *
 * Every stored timestamp is UTC. "Application time" is whatever the tenant has
 * configured under Settings → Date & Time, so this reads that rather than
 * carrying an offset of its own — a hard-coded offset made the selector a
 * label rather than a setting, and was wrong twice a year in any zone that
 * observes daylight saving.
 *
 * An auditor correlating against a gateway log wants UTC; someone reading from
 * another region wants their own clock. All three are offered, and the
 * conversion happens on render rather than being stored three times.
 */

const appZone = () => (getSettings().datetime || {}).timezone || 'UTC'

const browserZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

export const ZONES = () => {
  const now = new Date()
  const app = appZone()
  const local = browserZone()
  return [
    { id: 'app', zone: app, label: 'Application time (default)', note: `Tenant clock · UTC${offsetIn(now, app)}` },
    { id: 'utc', zone: 'UTC', label: 'UTC', note: 'Coordinated Universal Time' },
    { id: 'local', zone: local, label: `Local time (UTC${offsetIn(now, local)})`, note: 'This browser’s own zone' },
  ]
}

export const ZONE_OPTIONS = () => ZONES().map((z) => ({ value: z.id, label: z.label }))

export const zoneById = (id) => ZONES().find((z) => z.id === id) || ZONES()[0]

/**
 * Renders a stored `YYYY-MM-DD HH:MM` stamp in the chosen zone. Anything that
 * is not a timestamp — a bare date, an em dash — is returned untouched: a
 * column holding a date has no clock to move.
 */
export const inZone = (stamp, zoneId) => {
  const date = parseStamp(stamp)
  if (!date) return stamp
  const z = zoneById(zoneId)
  const p = partsIn(date, z.zone)
  const withSeconds = /\d{2}:\d{2}:\d{2}/.test(String(stamp))
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}${withSeconds ? `:${p.second}` : ''}`
}

/** The suffix a report prints beside a converted stamp. */
export const zoneSuffix = (id) => (id === 'utc' ? 'UTC' : id === 'local' ? 'local' : 'app time')

/** A stamp rendered with the tenant's full Date & Time preferences. */
export const inAppFormat = (stamp) => {
  const date = parseStamp(stamp)
  if (!date) return stamp
  return formatDateTime(date, getSettings().datetime)
}
