import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import KeyValue from '../../components/primitives/KeyValue'
import Check from '../../components/primitives/Check'
import Avatar from '../../components/primitives/Avatar'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { USERS } from '../../data/seed'
import { CHAIN, SOURCE_ICON, eventsFor } from './roleModel'

export function AddMembers({ current, onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [pick, setPick] = useState(() => new Set())
  const held = new Set(current)
  const needle = q.trim().toLowerCase()

  const candidates = USERS
    .filter((u) => !held.has(u.id))
    .filter((u) => !needle
      || u.username.toLowerCase().includes(needle)
      || u.email.toLowerCase().includes(needle)
      || u.department.toLowerCase().includes(needle))
    .slice(0, 60)

  const toggle = (id) => setPick((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  return (
    <Card
      title="Add identities to this role"
      sub="Direct assignment is recorded against you in the role's activity log."
      actions={<IconButton icon="x" label="Close" onClick={onClose} />}
      footer={(
        <>
          <span><b className="num">{pick.size}</b> selected</span>
          <span className="spacer" />
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            variant="pri"
            icon="plus"
            disabled={pick.size === 0}
            onClick={() => { onAdd([...pick]); setPick(new Set()) }}
          >
            Add {pick.size || ''} to role
          </Button>
        </>
      )}
    >
      <div className="stack">
        <div className="wb-search" style={{ flex: 'none', maxWidth: 360 }}>
          <Icon name="search" size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username, email or department…" aria-label="Search identities" />
          {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto', margin: '0 -4px' }}>
          {candidates.length === 0 && <div className="t-sm t-mut" style={{ padding: '10px 4px' }}>Every matching identity already holds this role.</div>}
          {candidates.map((u) => (
            <div
              key={u.id}
              className="feed-it"
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer', padding: '7px 4px' }}
              onClick={() => toggle(u.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(u.id)}
            >
              <Check checked={pick.has(u.id)} onChange={() => toggle(u.id)} label={`Select ${u.username}`} />
              <Avatar first={u.firstName} last={u.lastName} size="sm" />
              <div className="feed-m">
                <div className="feed-t">{u.username}</div>
                <div className="feed-s"><span>{u.department}</span><span>{u.employeeType}</span><span>{u.organization}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export function MembersTab({ role, memberIds, onAdd, onRemove }) {
  const { navigate, toast, confirm } = useApp()
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    const set = new Set(memberIds)
    return USERS.filter((u) => set.has(u.id))
  }, [memberIds])

  const columns = [
    {
      key: 'username', label: 'Identity', locked: true, cls: 'td-main',
      value: (r) => `${r.username} ${r.email}`,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.username}</span>
            <span className="cell-sub">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'organization', label: 'Organization' },
    { key: 'department', label: 'Department' },
    { key: 'employeeType', label: 'Type', render: (r) => <span className="tag">{r.employeeType}</span> },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    { key: 'lastLogin', label: 'Last sign-in', cls: 'td-mono' },
  ]

  const confirmRemove = (ids, clear) => confirm({
    title: ids.length === 1 ? 'Remove this identity from the role?' : `Remove ${ids.length} identities from the role?`,
    body: `Every permission granted by ${role.name} is withdrawn at the next provisioning run. Access granted by another role or request is unaffected.`,
    confirmLabel: `Remove ${ids.length}`,
    onConfirm: () => { onRemove(ids); if (clear) clear() },
  })

  return (
    <div className="stack">
      {adding && (
        <AddMembers
          current={memberIds}
          onClose={() => setAdding(false)}
          onAdd={(ids) => { onAdd(ids); setAdding(false) }}
        />
      )}

      <DataWorkbench
        id="role-members"
        rows={rows}
        columns={columns}
        selectable
        searchPlaceholder="Search members by username, email or department…"
        onRowClick={(r) => navigate(`/iam/users/${r.id}`)}
        rowActions={(r) => [
          { id: 'open', label: 'Open identity', icon: 'eye', onSelect: () => navigate(`/iam/users/${r.id}`) },
          { id: 'why', label: 'Why does this identity hold the role?', icon: 'help', onSelect: () => toast('info', 'Assignment source', `${r.username} holds ${role.name} through the rules on the Assignment rules tab.`) },
          { divider: true },
          { id: 'rm', label: 'Remove from role', icon: 'minus', danger: true, onSelect: () => confirmRemove([r.id]) },
        ]}
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} members queued for CSV export.`)}>Export</Button>
            <Button size="sm" variant="danger" icon="minus" onClick={() => confirmRemove(ids, clear)}>Remove</Button>
          </>
        )}
        toolbar={(
          <>
            <Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add members</Button>
            <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${rows.length} members queued for CSV export.`)}>Export</Button>
          </>
        )}
        emptyTitle="No identities hold this role"
        emptyBody="Add members directly, or let a dynamic policy award the role from an attribute."
        emptyIcon="users"
        footNote={`${num(rows.length)} ${rows.length === 1 ? 'identity holds' : 'identities hold'} this role`}
      />

      <div className="banner" data-tone="info">
        <Icon name="info" size={15} />
        <div>
          Membership is granted through access requests and dynamic policies as well as direct assignment. Removing an
          identity here does not stop a policy from awarding the role again at the next evaluation.
        </div>
      </div>
    </div>
  )
}

export function RulesTab({ role, rules = [], memberCount = 0 }) {
  const { navigate, toast } = useApp()
  const covered = rules.reduce((a, r) => a + r.matched, 0)

  return (
    <div className="detail-cols">
      <div className="stack">
        <Card
          title="Rules that grant this role"
          sub="Everything that can put an identity into the role, and on what terms"
          flush
          actions={<Button size="sm" icon="plus" onClick={() => navigate('/iam/dynamicPolicy')}>New policy</Button>}
        >
          {rules.length === 0 ? (
            <EmptyState
              size="sm"
              icon="policy"
              title="No rule awards this role"
              body="The role can only be granted by hand, so every assignment depends on an operator remembering to make it. Attach a dynamic policy to make it repeatable."
              actions={<Button variant="pri" icon="policy" onClick={() => navigate('/iam/dynamicPolicy')}>Open dynamic policy</Button>}
            />
          ) : (
            <div className="tbl-scroll" style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Condition</th>
                    <th>Scope</th>
                    <th>Grant mode</th>
                    <th className="td-num">Identities</th>
                    <th>State</th>
                    <th>Evaluated</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td className="td-main">
                        <span className="cell-id">
                          <Icon name={SOURCE_ICON[r.source] || 'policy'} size={13} style={{ color: 'var(--mut)' }} />
                          <span className="trunc">
                            <span style={{ display: 'block' }}>{r.name}</span>
                            <span className="cell-sub">{r.source}</span>
                          </span>
                        </span>
                      </td>
                      <td><span className="code">{r.condition}</span></td>
                      <td>{r.scope}</td>
                      <td>
                        <Pill tone={r.mode.startsWith('Permanent') ? 'mut' : r.mode.startsWith('Just-in-time') ? 'ok' : 'acc'}>
                          {r.mode}
                        </Pill>
                      </td>
                      <td className="td-num">{num(r.matched)}</td>
                      <td><Pill tone={statusTone(r.status === 'Under review' ? 'Pending' : r.status)} dot>{r.status}</Pill></td>
                      <td className="td-mono">{r.evaluated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Evaluation order" sub="The first rule that matches wins; later sources can only add, never remove">
          <div className="chain">
            {CHAIN.map((c, i) => (
              <div className="chain-step" key={c.id} data-state={i === 1 ? 'current' : undefined}>
                <span className="cs-n" style={{ background: c.tone }}>{c.id}</span>
                <div className="cs-m">
                  <div className="cs-t">{c.t}</div>
                  <div className="cs-s">{c.s}</div>
                </div>
                <span className="cs-r">
                  <span className="tag num">
                    {num(rules.filter((r) => (
                      (i === 0 && r.source === 'HR attribute')
                      || (i === 1 && (r.source === 'Dynamic policy' || r.source === 'Scheduler' || r.source === 'Application record'))
                      || (i === 2 && r.source === 'Access request')
                      || (i === 3 && r.source === 'Manual grant')
                    )).length)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="stack">
        <Card title="Coverage" sub="How this role reaches the directory">
          <KeyValue
            cols={1}
            rows={[
              { k: 'Rules attached', v: num(rules.length), icon: 'policy' },
              { k: 'Identities matched by rule', v: num(covered), icon: 'users' },
              { k: 'Total holders', v: num(memberCount), icon: 'roles' },
              { k: 'Granted without a rule', v: num(Math.max(0, memberCount - covered)), icon: 'warn' },
            ]}
          />
        </Card>

        {memberCount - covered > 0 && (
          <div className="banner" data-tone="warn">
            <Icon name="warn" size={15} />
            <div>
              {num(memberCount - covered)} holders cannot be explained by any attached rule. They were granted by hand
              and should be the first assignments the role owner re-checks.
            </div>
          </div>
        )}

        <Card title="Related" sub="Where these rules are maintained">
          <div className="stack" style={{ gap: 8 }}>
            <Button icon="policy" onClick={() => navigate('/iam/dynamicPolicy')}>Dynamic policy</Button>
            <Button icon="request" onClick={() => navigate('/iam/requests')}>Access requests</Button>
            <Button icon="sod" onClick={() => navigate('/iam/segregationofduties/rules')}>Segregation of duties</Button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', `Assignment rules for ${role.name} queued as CSV.`)}>Export rules</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function ActivityTab({ role, memberCount }) {
  const { navigate, toast } = useApp()
  const events = eventsFor(role)
  const modules = Object.keys(role.perms).length

  const provenance = [
    {
      id: 'p1', tone: 'acc', icon: 'roles',
      t: 'Role created',
      s: role.system
        ? 'Defined by the platform at install time.'
        : 'Created by admin from the role catalog.',
      time: role.system ? '2025-01-04 00:00' : '2025-11-18 10:20',
    },
    {
      id: 'p2', tone: 'warn', icon: 'edit',
      t: 'Permission set modified',
      s: `${num(role.permCount)} permissions across ${num(modules)} modules after the change. Recorded against change CHG-${4200 + role.id * 7}.`,
      time: '2026-06-22 14:05',
    },
    {
      id: 'p3', tone: 'ok', icon: 'users',
      t: 'Membership reconciled',
      s: `${num(memberCount)} direct assignments confirmed against the directory sample.`,
      time: '2026-08-05 03:00',
    },
  ]

  return (
    <div className="detail-cols">
      <Card title="Timeline" sub="Change provenance and the access events this role produced" flush>
        <div style={{ padding: 'var(--sp-4)' }}>
          <div className="tl">
            {provenance.map((e) => (
              <div className="tl-it" key={e.id} data-tone={e.tone}>
                <span className="tl-dot"><Icon name={e.icon} size={8} stroke={2.6} /></span>
                <div className="tl-t">{e.t}</div>
                <div className="tl-s">{e.s}</div>
                <div className="tl-time">{e.time}</div>
              </div>
            ))}
            {events.map((e) => (
              <div className="tl-it" key={e.id} data-tone={e.outcome === 'Denied' ? 'bad' : e.level === 'WARN' ? 'warn' : e.level === 'ERROR' ? 'bad' : 'acc'}>
                <span className="tl-dot"><Icon name={e.outcome === 'Denied' ? 'ban' : 'check'} size={8} stroke={3} /></span>
                <div className="tl-t">{e.action}</div>
                <div className="tl-s">{e.category} · {e.actor} · {e.target}</div>
                <div className="tl-time">{e.ts} · {e.ip} · {e.outcome}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="stack">
        <Card title="Recordkeeping" sub="Where this role's changes are tracked">
          <KeyValue
            cols={1}
            rows={[
              { k: 'Owner', v: role.system ? 'Platform owner' : 'Role owner', icon: 'user' },
              { k: 'Change record', v: `CHG-${4200 + role.id * 7}`, icon: 'file' },
              { k: 'Retention', v: 'Role events retained for 7 years', icon: 'history' },
            ]}
          />
        </Card>

        <Card title="Actions">
          <div className="stack" style={{ gap: 8 }}>
            <Button icon="logs" onClick={() => navigate('/iam/syslogs')}>Open full log</Button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', `Activity for ${role.name} queued as CSV.`)}>Export activity</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
