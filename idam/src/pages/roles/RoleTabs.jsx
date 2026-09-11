import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import KeyValue from '../../components/primitives/KeyValue'
import Avatar from '../../components/primitives/Avatar'
import FileDrop, { formatSize } from '../../components/primitives/FileDrop'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { USERS } from '../../data/seed'
import { CHAIN, SOURCE_ICON, eventsFor } from './roleModel'
import MemberPicker from './MemberPicker'

// Drop zone plus the same preparation guidance the directory import uses.
/* Drop zone plus the same preparation guidance the directory import uses.
   Both directions take the same file — one username per row — so the only thing
   that changes between adding and removing in bulk is what the platform does
   with the names it matches. */
function MemberCsv({ mode, role, count, onFile }) {
  const [file, setFile] = useState(null)
  const removing = mode === 'remove'
  return (
    <div className="stack">
      <div className="banner" data-tone={removing ? 'warn' : 'info'}>
        <Icon name="file" size={15} />
        <div>
          One username per row under a <span className="mono">username</span> header. Rows that do not match a directory
          identity are returned as a downloadable error file and the rest of the {removing ? 'removal' : 'load'} continues.
        </div>
      </div>
      {removing && (
        <div className="banner" data-tone="bad">
          <Icon name="warn" size={15} />
          <div>
            Every username matched in the file loses <b>{role.name}</b>. Each permission the role grants is withdrawn at
            the next provisioning run; access held through another role or request is unaffected. {count} {count === 1 ? 'identity holds' : 'identities hold'} the
            role today.
          </div>
        </div>
      )}
      <FileDrop
        accept=".csv"
        label={file ? file.name : 'Drag the CSV here, or browse'}
        hint={file
          ? `${formatSize(file.size)} · ready to ${removing ? 'process' : 'import'}`
          : 'UTF-8, comma separated, first row must be the header'}
        onFiles={(files) => { setFile(files[0]); onFile(files[0]) }}
      />
    </div>
  )
}

export function MembersTab({ role, memberIds, onAdd, onRemove }) {
  const { navigate, toast, confirm, setDrawer } = useApp()

  const rows = useMemo(() => {
    const set = new Set(memberIds)
    return USERS.filter((u) => set.has(u.id))
  }, [memberIds])

  const available = useMemo(() => {
    const set = new Set(memberIds)
    return USERS.filter((u) => !set.has(u.id))
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

  // Members arrive as an HR extract far more often than they leave as one, so
  // the toolbar carries an import. The per-selection export is left in place.
  /* Members arrive as an HR extract, and they leave as one too — a joiners file
     and a leavers file are the same shape. Both directions take a CSV here; the
     register's own bulk bar covers taking out a handful by hand. */
  const openCsv = (mode) => {
    const removing = mode === 'remove'
    let chosen = null
    setDrawer({
      title: removing ? 'Bulk remove members' : 'Import members',
      sub: removing
        ? `Take identities out of ${role.name} in bulk from a CSV.`
        : `Add identities to ${role.name} in bulk from a CSV.`,
      children: <MemberCsv mode={mode} role={role} count={rows.length} onFile={(f) => { chosen = f }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant={removing ? 'danger' : 'pri'}
            icon="upload"
            onClick={() => {
              if (!chosen) {
                toast('warn', 'No file selected', 'Choose a CSV that lists one username per row.')
                return
              }
              // Nothing is parsed in the demo build: the file stands in for the
              // upload, and the platform acts on the identities it would match.
              const held = new Set(memberIds)
              const matched = removing
                ? USERS.filter((u) => held.has(u.id)).slice(0, 8).map((u) => u.id)
                : USERS.filter((u) => !held.has(u.id)).slice(0, 8).map((u) => u.id)
              if (matched.length === 0) {
                toast('warn', 'Nothing to do', removing
                  ? 'No username in the file matches an identity holding this role.'
                  : 'Every username in the file already holds this role.')
                return
              }
              setDrawer(null)
              if (removing) {
                confirmRemove(matched, null, chosen.name)
                return
              }
              onAdd(matched)
              toast('ok', 'Members imported', `${matched.length} identities added to ${role.name} from ${chosen.name}.`)
            }}
          >
            {removing ? 'Remove members' : 'Import'}
          </Button>
        </>
      ),
    })
  }

  const confirmRemove = (ids, clear, fromFile) => confirm({
    title: ids.length === 1 ? 'Remove this identity from the role?' : `Remove ${ids.length} identities from the role?`,
    body: `${fromFile ? `${ids.length} usernames in ${fromFile} matched an identity holding this role. ` : ''}Every permission granted by ${role.name} is withdrawn at the next provisioning run. Access granted by another role or request is unaffected.`,
    confirmLabel: `Remove ${ids.length}`,
    onConfirm: () => {
      onRemove(ids)
      if (clear) clear()
      toast('ok', 'Members removed', `${ids.length} ${ids.length === 1 ? 'identity' : 'identities'} removed from ${role.name}.`)
    },
  })

  /* Both directions open the same picker in a drawer, so the register behind it
     stays where the operator left it instead of being pushed down the page by a
     panel that grows as they search. */
  const openPicker = () => setDrawer({
    size: 'xl',
    title: 'Add members',
    sub: `Choose identities to grant ${role.name}.`,
    children: (
      <MemberPicker
        role={role}
        source={available}
        onCancel={() => setDrawer(null)}
        onCommit={(ids) => {
          onAdd(ids)
          setDrawer(null)
          toast('ok', 'Members added', `${ids.length} ${ids.length === 1 ? 'identity' : 'identities'} added to ${role.name}.`)
        }}
      />
    ),
    footer: <Button onClick={() => setDrawer(null)}>Close</Button>,
  })

  return (
    <div className="stack">
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
            <Button size="sm" icon="plus" onClick={openPicker}>Add members</Button>
            <Button size="sm" icon="upload" onClick={() => openCsv('add')}>Import members</Button>
            {/* Members arrived as a CSV but could only leave one tick at a time.
                A leavers file is the same shape as a joiners file. */}
            <Button size="sm" icon="minus" disabled={rows.length === 0} onClick={() => openCsv('remove')}>Bulk remove</Button>
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
