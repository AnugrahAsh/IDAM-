import { useMemo } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import AppLogo from '../../components/primitives/AppLogo'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { useApp } from '../../store/AppContext'
import { duration, num, statusTone } from '../../lib/format'
import { since } from '../../lib/clock'
import { brandForConnector } from '../provisioning/shared'
import { StatStrip } from '../applications/facetControls'
import { connectionEndpoint, connectionIssues, kindOf } from '../applications/appModel'
import TrustConnection from './TrustConnection'
import TrustMapping from './TrustMapping'
import TrustUsers from './TrustUsers'
import {
  BUCKETS, connectorName, needsReadSettings, reconciledUsers, sourceLabel, trustRunsFor, uniqueIssues,
} from './trustModel'

const BASE = '/iam/trustReconciliation'

const runTone = (s) => ({ Succeeded: 'ok', Partial: 'warn', Failed: 'bad', Running: 'info' }[s] || 'mut')

const RUN_COLUMNS = [
  {
    key: 'id', label: 'Run', locked: true, cls: 'td-main',
    value: (r) => `${r.id} ${r.mode}`,
    render: (r) => (
      <span className="trunc">
        <span className="mono" style={{ display: 'block' }}>{r.id}</span>
        <span className="cell-sub">{r.mode} read</span>
      </span>
    ),
  },
  { key: 'started', label: 'Started', cls: 'td-mono' },
  { key: 'durationMs', label: 'Duration', align: 'right', render: (r) => duration(r.durationMs) },
  { key: 'scanned', label: 'Records read', align: 'right', render: (r) => num(r.scanned) },
  { key: 'created', label: 'New', align: 'right', render: (r) => num(r.created) },
  { key: 'modified', label: 'Modified', align: 'right', render: (r) => num(r.modified) },
  {
    key: 'failed', label: 'Failed', align: 'right',
    render: (r) => (r.failed > 0 ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{num(r.failed)}</span> : <span className="t-faint">0</span>),
  },
  { key: 'status', label: 'Outcome', render: (r) => <Pill tone={runTone(r.status)} dot>{r.status}</Pill> },
  { key: 'triggeredBy', label: 'Triggered by' },
]

