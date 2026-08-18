export const PERM_GROUPS = [
  { id: 'core', label: 'Core access', perms: ['View list', 'View', 'Create', 'Edit', 'Delete'] },
  { id: 'lifecycle', label: 'Identity lifecycle', perms: ['Activate', 'Deactivate', 'Lock account', 'Reset password', 'Reset MFA', 'Reset device', 'Manage groups'] },
  { id: 'data', label: 'Bulk and data', perms: ['Import', 'Export', 'Bulk modify'] },
  { id: 'governance', label: 'Governance', perms: ['Certify', 'Revoke', 'Close campaign'] },
  { id: 'targets', label: 'Target operations', perms: ['Test connection', 'Sync', 'Provision user', 'Deprovision user'] },
]

export const WRITE_PERMS = new Set([
  'Create', 'Edit', 'Delete', 'Activate', 'Deactivate', 'Lock account', 'Reset password', 'Reset MFA',
  'Reset device', 'Manage groups', 'Import', 'Bulk modify', 'Certify', 'Revoke', 'Close campaign',
  'Test connection', 'Sync', 'Provision user', 'Deprovision user',
])

export const permTotal = (catalog) => catalog.reduce((a, m) => a + m.perms.length, 0)

export const permCount = (catalog, granted) => catalog.reduce((a, m) => {
  const held = granted[m.name] || []
  return a + held.filter((p) => m.perms.includes(p)).length
}, 0)

export const permGroups = (catalog) => {
  const present = new Set()
  catalog.forEach((m) => m.perms.forEach((p) => present.add(p)))
  const out = PERM_GROUPS
    .map((g) => ({ id: g.id, label: g.label, perms: g.perms.filter((p) => present.has(p)) }))
    .filter((g) => g.perms.length > 0)
  const claimed = new Set(out.flatMap((g) => g.perms))
  const rest = [...present].filter((p) => !claimed.has(p))
  return rest.length ? [...out, { id: 'other', label: 'Other', perms: rest }] : out
}
