import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Banner from '../../components/primitives/Banner'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { SkeletonStats } from '../../components/primitives/Skeleton'
import { num, serialColumn } from '../../lib/format'
import { since } from '../../lib/clock'
import { USERS } from '../../data/seed'
import { useApp } from '../../store/AppContext'
import { BUCKETS, attrLabel, reconciledUsers, sourceLabel } from './trustModel'

// What a reconciliation read out of a source, split into the three buckets the
// running application uses. Importing creates identities; modifying applies the
// changed attributes to identities that already exist; correlating binds a
// record to an identity that is already in the store under another identifier.
// All three are dispatched as jobs rather than applied inline, because a full
// source can run to thousands of records.

// The record as the source reported it, read through the source's own attribute
// configuration — so an operator sees the row the way the run will read it,
// including the attributes the configuration sets manually.
function RecordView({ source, row }) {
  const mappings = source.mappings || []
  return (
    <div className="stack">
      <KeyValue
        cols={1}
        rows={[
          { k: 'Source', v: sourceLabel(source), icon: 'server' },
          { k: 'Bucket', v: (BUCKETS.find((b) => b.id === row.bucket) || {}).label || row.bucket, icon: 'recon' },
          { k: 'Last read', v: source.lastRun ? `${source.lastRun} · ${since(source.lastRun)}` : 'Never run', icon: 'history' },
        ]}
      />
      <Card title="Attributes" sub="What the configuration on this source produces for the record" flush>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 180 }}>IDAM attribute</th>
              <th>Value</th>
              <th style={{ width: 140 }}>Read from</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.id}>
                <td className="td-main">{m.label || attrLabel(m.idam)}</td>
                <td className="td-mono">{m.manual ? m.source : (row[m.idam] == null || row[m.idam] === '' ? '—' : String(row[m.idam]))}</td>
                <td>{m.manual ? <Tag tone="acc">Manual</Tag> : <span className="mono t-xs">{m.source}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {row.reason && <Banner tone="bad">{row.reason}</Banner>}
    </div>
  )
}

// Correlating binds a record the source holds to an identity the store already
// has under a different identifier — the case the match key cannot resolve on
// its own, and the reason an operator is in this view at all.
function CorrelateForm({ row, onCancel, onLink }) {
  const [pick, setPick] = useState('')
  const options = useMemo(() => USERS.map((u) => ({ value: u.username, label: `${u.username} · ${u.firstName} ${u.lastName} · ${u.email}` })), [])
  return (
    <div className="stack">
      <Banner tone="info">
        The record stays on the source. Linking records that this source&apos;s <b>{row.username}</b> is the same person
        as the identity chosen below, so the next run updates that identity instead of creating a second one.
      </Banner>
      <KeyValue
        cols={2}
        rows={[
          { k: 'Source username', v: <span className="mono">{row.username}</span>, icon: 'user' },
          { k: 'Source email', v: row.email, icon: 'at' },
          { k: 'Department', v: row.department || '—', icon: 'building' },
          { k: 'Employee type', v: row.employeeType || '—', icon: 'tag' },
        ]}
      />
      <Field label="Identity to link to" required hint="Search the identity store by username, name or email." htmlFor="tu-link">
        <SearchSelect
          id="tu-link"
          value={pick}
          options={options}
          placeholder="Select an identity"
          searchPlaceholder="Search identities…"
          onChange={(e) => setPick(e.target.value)}
        />
      </Field>
      <div className="row">
        <span className="spacer" />
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="link" disabled={!pick} onClick={() => onLink(pick)}>Link identity</Button>
      </div>
    </div>
  )
}

