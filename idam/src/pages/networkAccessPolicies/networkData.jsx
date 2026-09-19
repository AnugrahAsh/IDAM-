import { SSO_APPS, USERS } from '../../data/seed'

export const LIST_PATH = '/iam/ip/restriction/policy'


export const IP_VALUES = [
  '10.4.18.22/32',
  '10.0.0.0/8',
  '192.168.44.0/24',
  '203.0.113.51/32',
  '172.16.0.0/12',
  '198.51.100.7/32',
  '10.12.4.0/24',
]


export const dayStr = (n) => new Date(Date.UTC(2026, 7, 5) - n * 86400000).toISOString().slice(0, 10)

export const USERNAMES = [...new Set(USERS.map((u) => u.username))]

export const APP_NAMES = SSO_APPS.map((a) => a.displayName)


export const validIp = (ip) => {
  const parts = String(ip).trim().split('.')
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
}


export const validAddress = (value) => {
  const [ip, bits] = String(value).trim().split('/')
  if (!validIp(ip)) return false
  if (bits === undefined) return true
  return /^\d{1,2}$/.test(bits) && Number(bits) <= 32
}


export const toInt = (ip) => ip.trim().split('.').reduce((a, o) => a * 256 + Number(o), 0)

export const fromInt = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')


export const inRange = (ip, value) => {
  const [base, bits] = String(value).split('/')
  if (!validIp(base)) return false
  const width = bits === undefined ? 32 : Number(bits)
  const mask = width === 0 ? 0 : (0xffffffff << (32 - width)) >>> 0
  return ((toInt(ip) & mask) >>> 0) === ((toInt(base) & mask) >>> 0)
}


export const rangeInfo = (value) => {
  if (!validAddress(value)) return null
  const [base, bitsRaw] = String(value).trim().split('/')
  const bits = bitsRaw === undefined ? 32 : Number(bitsRaw)
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  const network = (toInt(base) & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = Math.pow(2, 32 - bits)
  return {
    bits,
    mask: fromInt(mask),
    network: fromInt(network),
    broadcast: fromInt(broadcast),
    first: fromInt(bits >= 31 ? network : network + 1),
    last: fromInt(bits >= 31 ? broadcast : broadcast - 1),
    hosts: bits >= 31 ? total : total - 2,
  }
}






/**
 * The addresses a stored range expands into, as table rows.
 *
 * A /32 is one address that is itself the only usable one; a /31 has two and no
 * network or broadcast reservation; anything wider reserves both ends. Deriving
 * the rows here rather than in the view means the detail page renders the same
 * table for all three cases instead of branching on the prefix.
 */
export const rangeRows = (range) => {
  if (!range) return []
  if (range.bits === 32) {
    return [{ role: 'Host address', address: range.network, usable: true }]
  }
  if (range.bits === 31) {
    return [
      { role: 'First address', address: range.first, usable: true },
      { role: 'Second address', address: range.last, usable: true },
    ]
  }
  return [
    { role: 'Network address', address: range.network, usable: false },
    { role: 'First usable', address: range.first, usable: true },
    { role: 'Last usable', address: range.last, usable: true },
    { role: 'Broadcast address', address: range.broadcast, usable: false },
  ]
}


export const seedOf = (text) => [...String(text)].reduce((a, c) => a + c.charCodeAt(0), 0)


export const hitSeries = (binding) => {
  const s = seedOf(binding.id)
  const daily = Math.max(1, Math.round(binding.hits7d / 7))
  return Array.from({ length: 14 }, (_, i) => {
    const wave = Math.abs(Math.sin((s % 97) + i * 1.31))
    const matched = Math.round(daily * (0.42 + wave * 1.24))
    return {
      d: dayStr(13 - i).slice(5),
      matched,
      refused: binding.action === 'Deny' ? matched : Math.round(matched * 0.05 * (1 + wave)),
    }
  })
}


export const sourceRows = (binding) => {
  const s = seedOf(binding.id)
  const base = String(binding.ipAddress).split('/')[0].split('.')
  return Array.from({ length: 5 }, (_, i) => {
    const last = ((s + i * 37) % 250) + 2
    return {
      label: `${base[0]}.${base[1]}.${base[2]}.${last}`,
      value: Math.max(4, Math.round((binding.hits7d / (i + 2.2)) * 0.9)),
      color: binding.action === 'Deny' ? 'var(--bad)' : 'var(--s1)',
    }
  })
}




// Addresses are frequently pasted in from a ticket or a firewall export rather
// than typed one at a time, so every separator a keyboard produces is accepted.
export const addressesFrom = (text) =>
  String(text)
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)


// Two ranges collide when either one contains the other's base address.
export const overlapsAddress = (a, b) =>
  inRange(String(a).split('/')[0], b) || inRange(String(b).split('/')[0], a)


// A bare address is a /32; normalising means two spellings of the same host
// cannot be added to the same binding set twice.
export const canonicalAddress = (value) => {
  const [ip, bits] = String(value).trim().split('/')
  return `${ip}/${bits === undefined ? '32' : String(Number(bits))}`
}


export const identifiersFrom = (text) =>
  String(text)
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)


export const matchIdentifier = (row, token) => {
  const t = token.toLowerCase()
  return String(row.id).toLowerCase() === t
    || String(row.username).toLowerCase() === t
    || String(row.email).toLowerCase() === t
}