function OverviewTab({ source, onTab, counts }) {
  const connIssues = connectionIssues(source.connector, source.connection)
  const keyIssue = uniqueIssues(source.mappings, source.uniqueAttribute, source.uniqueSourceAttribute)[0]
  const mappings = source.mappings || []
  return (
    <div className="stack">
      {connIssues.length > 0 && (
        <Banner tone="warn">
          The connection is incomplete, so a reconciliation would have nothing to read. {connIssues[0]}
        </Banner>
      )}
      <StatStrip
        items={[
          { k: 'Connector', icon: 'swap', v: connectorName(source.connector), sub: `${kindOf(source.connector)} connector` },
          { k: 'Records read', icon: 'users', v: num(counts.total), sub: source.lastRun ? `Last run ${since(source.lastRun)}` : 'Not yet run' },
          { k: 'New users', icon: 'users', v: num(counts.NewUsers), sub: 'Held by the source, absent from the platform' },
          { k: 'Failed users', icon: 'warn', v: num(counts.FailedUsers), tone: counts.FailedUsers > 0 ? 'bad' : undefined, sub: 'Could not be processed from the source' },
          { k: 'Attributes', icon: 'sliders', v: num(mappings.length), sub: `${mappings.filter((m) => m.manual).length} set manually` },
        ]}
      />

      <div className="detail-cols">
        <div className="stack">
          <Card
            title="Connection"
            sub={`${connectorName(source.connector)} connector reading identities out of this source.`}
            actions={<Button size="sm" icon="sliders" onClick={() => onTab('connection')}>Open connection</Button>}
          >
            <KeyValue
              cols={2}
              rows={[
                { k: 'Endpoint', v: <span className="mono t-xs">{connectionEndpoint(source.connector, source.connection)}</span>, icon: 'server' },
                { k: 'Connector kind', v: kindOf(source.connector), icon: 'layers' },
                { k: 'Status', node: <Pill tone={statusTone(source.status)} dot>{source.status || 'Draft'}</Pill>, icon: 'activity' },
                { k: 'Last run', v: source.lastRun || 'Never run', icon: 'history' },
                needsReadSettings(source.connector) && { k: 'Response list path', v: <span className="mono t-xs">{source.listPath || '—'}</span>, icon: 'code' },
              ].filter(Boolean)}
            />
          </Card>

          <Card
            title="Attribute configuration"
            sub={`${mappings.length} attributes flow into the identity store, ${mappings.filter((m) => m.manual).length} of them set manually.`}
            actions={<Button size="sm" icon="swap" onClick={() => onTab('attributes')}>Open attributes</Button>}
          >
            {keyIssue && <div style={{ marginBottom: 12 }}><Banner tone="warn">{keyIssue}</Banner></div>}
            <KeyValue
              cols={2}
              rows={[
                { k: 'Unique source attribute', v: <span className="mono">{source.uniqueSourceAttribute || '—'}</span>, icon: 'key' },
                { k: 'Unique IDAM attribute', v: <span className="mono">{source.uniqueAttribute || '—'}</span>, icon: 'key' },
                { k: 'Read from the source', v: num(mappings.filter((m) => !m.manual).length), icon: 'download' },
                { k: 'Transformed', v: num(mappings.filter((m) => m.transform !== 'Direct').length), icon: 'swap' },
              ]}
            />
          </Card>
        </div>

        <div className="stack">
          <Card title="Record">
            <KeyValue
              cols={1}
              rows={[
                { k: 'System name', v: <span className="mono">{source.application_name || '—'}</span>, icon: 'tag' },
                { k: 'Display name', v: source.display_name || '—', icon: 'file' },
                { k: 'Connector', v: connectorName(source.connector), icon: 'provision' },
                { k: 'Last run', v: source.lastRun ? `${source.lastRun} · ${since(source.lastRun)}` : 'Never run', icon: 'history' },
              ]}
            />
          </Card>
          <Card
            title="User management"
            sub="What the last read is waiting on."
            actions={<Button size="sm" icon="users" onClick={() => onTab('users')}>Open users</Button>}
          >
            <div className="stack" style={{ gap: 8 }}>
              {BUCKETS.map((b) => (
                <div className="row-between" key={b.id}>
                  <span className="t-sm">{b.label}</span>
                  <Pill tone={counts[b.id] > 0 ? b.tone : 'mut'} dot>{num(counts[b.id])}</Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function TrustSourceDetail({ source, tab, onTab, onPatch, onDelete }) {
  const { toast } = useApp()
  const name = sourceLabel(source)
  const runs = useMemo(() => trustRunsFor(source), [source])
  const counts = useMemo(() => {
    const rows = reconciledUsers(source.id)
    return {
      total: rows.length,
      NewUsers: rows.filter((r) => r.bucket === 'NewUsers').length,
      ModifiedUser: rows.filter((r) => r.bucket === 'ModifiedUser').length,
      FailedUsers: rows.filter((r) => r.bucket === 'FailedUsers').length,
    }
  }, [source.id])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'connection', label: 'Connection', icon: 'server' },
    { id: 'attributes', label: 'Attributes', icon: 'sliders', count: (source.mappings || []).length },
    { id: 'users', label: 'User management', icon: 'users', count: counts.total },
    { id: 'runs', label: 'Run history', icon: 'history', count: runs.length },
  ]
  const active = tabs.some((t) => t.id === tab) ? tab : 'overview'

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Trust Reconciliation"
        eyebrow="Trust source"
        title={name}
        sub="A trust source is a system the platform reads identities out of. Its connector says where the records come from, its attribute configuration says what each record becomes, and user management is where the results are acted on."
        media={<AppLogo brand={brandForConnector(source.connector)} name={name} size={56} />}
        badges={
          <>
            <Pill tone={statusTone(source.status)} dot>{source.status || 'Draft'}</Pill>
            <Tag tone="acc">{connectorName(source.connector)}</Tag>
            <Tag>{source.application_name || 'unnamed'}</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="swap" label="Connector" value={connectorName(source.connector)} />
            <Fact icon="server" label="Endpoint" value={connectionEndpoint(source.connector, source.connection)} />
            <Fact icon="sliders" label="Attributes" value={(source.mappings || []).length} />
            <Fact icon="clock" label="Last run" value={source.lastRun || 'Never run'} />
          </>
        }
        actions={
          <>
            <Button icon="refresh" onClick={() => toast('ok', 'Reconciliation queued', `${name} is being read. Results publish when the run completes.`)}>Reconcile now</Button>
            <Button variant="danger" icon="trash" onClick={() => onDelete(source)}>Delete</Button>
          </>
        }
        tabs={<Tabs value={active} onChange={onTab} tabs={tabs} />}
      />

      <div className="detail-body">
        {active === 'overview' && <OverviewTab source={source} onTab={onTab} counts={counts} />}
        {active === 'connection' && <TrustConnection key={`conn-${source.id}`} source={source} onSave={onPatch} />}
        {active === 'attributes' && <TrustMapping source={source} onPatch={onPatch} />}
        {active === 'users' && <TrustUsers key={`users-${source.id}`} source={source} />}
        {active === 'runs' && (
          <DataWorkbench
            id={`trust-runs-${source.id}`}
            rows={runs}
            columns={RUN_COLUMNS}
            searchPlaceholder="Search runs by identifier or outcome…"
            toolbar={<Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${runs.length} runs queued for CSV export.`)}>Export</Button>}
            emptyTitle="No reconciliation runs"
            emptyBody="This source has not been read yet. Reconcile it to produce a run record."
            emptyIcon="recon"
            footNote="Run records are retained per the platform job policy"
          />
        )}
      </div>
    </>
  )
}
