import DataWorkbench from '../../components/workbench/DataWorkbench'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Switch from '../../components/primitives/Switch'
import Avatar from '../../components/primitives/Avatar'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { TODAY, auditFor, profileFor } from './orgModel'

export function OverviewTab({ org, orgs, members, kids, resolved, onInherit, onTab }) {
  const { navigate } = useApp()
  const prof = profileFor(org)
  const active = members.filter((u) => u.status === 'Active').length
  const locked = members.filter((u) => u.status === 'Locked').length
  const disabled = members.filter((u) => u.status === 'Disabled').length
  const pending = members.filter((u) => u.status === 'Pending').length
  const share = members.length ? Math.round((active / members.length) * 100) : 0
  const p = resolved.policy

  return (
    <div className="detail-cols">
      <div className="stack">
        <div className="stat-strip">
          <div className="stat-cell" data-nav="true" onClick={() => onTab('identities')}>
            <span className="stat-k"><Icon name="users" size={12} />Licensed</span>
            <span className="stat-v">{num(org.users)}</span>
          </div>
          <div className="stat-cell" data-nav="true" onClick={() => onTab('identities')}>
            <span className="stat-k"><Icon name="checkC" size={12} />Active</span>
            <span className="stat-v">{num(active)}</span>
          </div>
          <div className="stat-cell" data-nav="true" onClick={() => onTab('children')}>
            <span className="stat-k"><Icon name="layers" size={12} />Sub-orgs</span>
            <span className="stat-v">{num(kids.length)}</span>
          </div>
        </div>

        <Card title="Organization record" sub={prof.description}>
          <KeyValue
            cols={2}
            rows={[
              { k: 'Short code', v: prof.code, icon: 'tag' },
              { k: 'Parent organization', v: org.parent || 'None (root)', icon: 'hierarchy' },
              { k: 'Contact mailbox', v: prof.contact, icon: 'mail' },
              { k: 'Primary region', v: prof.region, icon: 'mapPin' },
              { k: 'Time zone', v: prof.timezone, icon: 'clock' },
              { k: 'Status', node: <Pill tone={statusTone(org.status)} dot>{org.status}</Pill>, icon: 'checkC' },
              { k: 'Created on', v: org.createdOn, icon: 'history' },
              {
                k: 'Verified domains',
                node: prof.domains.length
                  ? <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>{prof.domains.map((d) => <span className="tag mono" key={d}>{d}</span>)}</span>
                  : 'None',
                icon: 'globe',
              },
              { k: 'Network restriction', v: prof.ipPolicy, icon: 'noentry' },
            ]}
          />
        </Card>

        <Card
          title="Password policy"
          sub={resolved.inheritedFrom
            ? `Inherited from ${resolved.inheritedFrom}`
            : 'Defined directly on this organization'}
          actions={<Button size="sm" icon="lock" onClick={() => navigate('/iam/passwordPolicy')}>Open policy</Button>}
        >
          <div className="stack">
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Pill tone="acc" icon="lock">{resolved.name}</Pill>
              <Pill tone={org.inherit ? 'acc' : 'mut'} icon={org.inherit ? 'link' : 'target'}>
                {org.inherit ? 'Inherits configuration' : 'Explicit configuration'}
              </Pill>
              <span className="t-xs t-mut">{num(p.users)} identities across the tenant use this policy</span>
            </div>

            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <Switch
                checked={org.inherit}
                onChange={onInherit}
                label="Inherit parent configuration"
                disabled={!org.parent}
              />
              <div>
                <div className="t-sm" style={{ fontWeight: 'var(--w-semi)' }}>Inherit parent configuration</div>
                <div className="t-xs t-mut" style={{ marginTop: 2, lineHeight: 1.5 }}>
                  {org.parent
                    ? <>Resolution path: {resolved.chain.map((c, i) => <span key={c}>{i > 0 && ' → '}<b>{c}</b></span>)} → <b>{resolved.name}</b>.</>
                    : 'This is the tenant root, so its policy cannot be inherited from anywhere else.'}
                </div>
              </div>
            </div>

            <KeyValue
              cols={2}
              rows={[
                { k: 'Minimum length', v: `${p.minLength} characters`, icon: 'sliders' },
                { k: 'History retained', v: `${p.history} passwords`, icon: 'history' },
                { k: 'Expiry', v: p.expiryDays === 0 ? 'Does not expire' : `${p.expiryDays} days`, icon: 'clock' },
                { k: 'Lockout threshold', v: `${p.lockoutAttempts} failed attempts`, icon: 'lock' },
                { k: 'Lockout window', v: `${p.lockoutMins} minutes`, icon: 'clock' },
                { k: 'Dictionary check', node: <Pill tone={p.dictionary ? 'ok' : 'warn'} dot>{p.dictionary ? 'Enforced' : 'Off'}</Pill>, icon: 'file' },
                { k: 'MFA required', node: <Pill tone={p.mfaRequired ? 'ok' : 'warn'} dot>{p.mfaRequired ? 'Required' : 'Optional'}</Pill>, icon: 'shield' },
                { k: 'Also applied to', v: p.orgs.filter((o) => o !== org.name).join(', ') || 'This organization only', icon: 'layers' },
              ]}
            />

          </div>
        </Card>
      </div>

      <div className="stack">
        <Card title="Directory footprint" sub="Status split across the sampled identities">
          <div className="row" style={{ gap: 18, alignItems: 'center' }}>
            <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
              {[
                { k: 'Active', v: active, tone: 'ok' },
                { k: 'Locked', v: locked, tone: 'bad' },
                { k: 'Disabled', v: disabled, tone: 'mut' },
                { k: 'Pending', v: pending, tone: 'warn' },
              ].map((r) => (
                <div className="row-between" key={r.k}>
                  <Pill tone={r.tone} dot>{r.k}</Pill>
                  <span className="t-sm num" style={{ fontWeight: 'var(--w-semi)' }}>{num(r.v)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Hierarchy" sub="Where this organization sits" actions={<Button size="sm" icon="hierarchy" onClick={() => navigate('/iam/organizationHierarchy')}>Tree</Button>}>
          <div className="stack" style={{ gap: 2 }}>
            {org.parent ? (
              <button
                type="button"
                className="otree-row"
                onClick={() => {
                  const parent = orgs.find((o) => o.name === org.parent)
                  if (parent) navigate(`/iam/organizations/${parent.id}`)
                }}
              >
                <span className="ot-ic"><Icon name="building" size={13} /></span>
                <span className="ot-n">{org.parent}</span>
                <span className="ot-c">parent</span>
              </button>
            ) : null}
            <div className="otree-row" data-on="true" style={{ paddingLeft: org.parent ? 16 : 0 }}>
              <span className="ot-ic"><Icon name="layers" size={13} /></span>
              <span className="ot-n">{org.name}</span>
              <span className="ot-c">{num(org.users)}</span>
            </div>
            {kids.map((c) => (
              <button
                key={c.id}
                type="button"
                className="otree-row"
                style={{ paddingLeft: org.parent ? 32 : 16 }}
                onClick={() => navigate(`/iam/organizations/${c.id}`)}
              >
                <span className="ot-ic"><Icon name="layers" size={13} /></span>
                <span className="ot-n">{c.name}</span>
                <span className="ot-c">{num(c.users)}</span>
              </button>
            ))}
            {kids.length === 0 && <div className="t-xs t-mut" style={{ padding: '8px 0 0' }}>No sub-organizations.</div>}
          </div>
        </Card>

        <Card
          title="Delegated administration"
          sub="Who can act inside this scope"
          actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('/iam/roles')}>Roles</Button>}
        >
          <div className="feed">
            <div className="feed-it">
              <span className="feed-ic" data-tone="acc"><Icon name="user" size={13} /></span>
              <div className="feed-m">
                <div className="feed-t">{prof.owner}</div>
                <div className="feed-s"><span>Organization owner</span><Pill tone="acc" icon="approve">Attests quarterly</Pill></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function IdentitiesTab({ org, members }) {
  const { navigate, toast } = useApp()

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
    { key: 'department', label: 'Department' },
    { key: 'employeeType', label: 'Type', render: (r) => <span className="tag">{r.employeeType}</span> },
    { key: 'designation', label: 'Designation' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    { key: 'lastLogin', label: 'Last sign-in', cls: 'td-mono' },
  ]

  return (
    <DataWorkbench
      id="org-identities"
      rows={members}
      columns={columns}
      selectable
      searchPlaceholder={`Search identities in ${org.name}…`}
      onRowClick={(r) => navigate(`/iam/users/${r.id}`)}
      rowActions={(r) => [
        { id: 'open', label: 'Open identity', icon: 'eye', onSelect: () => navigate(`/iam/users/${r.id}`) },
        { id: 'edit', label: 'Edit attributes', icon: 'edit', onSelect: () => navigate(`/iam/users/${r.id}/edit`) },
        { divider: true },
        { id: 'move', label: 'Move to another organization', icon: 'swap', onSelect: () => toast('info', 'Move identity', `${r.username} can be reassigned from the identity record.`) },
      ]}
      bulkActions={(ids, clear) => (
        <>
          <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} identities queued for CSV export.`)}>Export</Button>
          <Button size="sm" icon="certify" onClick={() => { toast('ok', 'Sent to attestation', `${ids.length} identities added to the next campaign.`); clear() }}>Send to attestation</Button>
        </>
      )}
      toolbar={(
        <>
          <Button size="sm" icon="plus" onClick={() => navigate('/iam/users/add')}>New identity</Button>
          <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${members.length} identities queued for CSV export.`)}>Export</Button>
        </>
      )}
      emptyTitle="No identities in this organization"
      emptyBody="Nothing in the current directory sample is scoped here. Create an identity or move one across."
      emptyIcon="users"
      footNote={`${num(members.length)} sampled of ${num(org.users)} licensed seats`}
    />
  )
}

export function ChildrenTab({ org, kids }) {
  const { navigate, toast } = useApp()

  if (kids.length === 0) {
    return (
      <EmptyState
        icon="layers"
        title="No sub-organizations"
        body={`${org.name} has no children. Create one to delegate administration or to pin a different password policy to part of the estate.`}
        actions={<Button variant="pri" icon="plus" onClick={() => navigate('/iam/organizations/add')}>New sub-organization</Button>}
      />
    )
  }

  const columns = [
    {
      key: 'name', label: 'Sub-organization', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id">
          <Icon name="layers" size={14} style={{ color: 'var(--mut)' }} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.name}</span>
            <span className="cell-sub">{profileFor(r).owner}</span>
          </span>
        </span>
      ),
    },
    { key: 'passwordPolicy', label: 'Password policy' },
    { key: 'inherit', label: 'Inherits', value: (r) => (r.inherit ? 'Yes' : 'No'), render: (r) => <Pill tone={r.inherit ? 'acc' : 'mut'} dot>{r.inherit ? 'Yes' : 'No'}</Pill> },
    { key: 'users', label: 'Identities', align: 'right', render: (r) => num(r.users) },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    { key: 'createdOn', label: 'Created', cls: 'td-mono' },
  ]

  return (
    <DataWorkbench
      id="org-children"
      rows={kids}
      columns={columns}
      search={false}
      onRowClick={(r) => navigate(`/iam/organizations/${r.id}`)}
      rowActions={(r) => [
        { id: 'open', label: 'Open organization', icon: 'eye', onSelect: () => navigate(`/iam/organizations/${r.id}`) },
        { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`/iam/organizations/${r.id}/edit`) },
        { id: 'ids', label: 'View identities', icon: 'users', onSelect: () => navigate(`/iam/organizations/${r.id}`) },
      ]}
      toolbar={(
        <>
          <Button size="sm" icon="plus" onClick={() => navigate('/iam/organizations/add')}>New sub-organization</Button>
          <Button size="sm" icon="hierarchy" onClick={() => navigate('/iam/organizationHierarchy')}>Hierarchy</Button>
          <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${kids.length} sub-organizations queued for CSV export.`)}>Export</Button>
        </>
      )}
      emptyTitle="No sub-organizations"
      emptyBody="Create one to delegate administration."
      emptyIcon="layers"
      footNote={`${num(kids.reduce((a, c) => a + c.users, 0))} identities roll up through these children`}
    />
  )
}

export function AuditTab({ org, members, kids }) {
  const { navigate, toast } = useApp()
  const prof = profileFor(org)
  const events = auditFor(org)

  const provenance = [
    {
      id: 'p1', tone: 'acc', icon: 'building',
      t: 'Organization created',
      s: `Created by admin as ${org.parent ? `a child of ${org.parent}` : 'a tenant root'}.`,
      time: org.createdOn,
    },
    {
      id: 'p2', tone: 'ok', icon: 'refresh',
      t: 'Structure synchronized from Workday HR',
      s: `${num(org.users)} licensed seats confirmed. ${num(kids.length)} sub-organizations rolled up.`,
      time: TODAY,
    },
    {
      id: 'p3', tone: org.inherit ? 'mut' : 'warn', icon: 'lock',
      t: org.inherit ? 'Policy inheritance confirmed' : `Password policy pinned to ${org.passwordPolicy}`,
      s: org.inherit
        ? `Configuration follows ${org.parent || 'the tenant root'} with no local override.`
        : `${prof.owner} accepted the deviation from the parent configuration.`,
      time: org.createdOn,
    },
  ]

  return (
    <div className="detail-cols">
      <Card title="Change and access history" sub="Everything recorded against this organization scope" flush>
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
        <Card title="Provenance" sub="Where this record comes from">
          <KeyValue
            cols={1}
            rows={[
              { k: 'Source of truth', v: 'Workday HR (SCIM 2.0)', icon: 'swap' },
              { k: 'Reconciliation job', v: 'reconcileAllQueue', icon: 'jobs' },
              { k: 'Last synchronized', v: TODAY, icon: 'refresh' },
              { k: 'Created on', v: org.createdOn, icon: 'history' },
              { k: 'Created by', v: 'admin', icon: 'user' },
              { k: 'Record owner', v: prof.owner, icon: 'approve' },
              { k: 'Retention', v: 'Audit events retained for 7 years', icon: 'file' },
            ]}
          />
        </Card>

        <Card title="Attestation" sub="Owner decisions on this scope">
          <div className="stack">
            <div className="row-between">
              <span className="t-sm">Identities awaiting review</span>
              <span className="t-sm num" style={{ fontWeight: 'var(--w-semi)' }}>{num(members.filter((u) => u.status !== 'Active').length)}</span>
            </div>
            <Meter value={62} tone="warn" />
            <div className="t-xs t-mut">
              The Q3 2026 Finance Access Review covers this scope and closes in 9 days.
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button size="sm" icon="certify" onClick={() => navigate('/iam/recertification')}>Open campaign</Button>
              <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `Audit trail for ${org.name} queued as CSV.`)}>Export trail</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
