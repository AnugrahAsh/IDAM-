export const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'))
export const pct = (n, d = 0) => `${Number(n).toFixed(d)}%`
export const initials = (a = '', b = '') => `${(a[0] || '')}${(b[0] || '')}`.toUpperCase()

const PALETTE = ['#0F62FE', '#6941C6', '#0E7D74', '#B25E09', '#C2255C', '#1F7A3D', '#8A5A00', '#0B65B8']
export const avatarColor = (seed = '') => {
  const n = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTE[n % PALETTE.length]
}

export const duration = (ms) => {
  if (ms == null) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export const ago = (mins) => {
  if (mins == null) return '—'
  if (mins < 1) return 'just now'
  if (mins < 60) return `${Math.round(mins)}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export const serialColumn = (label = 'S.No.') => ({
  key: '__sno',
  label,
  width: 68,
  sortable: false,
  cls: 'td-mono',
  render: (r, i) => i + 1,
})

export const statusTone = (s) => ({
  Active: 'ok', Healthy: 'ok', Succeeded: 'ok', Approved: 'ok', Certified: 'ok', Delivered: 'ok', Allowed: 'ok', Open: 'ok',
  Pending: 'warn', Degraded: 'warn', Running: 'info', 'At risk': 'warn', Escalated: 'warn', Remediating: 'warn', Paused: 'warn',
  Failed: 'bad', Rejected: 'bad', Locked: 'bad', Revoked: 'bad', Denied: 'bad', Critical: 'bad',
  Disabled: 'mut', Closed: 'mut', Inactive: 'mut', Suppressed: 'mut', 'Accepted risk': 'viol',
}[s] || 'mut')
export const sortRows = (rows, key, dir) => {
  if (!key) return rows
  const out = [...rows]
  out.sort((a, b) => {
    const x = a[key], y = b[key]
    if (x == null) return 1
    if (y == null) return -1
    if (typeof x === 'number' && typeof y === 'number') return dir === 'asc' ? x - y : y - x
    return dir === 'asc' ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x))
  })
  return out
}
