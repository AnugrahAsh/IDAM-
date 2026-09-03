import { USERS } from '../../data/seed'

// ---------------------------------------------------------------------------
// Directory tree
//
// The branch under a directory's base DN, derived from the record itself: the
// same base DN, the same identity seed, the same connector. Expanding a node
// reads its children the way a subtree search would — one level at a time.
// ---------------------------------------------------------------------------

const hash = (s) => {
  let x = 2166136261
  for (let i = 0; i < String(s).length; i += 1) {
    x ^= String(s).charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return Math.abs(x)
}

const OU_NAMES = ['support', 'demo1', 'demo2', 're_support', 'finance', 'engineering', 'contractors', 'service_accounts', 'partners', 'field_ops']
const CONTAINER_NAMES = ['Default_', 'default_policy', 'policy001', 'policy09', 'crud_policy_1777635651611', 'lockout_policy', 'pwd_policy_2026']

const OU_DESC = {
  support: 'Second-line support operators',
  demo1: 'This ldap is for the demo1 server',
  demo2: 'Demo2 Organizational Unit',
  re_support: '',
  finance: 'Finance identities in scope for SOX 404',
  engineering: 'Engineering staff and build service accounts',
  contractors: 'Non-employees on a ninety-day lifetime',
  service_accounts: 'Non-human identities holding stored secrets',
  partners: 'Externally sourced partner identities',
  field_ops: 'Field-level operators by zone',
}

const rdnOf = (dn) => String(dn).split(',')[0]
export const nameOf = (dn) => rdnOf(dn).split('=').slice(1).join('=')
export const typeOfDn = (dn) => {
  const attr = rdnOf(dn).split('=')[0].toLowerCase()
  if (attr === 'ou') return 'ou'
  if (attr === 'uid' || attr === 'cn') return attr === 'uid' ? 'user' : 'container'
  return 'container'
}

const take = (list, seed, n) => {
  const start = seed % list.length
  return Array.from({ length: n }, (_, i) => list[(start + i) % list.length])
}

const userEntry = (u, parentDn) => ({
  id: `uid=${u.username},${parentDn}`,
  dn: `uid=${u.username},${parentDn}`,
  name: u.username,
  type: 'user',
  detail: u.email,
  parent: parentDn,
  expandable: false,
  system: false,
  // Carried so a user row can show who the account is, not only its RDN.
  first: u.firstName,
  last: u.lastName,
  display: `${u.firstName} ${u.lastName}`,
  status: u.status,
  department: u.department,
})

const branchEntry = (name, type, parentDn, description) => ({
  id: `${type === 'ou' ? 'ou' : 'cn'}=${name},${parentDn}`,
  dn: `${type === 'ou' ? 'ou' : 'cn'}=${name},${parentDn}`,
  name,
  type,
  detail: description || '',
  parent: parentDn,
  expandable: true,
  // Containers are created by the platform's own policy engine; an operator
  // renames and removes organizational units, not these.
  system: type === 'container',
})

// One level of the tree. Depth is capped so a branch always terminates in users.
// A crowded unit is read in pages, the way a paged search control would return
// it — the row count on screen never depends on how large the branch is.
export const PAGE_SIZE = 25

export const childrenOf = (app, dn, depth = 0) => {
  const seed = hash(`${app.name}:${dn}`)
  const root = depth === 0
  const containers = root ? take(CONTAINER_NAMES, seed, 4 + (seed % 2)) : []
  const ous = depth >= 2 ? [] : take(OU_NAMES, seed >> 3, root ? 4 + (seed % 3) : 1 + (seed % 2))
  // A real directory holds thousands under a populated unit; the count here is
  // deliberately larger than one page so paging is exercised, not theoretical.
  const userCount = root ? 2 + (seed % 3) : 8 + (seed % 90)
  const users = take(USERS, seed >> 7, userCount)

  return [
    ...containers.map((n) => branchEntry(n, 'container', dn)),
    ...ous.map((n) => branchEntry(n, 'ou', dn, OU_DESC[n])),
    ...users.map((u) => userEntry(u, dn)),
  ]
}

export const TYPE_META = {
  root: { label: 'base DN', tone: 'info', icon: 'db' },
  container: { label: 'container', tone: 'mut', icon: 'folder' },
  ou: { label: 'ou', tone: 'warn', icon: 'folder' },
  user: { label: 'user', tone: 'viol', icon: 'user' },
}

// Tree order: platform containers first, then operator OUs, then leaves.
export const TYPE_ORDER = { root: -1, container: 0, ou: 1, user: 2 }

// An entry's attributes as the directory holds them: operational values the
// server writes and the writable values an operator may change. Multi-valued
// attributes return more than one value, which is what the editor renders.
const OPERATIONAL = [
  'createTimestamp', 'creatorsName', 'entryCSN', 'entryDN', 'entryUUID',
  'hasSubordinates', 'modifiersName', 'modifyTimestamp', 'structuralObjectClass',
  'subschemaSubentry',
]

const uuidOf = (seed) => [8, 4, 4, 4, 12]
  .map((len, i) => Array.from({ length: len }, (_, k) => ((seed >> ((i + k) % 24)) % 16).toString(16)).join(''))
  .join('-')

// Generalized time as the server writes it: YYYYMMDDHHmmssZ.
const stamp = (n) => `2026${String(1 + (n % 8)).padStart(2, '0')}${String(1 + (n % 27)).padStart(2, '0')}${String(n % 24).padStart(2, '0')}${String(n % 60).padStart(2, '0')}00Z`

// The same modifyTimestamp the attribute editor shows, formatted for a column.
export const modifiedOf = (entry) => {
  const t = stamp(hash(entry.dn) + 91)
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(8, 10)}:${t.slice(10, 12)}`
}

export const attributesOf = (app, entry) => {
  const seed = hash(entry.dn)
  const base = [
    { name: 'objectClass', values: entry.type === 'user'
      ? ['top', 'person', 'organizationalPerson', 'inetOrgPerson', 'myAppPerson']
      : entry.type === 'ou' ? ['top', 'organizationalUnit'] : ['top', 'container'], operational: true },
    { name: 'entryDN', values: [entry.dn], operational: true },
    { name: 'entryUUID', values: [uuidOf(seed)], operational: true },
    { name: 'structuralObjectClass', values: [entry.type === 'user' ? 'inetOrgPerson' : 'organizationalUnit'], operational: true },
    { name: 'hasSubordinates', values: [entry.expandable ? 'TRUE' : 'FALSE'], operational: true },
    { name: 'creatorsName', values: [app.bindDn], operational: true },
    { name: 'createTimestamp', values: [stamp(seed)], operational: true },
    { name: 'modifiersName', values: [app.bindDn], operational: true },
    { name: 'modifyTimestamp', values: [stamp(seed + 91)], operational: true },
    { name: 'subschemaSubentry', values: ['cn=Subschema'], operational: true },
  ]

  if (entry.type === 'user') {
    const [first, ...rest] = String(entry.name).split('_')
    const last = rest.join(' ') || first
    return [
      { name: 'uid', values: [entry.name] },
      { name: 'cn', values: [`${first} ${last}`.toLowerCase()] },
      { name: 'sn', values: [last.toLowerCase()] },
      { name: 'mail', values: [entry.detail].filter(Boolean) },
      { name: 'telephoneNumber', values: [`+91 9${(seed % 900000000) + 100000000}`] },
      { name: 'homeDirectory', values: [`/home/${String(entry.name).toLowerCase()}`] },
      { name: 'gidNumber', values: [String(5000 + (seed % 500))] },
      { name: 'city', values: [['Mumbai', 'Bengaluru', 'Dehradun', 'Singapore'][seed % 4]] },
      { name: 'rerolecustomer', values: ['support_tier2', 'read_only'] },
      ...base,
    ]
  }

  return [
    { name: 'ou', values: [entry.name] },
    { name: 'description', values: entry.detail ? [entry.detail] : [] },
    ...base,
  ]
}

export const isOperational = (name) => OPERATIONAL.includes(name)

// Entries as an LDIF fragment: the DN, then every non-operational attribute the
// way an export would print them. Used for the selection export.
export const entriesLdif = (app, entries) => entries.map((e) => {
  const attrs = attributesOf(app, e).filter((a) => !isOperational(a.name) && a.values.length)
  return [`dn: ${e.dn}`, ...attrs.flatMap((a) => a.values.map((v) => `${a.name}: ${v}`))].join('\n')
}).join('\n\n') + '\n'

export const countOf = (rows) => ({
  ous: rows.filter((r) => r.type === 'ou').length,
  containers: rows.filter((r) => r.type === 'container').length,
  users: rows.filter((r) => r.type === 'user').length,
})
