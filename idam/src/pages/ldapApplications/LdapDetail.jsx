import { useMemo, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import Switch from '../../components/primitives/Switch'
import {
  Skeleton, SkeletonCard, SkeletonForm, SkeletonKeyValue, SkeletonList, SkeletonTable,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import AuthTestForm from './LdapAuthTest'
import LdapDirectory from './LdapDirectory'
import LdapProvisioning from './LdapProvisioning'
import LdapUsers from './LdapUsers'
import { duration, num, pct, statusTone } from '../../lib/format'
import {
  CustomAttributeTable, HealthBar, MappingBulkEditor, MappingTable, Tiles, Timeline,
} from './LdapShared'
import {
  LDAP_VERSIONS, OWNER_OPTIONS, composeUrl, connectionDefaults, customAttributes, errorBreakdown,
  fetchDns, healthNote, healthTiles, latencySeries, schemaFacts, syncHistory,
} from './ldapModel'

/* The tabs whose panel is cards and fields, and so has a shape of its own to
   hold. The three that are not listed hold their own space — see PanelSkeleton
   below for why. */
const PANEL_SHAPES = ['general', 'connection', 'authentication', 'options', 'attributes']

/* The joined figure strip a directory opens with — `Tiles` is `.stat-strip`
   geometry, not the tile grid the kit's `SkeletonStats` draws, so the shape is
   built from the real rule's own classes. Each bar states the line box its type
   prints: a bar carries no text of its own to set one, and a strip that comes
   up short moves everything under it when the figures arrive. */
function StatStripSkeleton({ cells = 6 }) {
  return (
    <div className="stat-strip ldap-skel-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-k"><span className="skel" style={{ width: 76 + (i % 3) * 18, height: 8 }} /></span>
          <span className="stat-v"><span className="skel" style={{ width: 54 + (i % 2) * 22, height: 15 }} /></span>
          <span className="skel" style={{ width: `${58 + (i % 3) * 12}%`, height: 8, marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

/* Each tab is a different read of the directory, so each waits behind the shape
   of what it is actually waiting for rather than behind one generic body.
   Magnitude is what matters: a panel that resolves into something much taller
   than the shape that held its place scrolls the page out from under the
   reader.

   Three tabs are deliberately absent. Directory has read nothing on arrival —
   it opens on its own "nothing read yet" state and fetches a level at a time
   when asked — so a skeleton there would promise a tree that is not coming.
   Users and Provisioning rules are registers, and a register settles its own
   rows from a `loading` prop, which leaves the search box the operator is about
   to type into alive rather than replacing it with a grey rectangle. */
function PanelSkeleton({ tab }) {
  if (tab === 'connection') {
    return (
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><SkeletonForm fields={4} actions={false} /></SkeletonCard>
          <SkeletonCard><SkeletonForm fields={3} actions={false} /></SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={1} rows={5} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue cols={1} rows={5} /></SkeletonCard>
        </div>
      </div>
    )
  }

  if (tab === 'options') {
    return (
      <div className="detail-cols">
        <SkeletonCard><SkeletonForm fields={5} actions={false} /></SkeletonCard>
        <SkeletonCard><SkeletonKeyValue cols={1} rows={4} /></SkeletonCard>
      </div>
    )
  }

  /* Authentication: the credential the test is run with is typed rather than
     read, and would get no skeleton on a screen of its own. It gets one here
     because it is one card of a panel that arrives whole — greying the activity
     beside it and leaving the card next to it crisp would land the panel in two
     pieces, which is the flicker this is meant to remove. */
  if (tab === 'authentication') {
    return (
      <div className="detail-cols">
        <SkeletonCard><SkeletonForm fields={2} cols={1} actions={false} /></SkeletonCard>
        <SkeletonCard><SkeletonKeyValue cols={1} rows={4} /></SkeletonCard>
      </div>
    )
  }

  /* Attribute mapping and the table of downstream consumers under it are both
     `flush` cards — a table brings its own row gutters, so the shape holding
     one carries no body padding either. The card between them holds prose and
     keeps its. */
  if (tab === 'attributes') {
    return (
      <div className="stack">
        <SkeletonCard className="dtl-skel-flush" foot><SkeletonTable rows={8} cols={5} /></SkeletonCard>
        <SkeletonCard lines={2} />
        <SkeletonCard className="dtl-skel-flush" foot><SkeletonTable rows={5} cols={4} /></SkeletonCard>
      </div>
    )
  }

  /* General: the record and its quick links, then the figure strip again over
     the synchronization history and the narrow column of health, run activity
     and server capabilities. */
  return (
    <div className="stack">
      <StatStripSkeleton cells={6} />
      <div className="detail-cols">
        <SkeletonCard><SkeletonKeyValue cols={2} rows={10} /></SkeletonCard>
        {/* Linked records is a `flush` card of rows, and the synchronization
            history below is a `flush` card of table rows: both bodies bring
            their own gutters, so the shapes holding them bring none. */}
        <SkeletonCard className="dtl-skel-flush"><SkeletonList rows={4} media="square" trailing={false} /></SkeletonCard>
      </div>
      <StatStripSkeleton cells={6} />
      <div className="detail-cols">
        <SkeletonCard className="dtl-skel-flush" foot><SkeletonTable rows={6} cols={6} /></SkeletonCard>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={1} rows={4} /></SkeletonCard>
          <SkeletonCard><SkeletonList rows={5} media={false} trailing={false} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue cols={1} rows={5} /></SkeletonCard>
        </div>
      </div>
    </div>
  )
}

export default function LdapDetail({
  app, tab, onTab, onPatch, onDelete, maps, setMaps, rules = [], setRules,
}) {
  const { toast, confirm, navigate } = useApp()
  const connInitial = useMemo(() => connectionDefaults(app), [app])
  const [conn, setConn] = useState(connInitial)
  const [attrs, setAttrs] = useState(() => customAttributes(app))
  const [editing, setEditing] = useState(null)
  // Base DNs are read from the directory rather than typed, so a mistyped
  // container cannot be saved. The list is empty until the host has answered.
  const [dns, setDns] = useState(null)

  /* One flag for the record, keyed on the directory and the tab together, so
     the record settles as one thing: arriving at a directory is a read, and so
     is opening a different tab, because each tab is a separate read of that
     directory rather than another slice of one already in hand.

     The tab bar itself never greys — it is passed to the masthead outside the
     conditionals below — since a control that disappears under the pointer that
     just used it has been taken away mid-gesture. */
  const loading = useLoading(`${app.id}:${tab}`)

  const connDirty = JSON.stringify(conn) !== JSON.stringify(connInitial)
  const connTls = conn.tls
  const connUrl = composeUrl(conn.host, conn.port, conn.tls)

  const setC = (k, v) => setConn((x) => ({ ...x, [k]: v }))

  const runs = useMemo(() => syncHistory(app), [app])
  const errors = useMemo(() => errorBreakdown(app), [app])
  const spark = useMemo(() => latencySeries(app), [app])
  const mine = useMemo(() => maps.filter((m) => m.directory === app.displayName), [maps, app])
  const myRules = useMemo(() => rules.filter((r) => String(r.applicationId) === String(app.id)), [rules, app.id])

  const tone = app.status === 'Healthy' ? 'ok' : app.status === 'Degraded' ? 'warn' : 'bad'
  const succeeded = runs.filter((r) => r.status === 'Succeeded').length

  const testConnection = () => {
    if (app.status === 'Failed') {
      toast('bad', 'Connection failed', `${app.displayName} did not answer on ${connUrl}.`)
      return
    }
    toast('ok', 'Connection successful', `${connUrl} answered in ${app.bindMs} ms.`)
  }

  const fetchBaseDns = () => {
    if (app.status === 'Failed') {
      toast('bad', 'Cannot read the root DSE', `${connUrl} did not answer.`)
      return
    }
    const found = fetchDns(app)
    setDns(found)
    toast('ok', 'Naming contexts read', `${found.length} base DNs returned by ${conn.host}.`)
  }

  const saveConnection = () => {
    onPatch(app.id, {
      url: connUrl,
      baseDn: conn.baseDn,
      bindDn: conn.bindDn,
      tls: conn.tls,
      protocol: conn.tls ? 'LDAPS' : 'LDAP',
      port: conn.port,
    })
    toast('ok', 'Connection saved', `${app.displayName} will use the new settings from the next bind.`)
  }

  const syncNow = () => {
    toast('ok', 'Synchronization queued', `${app.displayName} is queued for a full read.`)
  }

  // A rule is a child of the directory, so what happens to it on delete is no
  // longer an unstated edge case — the confirmation says it.
  const remove = () => confirm({
    title: `Delete ${app.displayName}?`,
    body: `Identities sourced from ${app.name} stop synchronising immediately. Existing identities are retained but become unmanaged.${
      myRules.length ? ` This will also remove ${myRules.length} provisioning rule${myRules.length === 1 ? '' : 's'}.` : ''
    }`,
    confirmLabel: 'Delete application',
    onConfirm: () => onDelete(app),
  })

  // The editor holds this directory's whole mapping set; new rows carry string
  // ids until they are given numeric ones here.
  const saveMappings = (next) => {
    setMaps((ms) => {
      let id = ms.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0)
      const rows = next.map((r) => (typeof r.id === 'number' ? r : { ...r, id: (id += 1) }))
      return [...ms.filter((m) => m.directory !== app.displayName), ...rows]
    })
    setEditing(null)
    toast('ok', 'Attribute mappings saved', `${next.length} ${next.length === 1 ? 'attribute is' : 'attributes are'} read from ${app.displayName}.`)
  }

  const deleteMapping = (m) => confirm({
    title: `Delete the ${m.idam} mapping?`,
    body: `${m.idam} will no longer be read from ${m.ldap} on the next synchronization.`,
    confirmLabel: 'Delete mapping',
    onConfirm: () => {
      setMaps((ms) => ms.filter((x) => x.id !== m.id))
      toast('ok', 'Mapping deleted', `${m.idam} to ${m.ldap}`)
    },
  })

  const runsTable = (rows) => (
    <div style={{ overflowX: 'auto' }}><table className="tbl">
      <thead>
        <tr>
          <th>Run</th>
          <th>Started</th>
          <th>Duration</th>
          <th className="td-num">Read</th>
          <th className="td-num">Created</th>
          <th className="td-num">Updated</th>
          <th className="td-num">Deleted</th>
          <th>Triggered by</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="td-main mono">{r.runId}</td>
            <td className="td-mono">{r.started}</td>
            <td className="td-mono">{duration(r.durationMs)}</td>
            <td className="td-num">{num(r.read)}</td>
            <td className="td-num">{num(r.created)}</td>
            <td className="td-num">{num(r.updated)}</td>
            <td className="td-num">{num(r.deleted)}</td>
            <td>{r.triggeredBy}</td>
            <td><Pill tone={statusTone(r.status)} dot>{r.status}</Pill></td>
          </tr>
        ))}
      </tbody>
    </table></div>
  )

  return (
    <>
      {/* The masthead is the real `DetailHeader` while it settles rather than an
          imitation of one: the crumb row, the gutters, the tab row and every gap
          between them are the component's own, so the directory lands in exactly
          the box that was holding its place. Only the record's own content is
          grey — the tab bar is chrome and stays live throughout. */}
      <DetailHeader
        backTo="/iam/ldapapplications"
        backLabel="LDAP Applications"
        eyebrow="Directory connection"
        title={loading ? <span className="skel dtl-skel-title" aria-hidden="true" /> : app.displayName}
        sub={loading ? (
          /* Two bars, because the sentence below wraps to two lines inside the
             100ch `.detail-sub` is capped at — for every directory in the
             estate. One bar held one line and the tab strip stepped down when
             the sentence landed. */
          <span className="dtl-skel-sub" aria-hidden="true">
            <span className="skel" />
            <span className="skel" />
          </span>
        ) : `${app.description} The platform binds as ${app.bindDn} and reads ${num(app.entries)} entries under ${app.baseDn}.`}
        media={loading ? <span className="skel dtl-skel-media" aria-hidden="true" /> : (
          <span className="feed-ic" data-tone={tone === 'ok' ? 'acc' : tone} style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)' }}>
            <Icon name="directory" size={26} />
          </span>
        )}
        badges={loading ? <span className="skel skel-chip" style={{ width: 76 }} aria-hidden="true" /> : (
          <>
            <Pill tone={statusTone(app.status)} dot>{app.status}</Pill>
            <Tag tone={app.tls ? 'acc' : undefined}>{app.protocol}</Tag>
            {!app.tls && <Pill tone="warn" icon="warn">No transport encryption</Pill>}
            {app.failedBinds > 100 && <Pill tone="bad" icon="ban">{num(app.failedBinds)} failed binds</Pill>}
          </>
        )}
        meta={loading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <span className="dtl-skel-fact" key={i} aria-hidden="true">
                <span className="skel" style={{ width: 96 + (i % 3) * 26, height: 9 }} />
              </span>
            ))}
          </>
        ) : (
          <>
            <Fact icon="tag" label="Name" value={<span className="mono">{app.name}</span>} />
            <Fact icon="globe" label="URL" value={<span className="mono">{app.url}</span>} />
            <Fact icon="users" label="Entries" value={num(app.entries)} />
            <Fact icon="building" label="Owner" value={app.owner} />
            <Fact icon="clock" label="Last sync" value={app.lastSync} />
          </>
        )}
        actions={loading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <span className="skel skel-btn" key={i} style={{ width: 84 + (i % 3) * 22 }} aria-hidden="true" />
            ))}
          </>
        ) : (
          <>
            <Button icon="play" onClick={testConnection}>Test connection</Button>
            <Button icon="user" onClick={() => onTab('authentication')}>Test authentication</Button>
            <Button icon="refresh" onClick={syncNow}>Sync now</Button>
            <Button icon="edit" onClick={() => navigate(`/iam/ldapapplications/${app.id}/edit`)}>Edit</Button>
            <Button variant="danger" icon="trash" onClick={remove}>Delete</Button>
          </>
        )}
        tabs={
          <Tabs
            value={tab}
            onChange={onTab}
            tabs={[
              { id: 'general', label: 'General', icon: 'dashboard' },
              { id: 'connection', label: 'Connection', icon: 'server' },
              { id: 'authentication', label: 'Authentication', icon: 'key' },
              { id: 'directory', label: 'Directory', icon: 'directory' },
              { id: 'users', label: 'Users', icon: 'users', count: app.entries },
              { id: 'attributes', label: 'Attributes', icon: 'swap', count: mine.length + attrs.length },
              { id: 'provisioning', label: 'Provisioning rules', icon: 'policy', count: myRules.length },
              { id: 'options', label: 'Options', icon: 'sliders' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {/* The screen's one announcing region, so the record says once that it
            is on its way. Every shape is decoration — the bars in the masthead
            above and the rows a register draws for itself below — and the
            region is rendered even for the tabs that have no panel shape of
            their own, because the masthead is still grey while they settle. */}
        {loading && (
          <Skeleton label={`Loading ${app.displayName}`}>
            {PANEL_SHAPES.includes(tab) ? <PanelSkeleton tab={tab} /> : null}
          </Skeleton>
        )}

        {!loading && tab === 'general' && (
          <div className="stack">
            {app.status !== 'Healthy' && (
              <Banner tone={app.status === 'Failed' ? 'bad' : 'warn'}>
                <b>{app.displayName} is {app.status.toLowerCase()}.</b> {healthNote(app)}{' '}
                {app.lastError && <span className="mono">{app.lastError}</span>}
              </Banner>
            )}

            <Tiles items={healthTiles(app)} />

            <div className="detail-cols">
              <div className="stack">
                <Card title="Directory record" sub="What the platform knows about this connection">
                  <KeyValue
                    cols={2}
                    rows={[
                      { k: 'Name', v: <span className="mono">{app.name}</span>, icon: 'tag' },
                      { k: 'Display name', v: app.displayName, icon: 'directory' },
                      { k: 'URL', v: <span className="mono t-xs">{app.url}</span>, icon: 'globe' },
                      { k: 'Port', v: app.port, icon: 'server' },
                      { k: 'Base DN', v: <span className="mono t-xs">{app.baseDn}</span>, icon: 'branch' },
                      { k: 'Bind DN', v: <span className="mono t-xs">{app.bindDn}</span>, icon: 'key' },
                      { k: 'Server', v: app.vendor, icon: 'server' },
                      { k: 'Transport', v: app.tls ? 'TLS 1.3, certificate valid to 2027-04-18' : 'Plain text, no transport encryption', icon: 'shield' },
                      { k: 'Owner', v: app.owner, icon: 'building' },
                      { k: 'Created on', v: app.createdOn, icon: 'history' },
                      { k: 'Description', v: app.description, icon: 'info' },
                    ]}
                  />
                </Card>

                <Card
                  title="Recent synchronizations"
                  sub={`${succeeded} of ${runs.length} runs succeeded`}
                  flush
                  actions={
                    <>
                      <Button size="sm" icon="jobs" onClick={() => navigate('/iam/jobs')}>Job history</Button>
                      <Button size="sm" variant="pri" icon="refresh" onClick={syncNow}>Sync now</Button>
                    </>
                  }
                  footer={<span>Runs are retained for 90 days and recorded on the audit trail.</span>}
                >
                  {runsTable(runs.slice(0, 4))}
                </Card>

                <Card title="What this connection feeds" sub="Records that depend on this directory" flush>
                  <div style={{ overflowX: 'auto' }}><table className="tbl">
                    <thead>
                      <tr>
                        <th>Record</th>
                        <th className="td-num">Count</th>
                        <th>Effect if this directory stops answering</th>
                        <th className="td-act" />
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Identities sourced', n: app.entries, effect: 'Attribute changes stop flowing. Existing identities become unmanaged.', to: '/iam/users' },
                        { label: 'Groups resolved', n: Math.round(app.entries * 0.14) + 3, effect: 'Membership changes are no longer detected.', to: '/iam/applicationGroups' },
                        { label: 'Attribute mappings', n: mine.length, effect: 'Mapped attributes hold their last known value.', to: `/iam/ldapapplications/${app.id}/mapping` },
                        { label: 'Custom attributes', n: attrs.length, effect: 'Custom values are no longer refreshed.', to: `/iam/ldapapplications/${app.id}/attributes` },
                        { label: 'Scheduled jobs', n: 2, effect: 'Runs fail immediately and raise an operations alert.', to: '/iam/schedulers' },
                      ].map((r) => (
                        <tr key={r.label} style={{ cursor: 'pointer' }} onClick={() => navigate(r.to)}>
                          <td className="td-main">{r.label}</td>
                          <td className="td-num">{num(r.n)}</td>
                          <td className="trunc" style={{ maxWidth: 420 }}>{r.effect}</td>
                          <td className="td-act"><Icon name="chevR" size={13} style={{ color: 'var(--faint)' }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </Card>
              </div>

              <div className="stack">
                <Card title="Health" sub={`${app.status} · ${app.vendor}`}>
                  <HealthBar value={app.uptime} tone={tone} note={healthNote(app)} />
                  <div className="row-between" style={{ marginTop: 14 }}>
                    <span className="t-sm">Bind latency <b className="num">{app.bindMs ? `${app.bindMs} ms` : '—'}</b></span>
                  </div>
                </Card>

                {errors.length > 0 && (
                  <Card title="Errors, last 24 hours" sub={`${num(app.failedBinds)} operations rejected`}>
                    {app.lastError && (
                      <div style={{ marginTop: 12 }}>
                        <Banner tone={app.status === 'Failed' ? 'bad' : 'warn'}>
                          <b>Last error</b> · <span className="mono">{app.lastError}</span>
                        </Banner>
                      </div>
                    )}
                  </Card>
                )}

                <Card title="Linked records" flush>
                  <div className="stack" style={{ gap: 0 }}>
                    {[
                      { icon: 'users', label: 'Identities', sub: 'Directory-sourced identity records', to: '/iam/users' },
                      { icon: 'jobs', label: 'Jobs', sub: 'Synchronization run history', to: '/iam/jobs' },
                      { icon: 'clock', label: 'Schedulers', sub: 'When this directory is read', to: '/iam/schedulers' },
                      { icon: 'recon', label: 'Trust reconciliation', sub: 'Accounts without a matching identity', to: '/iam/trustReconciliation' },
                      { icon: 'logs', label: 'Directory logs', sub: 'Every bind, search and write', to: '/iam/syslogs' },
                    ].map((l) => (
                      <button key={l.label} className="rec" style={{ width: '100%', textAlign: 'left', padding: '11px var(--sp-4)' }} onClick={() => navigate(l.to)}>
                        <span className="rec-ic"><Icon name={l.icon} size={14} /></span>
                        <span className="rec-m" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="rec-t">{l.label}</span>
                          <span className="rec-s">{l.sub}</span>
                        </span>
                        <Icon name="chevR" size={13} style={{ color: 'var(--faint)', alignSelf: 'center' }} />
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'connection' && (
          <>
            <div className="detail-cols">
              <div className="stack">
                <Card
                  title="Connection"
                  sub="Where the directory answers, and the container the platform reads below"
                  actions={<Button size="sm" icon="play" onClick={testConnection}>Test connection</Button>}
                >
                  <div className="grid grid-2">
                    <Field label="Host" required hint="Hostname or address of the directory server." htmlFor="conn-host">
                      <TextInput id="conn-host" className="mono" value={conn.host} placeholder="ldap-01.tanflow.internal" onChange={(e) => setC('host', e.target.value)} />
                    </Field>
                    <Field label="Port" required htmlFor="conn-port">
                      <TextInput id="conn-port" className="mono" value={conn.port} onChange={(e) => setC('port', e.target.value)} />
                    </Field>

                    <Field label="Transport" span={2} hint="LDAPS moves the bind onto TLS and switches the default port to 636.">
                      <div className="row">
                        <Switch
                          checked={conn.tls}
                          onChange={(v) => setConn((x) => ({
                            ...x,
                            tls: v,
                            port: x.port === (v ? '389' : '636') ? (v ? '636' : '389') : x.port,
                          }))}
                          label="Encrypt the connection (LDAPS)"
                        />
                        <span className="t-sm">Encrypt the connection (LDAPS)</span>
                      </div>
                    </Field>

                    <Field
                      label="Base DN"
                      required
                      span={2}
                      hint={dns
                        ? `${dns.length} naming contexts read from ${conn.host}.`
                        : 'Read the naming contexts from the server rather than typing the container by hand.'}
                      htmlFor="conn-base"
                    >
                      <div className="row" style={{ gap: 8 }}>
                        {dns ? (
                          <Select
                            id="conn-base"
                            className="mono"
                            style={{ flex: 1 }}
                            value={conn.baseDn}
                            options={dns}
                            placeholder="Select Base DN"
                            onChange={(e) => setC('baseDn', e.target.value)}
                          />
                        ) : (
                          <TextInput id="conn-base" className="mono" style={{ flex: 1 }} value={conn.baseDn} onChange={(e) => setC('baseDn', e.target.value)} />
                        )}
                        <Button size="sm" icon="download" disabled={!conn.host} onClick={fetchBaseDns}>Fetch DNs</Button>
                      </div>
                    </Field>
                  </div>

                  <div className="t-xs t-mut" style={{ marginTop: 12 }}>
                    Resolved endpoint <span className="mono">{connUrl}</span>
                  </div>

                  {!connTls && (
                    <div style={{ marginTop: 12 }}>
                      <Banner tone="warn">
                        Credentials travel in clear text on plain LDAP. Turn on LDAPS wherever the target supports it.
                      </Banner>
                    </div>
                  )}
                </Card>

                <Card
                  title="Service credential"
                  sub="The account the platform binds as to read this directory"
                  actions={<Button size="sm" icon="play" onClick={testConnection}>Test connection</Button>}
                >
                  <div className="grid grid-2">
                    <Field label="Bind DN" required span={2} hint="Distinguished name of the service account." htmlFor="auth-binddn">
                      <TextInput id="auth-binddn" className="mono" value={conn.bindDn} onChange={(e) => setC('bindDn', e.target.value)} />
                    </Field>
                    <Field label="Password" span={2} hint="Leave blank to keep the stored credential." htmlFor="auth-bindpw">
                      <TextInput id="auth-bindpw" type="password" autoComplete="off" value={conn.bindPassword} placeholder="Unchanged" onChange={(e) => setC('bindPassword', e.target.value)} />
                    </Field>
                    <Field label="Owner" htmlFor="auth-owner">
                      <Select id="auth-owner" value={app.owner} options={OWNER_OPTIONS} onChange={(e) => onPatch(app.id, { owner: e.target.value })} />
                    </Field>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <Banner tone="info">
                      Test authentication binds an end-user credential against this directory and reads back the mapped
                      attributes. Test connection only exercises the service account above.
                    </Banner>
                  </div>
                </Card>
              </div>

              <div className="stack">
                <Card title="Last probe" sub="Result of the most recent connection test">
                  <KeyValue
                    cols={1}
                    rows={[
                      { k: 'Status', v: app.status, icon: 'activity' },
                      { k: 'Bind time', v: app.bindMs ? `${app.bindMs} ms` : 'No response', icon: 'bolt' },
                      { k: 'Subtree search', v: app.searchMs ? `${app.searchMs} ms` : 'Not attempted', icon: 'search' },
                      { k: 'Failed binds, 24h', v: num(app.failedBinds), icon: 'ban' },
                      { k: 'Probe interval', v: '5 minutes', icon: 'refresh' },
                    ]}
                  />
                </Card>
                <Card title="Server capabilities" sub="Read from the root DSE">
                  <KeyValue cols={1} rows={schemaFacts(app)} />
                </Card>
              </div>
            </div>

            <StickyActions dirty={connDirty} message={connDirty ? 'Unsaved changes' : 'No changes'}>
              <Button onClick={() => { setConn(connInitial); setDns(null) }} disabled={!connDirty}>Discard</Button>
              <Button icon="play" onClick={testConnection}>Test connection</Button>
              <Button variant="pri" icon="save" disabled={!connDirty} onClick={saveConnection}>Save changes</Button>
            </StickyActions>
          </>
        )}

        {!loading && tab === 'authentication' && (
          <>
            <div className="detail-cols">
              <div className="stack">
                <Card
                  title="Test authentication"
                  sub={`Bind an end-user credential against ${app.displayName} and read back the mapped attributes.`}
                >
                  <AuthTestForm app={app} />
                </Card>
              </div>

              <div className="stack">
                <Card title="Authentication activity" sub="What the directory has answered recently">
                  <KeyValue
                    cols={1}
                    rows={[
                      { k: 'Successful binds, 24h', v: num(Math.max(0, app.entries - app.failedBinds)), icon: 'checkC' },
                      { k: 'Failed binds, 24h', v: num(app.failedBinds), icon: 'ban' },
                      { k: 'Last error', v: app.lastError || 'None recorded', icon: 'warn' },
                      { k: 'Bind logging', v: 'Written to the audit log', icon: 'logs' },
                    ]}
                  />
                </Card>
              </div>
            </div>
          </>
        )}

        {!loading && tab === 'options' && (
          <>
            <div className="detail-cols">
              <div className="stack">
                <Card title="Options" sub="How this directory is read, and how hard the platform tries">
                  <div className="grid grid-2">
                    <Field label="Connection timeout" hint="Seconds before a bind is abandoned." htmlFor="opt-timeout">
                      <TextInput id="opt-timeout" type="number" min="1" max="120" value={conn.timeout} onChange={(e) => setC('timeout', Number(e.target.value))} />
                    </Field>
                    <Field label="Search limit" hint="Maximum entries returned by a single search." htmlFor="opt-limit">
                      <TextInput id="opt-limit" type="number" min="1" max="100000" value={conn.searchLimit} onChange={(e) => setC('searchLimit', Number(e.target.value))} />
                    </Field>
                    <Field label="LDAP version" htmlFor="opt-version">
                      <Select id="opt-version" value={conn.version} options={LDAP_VERSIONS} onChange={(e) => setC('version', e.target.value)} />
                    </Field>
                    <Field label="Connection pool size" htmlFor="opt-pool">
                      <TextInput id="opt-pool" type="number" min="1" max="64" value={conn.poolSize} onChange={(e) => setC('poolSize', Number(e.target.value))} />
                    </Field>
                    <Field label="Retries before failure" span={2} htmlFor="opt-retries">
                      <TextInput id="opt-retries" type="number" min="0" max="10" value={conn.retries} onChange={(e) => setC('retries', Number(e.target.value))} />
                    </Field>
                  </div>
                </Card>
              </div>

              <Card title="Effect" sub="What these values change">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Applied at', v: 'The next bind, no restart required', icon: 'refresh' },
                    { k: 'Search limit', v: `${num(conn.searchLimit)} entries per search`, icon: 'search' },
                    { k: 'Timeout', v: `${conn.timeout} seconds`, icon: 'clock' },
                    { k: 'Defaults', v: 'Unset values fall back to the platform defaults', icon: 'sliders' },
                  ]}
                />
              </Card>
            </div>

            <StickyActions dirty={connDirty} message={connDirty ? 'Unsaved changes' : 'No changes'}>
              <Button onClick={() => setConn(connInitial)} disabled={!connDirty}>Discard</Button>
              <Button variant="pri" icon="save" disabled={!connDirty} onClick={saveConnection}>Save changes</Button>
            </StickyActions>
          </>
        )}

        {!loading && tab === 'general' && (
          <div className="stack">
            <Tiles items={healthTiles(app)} />

            <div className="detail-cols">
              <div className="stack">
                <Card
                  title="Synchronization history"
                  sub={`${succeeded} of ${runs.length} runs succeeded`}
                  flush
                  actions={<Button size="sm" icon="jobs" onClick={() => navigate('/iam/jobs')}>Open in Jobs</Button>}
                  footer={
                    <>
                      <span>Entries read on the last successful run <b className="num">{num((runs.find((r) => r.status === 'Succeeded') || { read: 0 }).read)}</b></span>
                      <span className="spacer" />
                      <span>{pct((succeeded / runs.length) * 100, 0)} success rate</span>
                    </>
                  }
                >
                  {runsTable(runs)}
                </Card>
              </div>

              <div className="stack">
                <Card title="Health" sub={healthNote(app)}>
                  <HealthBar value={app.uptime} tone={tone} />
                  <div style={{ marginTop: 14 }}>
                    <KeyValue
                      cols={1}
                      rows={[
                        { k: 'Median bind', v: app.bindMs ? `${app.bindMs} ms` : '—', icon: 'bolt' },
                        { k: 'Slowest probe', v: app.bindMs ? `${Math.max(...spark)} ms` : '—', icon: 'trendUp' },
                        { k: 'Failed binds, 24h', v: num(app.failedBinds), icon: 'ban' },
                        { k: 'Probe interval', v: '5 minutes', icon: 'refresh' },
                      ]}
                    />
                  </div>
                </Card>

                <Card title="Run activity" sub="Most recent outcomes">
                  <Timeline
                    items={runs.slice(0, 5).map((r) => ({
                      id: r.id,
                      tone: r.status === 'Succeeded' ? 'ok' : 'bad',
                      icon: r.status === 'Succeeded' ? 'check' : 'warn',
                      title: `${r.runId} · ${r.status}`,
                      sub: `${r.detail} · ${num(r.read)} entries read by ${r.triggeredBy}`,
                      time: `${r.started} · ${duration(r.durationMs)}`,
                    }))}
                  />
                </Card>

                <Card title="Server capabilities" sub="Read from the root DSE">
                  <KeyValue cols={1} rows={schemaFacts(app)} />
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* The tree has read nothing yet — it opens on its own "nothing read
            yet" panel and fetches a level when asked — so it has nothing to
            wait for and is drawn whole from the first frame. */}
        {tab === 'directory' && (
          <div className="stack">
            <LdapDirectory app={app} />
          </div>
        )}

        {/* Registers settle their own rows. Handing the flag down leaves the
            toolbar and the search box alive while the rows arrive. */}
        {tab === 'users' && (
          <div className="stack">
            <LdapUsers app={app} loading={loading} />
          </div>
        )}

        {tab === 'provisioning' && (
          <div className="stack">
            <LdapProvisioning app={app} rules={rules} setRules={setRules} mappings={mine} loading={loading} />
          </div>
        )}

        {!loading && tab === 'attributes' && (
          <div className="stack">
            <Card
              title="Attribute mapping"
              sub={editing
                ? `Editing the attributes read from ${app.displayName}. Each attribute can be mapped once.`
                : `Identity attributes read from ${app.displayName}`}
              flush
              actions={!editing && (
                <Button size="sm" variant="pri" icon="plus" onClick={() => setEditing('add')}>Add mapping</Button>
              )}
              footer={!editing && (
                <>
                  <span><b className="num">{mine.length}</b> attributes mapped</span>
                  <span className="spacer" />
                  <span>Mappings apply at the next synchronization run.</span>
                </>
              )}
            >
              {editing ? (
                <MappingBulkEditor
                  rows={mine}
                  directory={app.displayName}
                  startWithNew={editing === 'add'}
                  onCancel={() => setEditing(null)}
                  onSave={saveMappings}
                />
              ) : (
                <MappingTable rows={mine} onEdit={() => setEditing('edit')} onDelete={deleteMapping} />
              )}
            </Card>

            <Card title="Unmapped identity attributes" sub="Held on the identity record but not read from this directory">
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {['designation', 'officeLevel', 'empCode', 'country', 'city', 'postalCode', 'zone', 'division']
                  .filter((a) => !mine.some((m) => m.idam === a))
                  .map((a) => <span className="tag mono" key={a}>{a}</span>)}
              </div>
              <div className="t-xs t-mut" style={{ marginTop: 10 }}>
                These attributes keep whatever value the platform holds. Map one to start reading it from the directory.
              </div>
            </Card>

            <Banner tone="info">
              Custom attributes extend the standard schema. Each one is read on every synchronization and can be shown on
              the identity record, used in a dynamic policy or released as an assertion claim.
            </Banner>
            <CustomAttributeTable rows={attrs} onChange={setAttrs} directory={app.displayName} />
            <Card title="Where custom attributes are used" sub="Downstream consumers of these values" flush>
              <div style={{ overflowX: 'auto' }}><table className="tbl">
                <thead>
                  <tr>
                    <th>Consumer</th>
                    <th>Uses</th>
                    <th className="td-act" />
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Dynamic policy', uses: 'Membership rules evaluated against custom values', to: '/iam/dynamicPolicy' },
                    { label: 'SSO attribute configurations', uses: 'Released to federated applications as claims', to: '/iam/ssoApplications/attributes' },
                    { label: 'Reports', uses: 'Filter and group identity extracts', to: '/iam/reports' },
                    { label: 'Identity record', uses: 'Shown in the User Location and Professional sections', to: '/iam/users' },
                  ].map((r) => (
                    <tr key={r.label} style={{ cursor: 'pointer' }} onClick={() => navigate(r.to)}>
                      <td className="td-main">{r.label}</td>
                      <td className="trunc">{r.uses}</td>
                      <td className="td-act"><Icon name="chevR" size={13} style={{ color: 'var(--faint)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
