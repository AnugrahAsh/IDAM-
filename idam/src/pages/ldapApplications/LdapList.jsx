import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RegisterHeader from '../../components/workbench/RegisterHeader'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import { num, serialColumn, statusTone } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { useLocalState } from '../../lib/useLocalState'
import LdapCard from './LdapCard'
import { SLOW_BIND_MS } from './ldapModel'

// One register, one job. The estate's shape is stated in the header and the
// rows carry the rest — everything deeper belongs to a directory's own record.
const FACETS = {
  all: () => true,
  attention: (a) => a.status !== 'Healthy',
  plain: (a) => !a.tls,
  slow: (a) => a.bindMs > SLOW_BIND_MS,
}

const LABELS = {
  all: 'directories',
  attention: 'need attention',
  plain: 'unencrypted',
  slow: 'slow to bind',
}

const HINTS = {
  all: 'Every directory the platform binds to',
  attention: 'Degraded or failed on their last probe',
  plain: 'Bound over ldap:// rather than ldaps://',
  slow: `Last bind slower than the ${SLOW_BIND_MS} ms estate threshold`,
}

/* The register's header is its headline figures — the counts, the filter they
   filter by, the totals that give them scale — so it is data as much as the
   rows beneath it and settles with them rather than landing first with numbers
   the rows cannot yet corroborate.

   Built from the real rule's own classes: `.reg` gives the surface and the hair
   line under it, `.reg-f` the tab's padding and the 2px baseline it reserves
   for the selected state. Only the bars inside are ours. */
