import { useMemo, useState } from 'react'
import Avatar from '../../components/primitives/Avatar'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { SkeletonStats } from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { USERS } from '../../data/seed'
import { fetchDns } from './ldapModel'

// Which identities this directory holds, and where. Provisioning is derived
// from the identity's own department and type, so the split between provisioned
// and not is the same one the rules engine would make.
const ouFor = (app, u) => {
  const ous = fetchDns(app)
  const idx = (u.id * 7) % ous.length
  return ous[idx]
}

const isProvisioned = (app, u) => (u.id + app.id) % 4 !== 0

function AddUsersForm({ app, provisionedIds, onChange }) {
  const [ou, setOu] = useState('')
  const [picked, setPicked] = useState([])
  const [q, setQ] = useState('')
  const ous = fetchDns(app)

  const candidates = useMemo(() => {
    if (!ou) return []
    const needle = q.trim().toLowerCase()
    return USERS
      .filter((u) => !provisionedIds.includes(u.id) && ouFor(app, u) === ou)
      .filter((u) => !needle || `${u.username} ${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(needle))
  }, [ou, q, provisionedIds])

  const toggle = (id) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]
    setPicked(next)
    onChange({ ou, ids: next })
  }

  return (
    <div className="stack">
      <Field label="Organizational unit" required hint="Identities are created below this DN.">
        <Select
          className="mono"
          value={ou}
          options={ous}
          placeholder="Select an organizational unit"
          onChange={(e) => { setOu(e.target.value); setPicked([]); onChange({ ou: e.target.value, ids: [] }) }}
        />
      </Field>

      {!ou ? (
        // The table used to render empty before a choice was made, which read
        // as "no users exist". Nothing is shown until there is something to show.
        <EmptyState
          icon="directory"
          title="Choose an organizational unit"
          body="Pick where the identities should be written and the ones not yet in that container will be listed here."
        />
      ) : candidates.length === 0 ? (
        <EmptyState
          icon="checkC"
          title="Every identity in this unit is already added"
          body={`All identities that belong under ${ou} are already provisioned to ${app.displayName}. Choose another unit to add more.`}
        />
      ) : (
        <>
          <div className="wb-search is-block" style={{ maxWidth: 320 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search these identities…" aria-label="Search candidates" />
          </div>
          <div className="wb-scroll" style={{ maxHeight: 420 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="td-sel" />
                  <th>Username</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((u) => (
                  <tr key={u.id} data-selected={picked.includes(u.id) || undefined} onClick={() => toggle(u.id)} style={{ cursor: 'pointer' }}>
                    <td className="td-sel">
                      <input type="checkbox" readOnly checked={picked.includes(u.id)} aria-label={`Select ${u.username}`} />
                    </td>
                    <td className="td-main mono">{u.username}</td>
                    <td>
                      <span className="cell-id">
                        <Avatar first={u.firstName} last={u.lastName} size="sm" />
                        <span className="trunc">{u.firstName} {u.lastName}</span>
                      </span>
                    </td>
                    <td className="trunc">{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="t-xs t-mut">{picked.length} of {candidates.length} selected</span>
        </>
      )}
    </div>
  )
}

// `loading` is the record's own settling flag, handed down rather than started
// again here: the panel is one of the directory's tabs, and a register that ran
// its own timer would land at a different moment from the masthead above it.
export default function LdapUsers({ app, loading = false }) {
  const { toast, confirm, setDrawer } = useApp()
  const [extra, setExtra] = useState([])
  const [removed, setRemoved] = useState([])
  const draft = useState(() => ({ current: { ou: '', ids: [] } }))[0]

  const rows = useMemo(() => USERS
    .filter((u) => (isProvisioned(app, u) || extra.includes(u.id)) && !removed.includes(u.id))
    .map((u) => ({ ...u, ou: ouFor(app, u) })), [app, extra, removed])

  const provisionedIds = rows.map((r) => r.id)

  const columns = [
    serialColumn('S.No'),
    {
      key: 'username', label: 'Identity', locked: true, cls: 'td-main td-wide', width: 250,
      value: (r) => `${r.username} ${r.firstName} ${r.lastName} ${r.email}`,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.firstName} {r.lastName}</span>
            <span className="cell-sub mono">{r.username}</span>
          </span>
        </span>
      ),
    },
    { key: 'email', label: 'Email', cls: 'td-flex' },
    { key: 'ou', label: 'Organizational unit', cls: 'td-mono td-flex' },
    { key: 'department', label: 'Department', optional: true },
    { key: 'employeeType', label: 'Type', optional: true },
  ]

  const removeUsers = (ids, clear) => confirm({
    title: ids.length === 1 ? 'Remove this identity?' : `Remove ${ids.length} identities?`,
    body: `The directory entry under ${app.displayName} is deleted on the next provisioning run. The identity itself is untouched and can be added again.`,
    confirmLabel: `Remove ${ids.length}`,
    onConfirm: () => {
      setRemoved((r) => [...r, ...ids.map(Number)])
      if (clear) clear()
      toast('ok', 'Identities removed', `${ids.length} removed from ${app.displayName}.`)
    },
  })

  const sync = () => confirm({
    title: `Synchronize ${app.displayName}?`,
    body: `Every identity below ${app.baseDn} is compared against the identity store: missing entries are created, changed attributes are written and entries whose identity has gone are retired. Nothing is deleted without a matching rule.`,
    confirmLabel: 'Run synchronization',
    onConfirm: () => toast('ok', 'Synchronization queued', `${app.displayName} is queued for a full read and write. Progress appears in Jobs.`),
  })

  const openAdd = () => {
    draft.current = { ou: '', ids: [] }
    setDrawer({
      title: 'Add identities',
      sub: `Provisioned into ${app.displayName}.`,
      size: 'lg',
      children: <AddUsersForm app={app} provisionedIds={provisionedIds} onChange={(v) => { draft.current = v }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="plus"
            onClick={() => {
              const { ou, ids } = draft.current
              if (!ou) { toast('warn', 'Organizational unit required', 'Choose where the identities are written.'); return }
              if (!ids.length) { toast('warn', 'Nothing selected', 'Select at least one identity to add.'); return }
              setExtra((e) => [...e, ...ids])
              setRemoved((r) => r.filter((x) => !ids.includes(x)))
              setDrawer(null)
              toast('ok', 'Identities added', `${ids.length} queued for creation under ${ou}.`)
            }}
          >
            Add identities
          </Button>
        </>
      ),
    })
  }

  const byOu = rows.reduce((m, r) => ({ ...m, [r.ou]: (m[r.ou] || 0) + 1 }), {})

  return (
    <div className="stack">
      {loading ? <SkeletonStats count={4} /> : (
        <StatCards
          items={[
            { key: 'total', icon: 'users', label: 'Provisioned identities', value: rows.length, chip: `${Object.keys(byOu).length} units`, sub: `held under ${app.baseDn}` },
            { key: 'entries', icon: 'directory', label: 'Directory entries', value: app.entries, chip: 'read at last sync', sub: 'everything below the base DN' },
            { key: 'unmanaged', icon: 'orphan', label: 'Not provisioned', value: USERS.length - rows.length, chip: 'in the identity store', chipTone: 'warn', sub: 'no entry in this directory' },
            { key: 'sync', icon: 'refresh', label: 'Last synchronized', value: String(app.lastSync).slice(0, 10), chip: String(app.lastSync).slice(11) || '—', sub: 'most recent full read' },
          ]}
          label="Provisioned identity summary"
        />
      )}

      <DataWorkbench
        id={`ldap-users-${app.id}`}
        rows={rows}
        columns={columns}
        loading={loading}
        selectable
        searchPlaceholder="Search by identity, email or organizational unit…"
        toolbar={(
          <>
            <Button size="sm" icon="refresh" onClick={sync}>Sync</Button>
            <Button size="sm" variant="pri" icon="plus" onClick={openAdd}>Add identities</Button>
          </>
        )}
        bulkActions={(ids, clear) => (
          <Button size="sm" variant="danger" icon="trash" onClick={() => removeUsers(ids, clear)}>Remove from directory</Button>
        )}
        emptyTitle="No identity matches"
        emptyBody="Adjust the search, or add identities to this directory."
        emptyIcon="users"
        footNote={`${num(rows.length)} identities provisioned across ${Object.keys(byOu).length} organizational units`}
      />
    </div>
  )
}