// `loading` is the settling flag of the screen this panel is mounted in — the
// module overview or a trust source's record — handed down rather than started
// again here. A register running its own timer would land at a different moment
// from the figures above it, which is the flicker being removed.
export default function TrustUsers({ sources = [], source: only, loading = false }) {
  const { toast, confirm, navigate, setDrawer } = useApp()
  const list = only ? [only] : sources
  const [sourceId, setSourceId] = useState(list.length ? String(list[0].id) : '')
  const [bucket, setBucket] = useState('NewUsers')
  const [imported, setImported] = useState(() => new Set())

  // What this session actually created, so the operator can see the result of
  // an import rather than only the rows disappearing from the bucket.
  const [receipt, setReceipt] = useState(null)
  const source = only || list.find((s) => String(s.id) === String(sourceId)) || list[0]
  const all = useMemo(() => (source ? reconciledUsers(source.id) : []), [source])
  const live = useMemo(() => all.filter((u) => !imported.has(u.id)), [all, imported])

  const counts = useMemo(() => ({
    NewUsers: live.filter((u) => u.bucket === 'NewUsers').length,
    ModifiedUser: live.filter((u) => u.bucket === 'ModifiedUser').length,
    FailedUsers: live.filter((u) => u.bucket === 'FailedUsers').length,
  }), [live])

  const rows = live.filter((u) => u.bucket === bucket)
  const def = BUCKETS.find((b) => b.id === bucket)
  const isFailed = bucket === 'FailedUsers'
  const verb = bucket === 'ModifiedUser' ? 'Modify' : 'Import'

  const run = (rowsToRun, clear) => {
    if (rowsToRun.length === 0) { toast('warn', 'Nothing selected', 'Select at least one user first.'); return }
    confirm({
      title: `${verb} ${rowsToRun.length} user${rowsToRun.length === 1 ? '' : 's'}?`,
      body: bucket === 'ModifiedUser'
        ? 'The changed attributes are written to the matching identities on the next job run. Nothing else on those identities is touched.'
        : 'An identity is created for each selected user, using the attribute configuration on this source. Provisioning to connected targets follows on the next run.',
      confirmLabel: `${verb} ${rowsToRun.length}`,
      onConfirm: () => {
        setImported((s) => { const n = new Set(s); rowsToRun.forEach((u) => n.add(u.id)); return n })
        setReceipt((prev) => ({
          verb: bucket === 'ModifiedUser' ? 'modified' : 'imported',
          count: (prev && prev.verb === (bucket === 'ModifiedUser' ? 'modified' : 'imported') ? prev.count : 0) + rowsToRun.length,
          names: rowsToRun.slice(0, 6).map((u) => u.username),
          attrs: (source.mappings || []).length,
        }))
        if (clear) clear()
        toast(
          'ok',
          bucket === 'ModifiedUser' ? 'Modify users job added' : 'Import users job added',
          `${rowsToRun.length} user${rowsToRun.length === 1 ? '' : 's'} queued from ${sourceLabel(source)}.`,
        )
      },
    })
  }

  const openRecord = (row) => setDrawer({
    title: row.username,
    sub: `Record read from ${sourceLabel(source)}`,
    children: <RecordView source={source} row={row} />,
  })

  const openCorrelate = (row) => setDrawer({
    title: `Link ${row.username}`,
    sub: 'Correlate this source record with an identity already in the store',
    children: (
      <CorrelateForm
        row={row}
        onCancel={() => setDrawer(null)}
        onLink={(username) => {
          setDrawer(null)
          // A correlated record is no longer waiting to be imported, so it
          // leaves the bucket the same way an imported one does.
          setImported((s) => { const n = new Set(s); n.add(row.id); return n })
          setReceipt((prev) => ({
            verb: 'correlated',
            count: (prev && prev.verb === 'correlated' ? prev.count : 0) + 1,
            names: [row.username],
            attrs: (source.mappings || []).length,
          }))
          toast('ok', 'Record correlated', `${row.username} is bound to ${username}. The next run updates that identity instead of creating one.`)
        }}
      />
    ),
  })

  const receiptBanner = receipt ? (
    <Banner tone="ok">
      <span>
        <b>{num(receipt.count)}</b> {receipt.count === 1 ? 'identity' : 'identities'} {receipt.verb} from{' '}
        {sourceLabel(source)}
        {receipt.attrs ? `, carrying ${num(receipt.attrs)} mapped ${receipt.attrs === 1 ? 'attribute' : 'attributes'}` : ''}
        {receipt.names.length ? ` — ${receipt.names.join(', ')}${receipt.count > receipt.names.length ? ' and others' : ''}` : ''}.{' '}
        <button className="link" onClick={() => navigate('/iam/users')}>Open the directory</button>
      </span>
    </Banner>
  ) : null

  if (!source) {
    return (
      <EmptyState
        icon="recon"
        title="No trust source registered"
        body="Register a source to read identities out of it, then reconcile to see what it holds."
      />
    )
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'username', label: 'Username', locked: true, cls: 'td-main',
      value: (r) => `${r.username} ${r.firstName} ${r.lastName} ${r.email}`,
      render: (r) => (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.username}</span>
          <span className="cell-sub">{r.firstName} {r.lastName}</span>
        </span>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'mobileNo', label: 'Mobile', cls: 'td-mono', optional: true },
    { key: 'department', label: 'Department' },
    { key: 'employeeType', label: 'Employee type', render: (r) => <Tag>{r.employeeType}</Tag> },
    ...(bucket === 'ModifiedUser'
      ? [{ key: 'changed', label: 'Changed', render: (r) => <Pill tone="warn" dot>{r.changed}</Pill> }]
      : []),
    ...(isFailed
      ? [{ key: 'reason', label: 'Why it failed', render: (r) => <span className="trunc" title={r.reason}>{r.reason}</span> }]
      : []),
  ]

  const rowActions = (r) => [
    { id: 'view', label: 'View record', icon: 'eye', onSelect: () => openRecord(r) },
    ...(isFailed ? [] : [
      { id: 'link', label: 'Link to an identity', icon: 'link', onSelect: () => openCorrelate(r) },
      { id: 'run', label: `${verb} this user`, icon: bucket === 'ModifiedUser' ? 'edit' : 'upload', onSelect: () => run([r]) },
    ]),
  ]

  return (
    <div className="stack">
      {receiptBanner}
      <Card
        title="Reconciled users"
        sub="What the last reconciliation read out of this source"
        actions={only ? undefined : (
          <Select
            aria-label="Trust source"
            value={String(source.id)}
            options={list.map((s) => ({ value: String(s.id), label: sourceLabel(s) }))}
            onChange={(e) => { setSourceId(e.target.value); setImported(new Set()); setReceipt(null) }}
          />
        )}
      >
        {loading ? <SkeletonStats count={4} /> : (
          <StatCards
            items={[
              { key: 'total', icon: 'users', label: 'Reconciled total', value: all.length, chip: source.lastRun || 'not yet run', sub: 'records read from the source' },
              ...BUCKETS.map((b) => ({
                key: b.id,
                icon: b.icon,
                label: b.label,
                value: counts[b.id],
                chip: b.id === 'FailedUsers' && counts[b.id] > 0 ? 'needs attention' : undefined,
                chipTone: b.id === 'FailedUsers' && counts[b.id] > 0 ? 'bad' : undefined,
                sub: b.sub,
              })),
            ]}
            label="Reconciliation summary"
          />
        )}
      </Card>

      <div className="seg" role="radiogroup" aria-label="Which users to show">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={bucket === b.id}
            data-on={bucket === b.id}
            onClick={() => setBucket(b.id)}
          >
            <Icon name={b.icon} size={12} /> {b.label} <b className="num">{counts[b.id]}</b>
          </button>
        ))}
      </div>

      <DataWorkbench
        id={`trust-users-${source.id}-${bucket}`}
        rows={rows}
        columns={columns}
        loading={loading}
        selectable={!isFailed}
        scrollBody
        searchPlaceholder={`Search ${def.label.toLowerCase()} by name, username or email…`}
        rowActions={rowActions}
        onRowClick={openRecord}
        toolbar={
          <>
            {!isFailed && (
              <Button size="sm" variant="pri" icon={bucket === 'ModifiedUser' ? 'edit' : 'upload'} onClick={() => run(rows)}>
                {verb} all
              </Button>
            )}
            <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${num(rows.length)} ${def.label.toLowerCase()} queued for CSV export.`)}>Export</Button>
          </>
        }
        bulkActions={!isFailed ? (ids, clear) => (
          <Button
            size="sm"
            variant="pri"
            icon={bucket === 'ModifiedUser' ? 'edit' : 'upload'}
            onClick={() => run(rows.filter((r) => ids.map(String).includes(String(r.id))), clear)}
          >
            {verb} selected
          </Button>
        ) : undefined}
        emptyTitle={`No ${def.label.toLowerCase()}`}
        emptyBody={
          bucket === 'FailedUsers'
            ? 'Every record read from this source was processed cleanly.'
            : 'Nothing is waiting in this bucket. Run a reconciliation to read the source again.'
        }
        emptyIcon={def.icon}
        footNote={`${def.sub} · ${sourceLabel(source)}`}
      />
    </div>
  )
}