function RegisterHeaderSkeleton({ tabs = 4, summary = 3 }) {
  return (
    <div className="reg" aria-hidden="true">
      <div className="reg-row">
        <div className="reg-tabs">
          {Array.from({ length: tabs }, (_, i) => (
            <span className="reg-f ldap-reg-skel-f" key={i}>
              <span className="skel" style={{ width: 28 + (i % 3) * 10 }} />
              <span className="skel" style={{ width: 62 + (i % 3) * 20, height: 9 }} />
            </span>
          ))}
        </div>
        <div className="reg-sum">
          {Array.from({ length: summary }, (_, i) => (
            <span className="skel" key={i} style={{ width: 88 + (i % 3) * 24, height: 9 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LdapList({ apps, setApps, maps, stats, rules = [] }) {
  const { toast, confirm, navigate } = useApp()
  const [facet, setFacet] = useState('all')
  const [mutedAlert, setMutedAlert] = useState(null)
  /* One flag for the register. It settles on arrival — including on the way
     back from a directory's record, which is a route away and back rather than
     a filter — and faceting does not settle again. */
  const loading = useLoading()

  const rows = useMemo(
    () => apps.map((a, i) => ({ ...a, sno: i + 1 })).filter(FACETS[facet] || FACETS.all),
    [apps, facet],
  )

  const failed = apps.filter((a) => a.status === 'Failed')
  const degraded = apps.filter((a) => a.status === 'Degraded')
  const plain = apps.filter((a) => !a.tls)
  const slow = apps.filter((a) => a.bindMs > SLOW_BIND_MS)

  // The header leads with what is wrong and names it, rather than making the
  // operator read six tiles to find out.
  const alert = useMemo(() => {
    if (!failed.length && !degraded.length) return null
    const name = (list) => list.slice(0, 2).map((a) => a.displayName).join(', ')
      + (list.length > 2 ? ` and ${list.length - 2} more` : '')
    const parts = []
    if (failed.length) parts.push(`${name(failed)} not answering`)
    if (degraded.length) parts.push(`${name(degraded)} degraded`)
    return {
      tone: failed.length ? 'bad' : 'warn',
      title: `${failed.length + degraded.length} of ${apps.length} directories need attention`,
      detail: parts.join(' · '),
      filterId: 'attention',
      actionLabel: 'Show these',
    }
  }, [apps])

  const headerItems = [
    { id: 'all', value: apps.length, label: LABELS.all, hint: HINTS.all },
    {
      id: 'attention',
      value: failed.length + degraded.length,
      label: LABELS.attention,
      tone: failed.length ? 'bad' : degraded.length ? 'warn' : undefined,
      hint: HINTS.attention,
    },
    { id: 'plain', value: plain.length, label: LABELS.plain, tone: plain.length ? 'warn' : undefined, hint: HINTS.plain },
    { id: 'slow', value: slow.length, label: LABELS.slow, hint: HINTS.slow },
  ]

  const testConnection = (app) => {
    if (app.status === 'Failed') {
      toast('bad', 'Connection failed', `${app.displayName} did not answer on ${app.url}.`)
      return
    }
    toast('ok', 'Connection successful', `${app.displayName} answered in ${app.bindMs} ms.`)
  }

  const removeApps = (ids) => {
    const set = new Set(ids.map(String))
    setApps((rs) => rs.filter((r) => !set.has(String(r.id))))
  }

  // Provisioning rules are children of a directory, so deleting one takes its
  // rules with it. The confirmation says how many rather than leaving it unsaid.
  const ruleNote = (ids) => {
    const set = new Set(ids.map(String))
    const n = rules.filter((r) => set.has(String(r.applicationId))).length
    return n ? ` This will also remove ${n} provisioning rule${n === 1 ? '' : 's'}.` : ''
  }

  // Six columns, each answering a question an operator actually asks of the
  // list: what is it, is it healthy, how big is it, and when was it last read.
  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Directory', locked: true, cls: 'td-main td-wide', width: 280,
      value: (r) => `${r.name} ${r.displayName} ${r.description} ${r.owner} ${r.baseDn} ${r.url}`,
      render: (r) => (
        <span className="cell-id">
          <Icon name="directory" size={14} className="ldap-ic" data-plain={!r.tls || undefined} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.displayName}</span>
            <span className="cell-sub mono">{r.url}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'status', label: 'Status', width: 116,
      render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill>,
    },
    {
      key: 'entries', label: 'Entries', align: 'right', width: 100,
      render: (r) => num(r.entries),
    },
    {
      key: 'lastSync', label: 'Last read', width: 128,
      render: (r) => <span className="trunc">{r.lastSync}</span>,
    },
    { key: 'baseDn', label: 'Base DN', cls: 'td-mono td-flex', optional: true },
    { key: 'description', label: 'Description', cls: 'td-flex', optional: true },
    { key: 'owner', label: 'Owner', cls: 'td-flex', optional: true },
    {
      key: 'bindMs', label: 'Bind', align: 'right', width: 92, optional: true,
      render: (r) => (
        <span className={r.bindMs > SLOW_BIND_MS ? 'ldap-slow' : undefined}>
          {r.bindMs ? `${r.bindMs} ms` : '—'}
        </span>
      ),
    },
  ]

  const rowActions = (r) => [
    { id: 'open', label: 'Open directory', icon: 'eye', onSelect: () => navigate(`/iam/ldapapplications/${r.id}`) },
    { id: 'browse', label: 'Browse the tree', icon: 'directory', onSelect: () => navigate(`/iam/ldapapplications/${r.id}/directory`) },
    { id: 'rules', label: 'Provisioning rules', icon: 'policy', onSelect: () => navigate(`/iam/ldapapplications/${r.id}/provisioning`) },
    { id: 'test', label: 'Test connection', icon: 'play', onSelect: () => testConnection(r) },
    { id: 'sync', label: 'Read now', icon: 'refresh', onSelect: () => toast('ok', 'Read queued', `${r.displayName} is queued for a full read.`) },
    { divider: true },
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`/iam/ldapapplications/${r.id}/edit`) },
    {
      id: 'del', label: 'Delete', icon: 'trash', danger: true,
      onSelect: () => confirm({
        title: `Delete ${r.displayName}?`,
        body: `Identities sourced from ${r.name} stop synchronising immediately. Existing identities are retained but become unmanaged.${ruleNote([r.id])}`,
        confirmLabel: 'Delete directory',
        onConfirm: () => { removeApps([r.id]); toast('ok', 'Directory deleted', r.displayName) },
      }),
    },
  ]

  /* Every module-level option this build actually has, named. Anything deeper —
     a directory's schema, its users, its own connection — belongs to that
     directory's record and is reached by opening it. */
  const options = [
    {
      id: 'add',
      label: 'Add application',
      desc: 'Register a directory and bind to it.',
      icon: 'plus',
      tone: 'acc',
      onSelect: () => navigate('/iam/ldapapplications/add'),
    },
    {
      id: 'configure',
      label: 'Configure',
      desc: 'Connection defaults and the password policy mapped to each directory.',
      icon: 'sliders',
      onSelect: () => navigate('/iam/ldapapplications/configure'),
    },
    {
      id: 'rules',
      label: 'Provisioning rule audit',
      desc: 'Every rule across the estate, and the unit each one writes into.',
      icon: 'policy',
      count: rules.length || null,
      onSelect: () => navigate('/iam/ldapapplications/rules'),
    },
    {
      id: 'read',
      label: 'Read all directories',
      desc: 'Queue a full read of every registered directory.',
      icon: 'refresh',
      onSelect: () => toast('ok', 'Read queued', 'Every directory is queued for a full read.'),
    },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="play" onClick={() => { toast('info', 'Connection tests queued', `${ids.length} directories queued.`); clear() }}>Test</Button>
      <Button size="sm" icon="refresh" onClick={() => { toast('ok', 'Read queued', `${ids.length} directories queued for a full read.`); clear() }}>Read now</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => confirm({
        title: `Delete ${ids.length} directories?`,
        body: `The selected directories stop synchronising immediately and their identities become unmanaged.${ruleNote(ids)}`,
        confirmLabel: `Delete ${ids.length}`,
        onConfirm: () => { removeApps(ids); clear(); toast('ok', 'Directories deleted', `${ids.length} removed.`) },
      })}>Delete</Button>
    </>
  )

  return (
    <>
      {/* One announcing region for the screen. The register header and the row
          skeleton inside the workbench are both decoration and stay silent, so
          the wait is described once. */}
      {loading ? (
        <Skeleton label="Loading the LDAP directory register">
          <SkeletonPageBar actions={2} crumbs={1} />
          {/* The options below hold their place too. They have nothing of their
              own to read, but a crisp row of buttons between a grey masthead
              and a grey register reads as a page half broken rather than as a
              page arriving. */}
          <div className="ldap-opts ldap-opts-skel" aria-hidden="true">
            {options.map((o) => (
              <span key={o.id}>
                <span className="skel ldap-opt-skel-ic" />
                <span className="ldap-opt-skel-m">
                  <span className="skel" style={{ width: '54%', height: 9 }} />
                  <span className="skel" style={{ width: '82%', height: 8 }} />
                </span>
              </span>
            ))}
          </div>
        </Skeleton>
      ) : (
        <>
          <PageBar
            title="LDAP Applications"
            sub="Directories the platform binds to for authentication and identity source data."
            crumbs={[{ label: 'LDAP Applications' }]}
            actions={(
              <>
                <Button icon="sliders" onClick={() => navigate('/iam/ldapapplications/configure')}>Configure</Button>
                <Button variant="pri" icon="plus" onClick={() => navigate('/iam/ldapapplications/add')}>Add application</Button>
              </>
            )}
          />

          {/* Landing on the module used to show only the register, so the two
              things an operator comes here to do that are not "read a
              directory" — add one, and configure how every directory behaves —
              were a small button in the corner or nowhere at all. Naming the
              module's options at the top states what this screen can do before
              the estate is read. */}
          <nav className="ldap-opts" aria-label="LDAP application options">
            {options.map((o) => (
              <button key={o.id} type="button" onClick={o.onSelect}>
                <span className="feed-ic" data-tone={o.tone}><Icon name={o.icon} size={15} /></span>
                <span className="ldap-opt-m">
                  <b>{o.label}{o.count ? <span className="chip-n num">{o.count}</span> : null}</b>
                  <span>{o.desc}</span>
                </span>
                <Icon name="chevR" size={13} />
              </button>
            ))}
          </nav>
        </>
      )}

      <DataWorkbench
        id="ldap-applications"
        rows={rows}
        columns={columns}
        selectable
        loading={loading}
        header={loading ? <RegisterHeaderSkeleton tabs={headerItems.length} /> : (
          <RegisterHeader
            items={headerItems}
            value={facet}
            onChange={setFacet}
            resetId="all"
            label="Filter the directory register"
            alert={facet === 'attention' || (alert && mutedAlert === alert.detail) ? null : alert}
            onDismissAlert={() => setMutedAlert(alert ? alert.detail : null)}
            summary={[
              { value: stats.entries, label: 'entries' },
              { value: stats.secure, label: 'encrypted' },
              { value: maps.length, label: 'attribute mappings' },
            ]}
          />
        )}
        searchPlaceholder="Search by name, URL, base DN or owner…"
        toolbar={(
          <Button size="sm" icon="refresh" onClick={() => toast('ok', 'Read queued', 'Every directory is queued for a full read.')}>
            Read all
          </Button>
        )}
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(r) => navigate(`/iam/ldapapplications/${r.id}`)}
        emptyTitle="No directory matches"
        emptyBody="Adjust the search or the filter above, or add a directory to bind to."
        emptyIcon="directory"
        footNote={`${num(stats.entries)} entries readable across ${stats.total} directories`}
      />
    </>
  )
}
