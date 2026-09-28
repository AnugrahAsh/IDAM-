import './ReconciliationPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import AppLogo from '../../components/primitives/AppLogo'
import Banner from '../../components/primitives/Banner'
import EmptyState from '../../components/primitives/EmptyState'
import RunDetail from './RunDetail'
import AppOnboard from './AppOnboard'
import TrustSourceForm from './TrustSourceForm'
import TrustSourceDetail from './TrustSourceDetail'
import { SEED_SOURCES, connectorName, sourceLabel, withConnector } from './trustModel'
import TrustUsers from './TrustUsers'
import { OverviewSkeleton } from './ReconciliationSkeleton'
import { SkeletonStats } from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { num, duration, serialColumn } from '../../lib/format'
import { brandFor, brandForConnector } from '../shared/provisioning/shared'
import { connectionEndpoint } from '../applications/appModel'
import {
  CATEGORY, CATEGORY_LABELS, CATEGORY_TONES, DifferenceList, categoryCards, categoryCounts,
  filterByCategory, syncedUsersFor,
} from '../shared/provisioning/reconCategories'
import {
  RUNS, RUN_BY_ID, SOURCES, defaultConfig, latestRunFor, runTone, unmatchedIdentitiesFor,
} from './shared'

const BASE = '/iam/trustReconciliation'

// Ids are assigned from the highest in use, not from the length: deleting a
// source and adding another must not hand the new one an id that is taken.
const nextSourceId = (rows) => rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1

const healthTone = (s) => ({ Healthy: 'ok', Degraded: 'warn', Failed: 'bad' }[s] || 'mut')

// Columns for the categorised synced-accounts register. Outside the component
// so the stored column layout is keyed on a stable set.
const SYNCED_COLUMNS = [
  {
    key: 'account', label: 'Account', locked: true, cls: 'td-main',
    value: (r) => `${r.account} ${r.identity || ''} ${r.identityEmail || ''}`,
    render: (r) => (
      <span className="cell-id">
        <span className="trunc">
          <span className="mono" style={{ display: 'block' }}>{r.account}</span>
          <span className="cell-sub">{r.identity ? `Matched to ${r.identity}` : 'No matching identity'}</span>
        </span>
      </span>
    ),
  },
  { key: 'application', label: 'Application' },
  {
    key: 'category', label: 'Category',
    value: (r) => CATEGORY_LABELS[r.category],
    render: (r) => <Pill tone={CATEGORY_TONES[r.category]} dot>{CATEGORY_LABELS[r.category]}</Pill>,
  },
  {
    key: 'differences', label: 'What differs', sortable: false,
    value: (r) => r.differences.map((d) => `${d.label} ${d.source} ${d.target}`).join(' '),
    render: (r) => (r.category === CATEGORY.USERNAME
      ? <span className="t-sm">Identifier not found in the identity store</span>
      : <DifferenceList rows={r.differences} />),
  },
  { key: 'department', label: 'Department' },
  { key: 'rule', label: 'Matched by', render: (r) => (r.rule === '—' ? <span className="t-faint">—</span> : <Tag>{r.rule}</Tag>) },
  { key: 'confidence', label: 'Confidence', align: 'right', render: (r) => `${r.confidence}%` },
  { key: 'lastSeen', label: 'Last seen', cls: 'td-mono', optional: true },
]

function Overview({ apps, sources, onRemove, onRemoveSource, onRun }) {
  const { toast, navigate } = useApp()
  const [tab, setTab] = useState('sources')
  // The synced register is filtered by category rather than by a separate
  // control: the three counts are the filter (client item 7).
  const [category, setCategory] = useState(CATEGORY.ALL)
  /* One flag for the screen: the masthead, the estate figures and whichever
     register is open resolve together. The five tabs are slices of one estate
     read rather than five reads, so moving between them does not settle
     again — the numbers the operator just saw are still the ones on screen. */
  const loading = useLoading()

  // Every onboarded application contributes the accounts its latest run read,
  // so the estate view answers the same three questions the per-application
  // tab does, across the whole estate.
  const synced = useMemo(() => apps.flatMap((a) => {
    const run = latestRunFor(a.appId)
    return run ? syncedUsersFor(run).map((r) => ({ ...r, application: a.displayName, runId: run.id })) : []
  }), [apps])
  const syncCounts = useMemo(() => categoryCounts(synced), [synced])

  const stats = useMemo(() => {
    const latest = apps.map((a) => latestRunFor(a.appId)).filter(Boolean)
    const matched = latest.reduce((a, r) => a + Math.max(0, r.scanned - r.fresh), 0)
    const unmatchedAccounts = latest.reduce((a, r) => a + r.fresh, 0)
    const unmatchedIdentities = latest.reduce((a, r) => a + unmatchedIdentitiesFor(r).length, 0)
    return {
      apps: apps.length,
      runs: RUNS.length,
      scanned: latest.reduce((a, r) => a + r.scanned, 0),
      matched,
      unmatchedAccounts,
      unmatchedIdentities,
      failed: latest.filter((r) => r.status === 'Failed').length,
    }
  }, [apps])

  const appColumns = [
    {
      key: 'displayName', label: 'Application', locked: true, cls: 'td-main',
      value: (r) => `${r.displayName} ${r.name} ${r.host}`,
      render: (r) => (
        <span className="cell-id">
          <AppLogo brand={brandFor(r)} name={r.displayName} size={24} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.displayName}</span>
            <span className="cell-sub mono">{r.host}</span>
          </span>
        </span>
      ),
    },
    { key: 'method', label: 'Connection', render: (r) => <Tag>{r.method}</Tag> },
    {
      key: 'rules', label: 'Matching rules', sortable: false,
      value: (r) => r.rules.filter((x) => x.enabled).map((x) => x.name).join(' '),
      render: (r) => {
        const active = r.rules.filter((x) => x.enabled)
        return (
          <span className="trunc">
            <span style={{ display: 'block' }}>{active.length} active</span>
            <span className="cell-sub">{active.slice(0, 2).map((x) => x.name).join(' · ')}{active.length > 2 ? ` +${active.length - 2}` : ''}</span>
          </span>
        )
      },
    },
    { key: 'mode', label: 'Mode', render: (r) => <Tag>{r.mode}</Tag> },
    { key: 'schedule', label: 'Schedule' },
    {
      key: 'lastRun', label: 'Last run', sortable: false,
      render: (r) => {
        const run = latestRunFor(r.appId)
        if (!run) return <span className="t-faint">Never run</span>
        return (
          <span className="trunc">
            <span style={{ display: 'block' }}><Pill tone={runTone(run.status)} dot>{run.status}</Pill></span>
            <span className="cell-sub mono">{run.started}</span>
          </span>
        )
      },
    },
    {
      key: 'unmatched', label: 'Unmatched', align: 'right', sortable: false,
      render: (r) => {
        const run = latestRunFor(r.appId)
        if (!run) return <span className="t-faint">—</span>
        return run.fresh > 0
          ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{num(run.fresh)}</span>
          : <span className="t-faint">0</span>
      },
    },
    { key: 'accounts', label: 'Accounts', align: 'right', render: (r) => num(r.accounts) },
    { key: 'health', label: 'Connector', render: (r) => <Pill tone={healthTone(r.health)} dot>{r.health}</Pill> },
  ]

  const openApp = (r) => {
    const run = latestRunFor(r.appId)
    if (run) navigate(`${BASE}/${run.id}`)
    else navigate(`${BASE}/apps/${r.id}`)
  }

  const appRowActions = (r) => {
    const run = latestRunFor(r.appId)
    return [
      { id: 'run', label: 'Run reconciliation', icon: 'refresh', onSelect: () => onRun(r) },
      { id: 'last', label: 'View last run', icon: 'eye', disabled: !run, onSelect: () => run && navigate(`${BASE}/${run.id}`) },
      { id: 'rules', label: 'Matching rules', icon: 'policy', onSelect: () => navigate(`${BASE}/apps/${r.id}`) },
      { divider: true },
      { id: 'connector', label: 'Open the connector', icon: 'provision', onSelect: () => navigate(`/iam/provisionapplications/${r.appId}`) },
      { divider: true },
      { id: 'remove', label: 'Remove from reconciliation', icon: 'trash', danger: true, onSelect: () => onRemove(r) },
    ]
  }

  const runColumns = [
    {
      key: 'id', label: 'Run', locked: true, cls: 'td-main',
      value: (r) => `${r.id} ${r.source} ${r.sourceName}`,
      render: (r) => (
        <span className="cell-id">
          <span className="trunc">
            <span className="mono" style={{ display: 'block' }}>{r.id}</span>
            <span className="cell-sub">{r.mode} reconciliation</span>
          </span>
        </span>
      ),
    },
    {
      key: 'source', label: 'Application',
      render: (r) => (
        <span className="cell-id">
          <AppLogo brand={brandFor({ name: r.sourceName, connector: r.connector })} name={r.source} size={20} />
          <span className="trunc">{r.source}</span>
        </span>
      ),
    },
    { key: 'started', label: 'Started', cls: 'td-mono' },
    { key: 'durationMs', label: 'Duration', align: 'right', render: (r) => duration(r.durationMs) },
    { key: 'scanned', label: 'Accounts read', align: 'right', render: (r) => num(r.scanned) },
    {
      key: 'matchedN', label: 'Matched', align: 'right',
      value: (r) => r.total - r.fresh,
      render: (r) => num(r.total - r.fresh),
    },
    {
      key: 'fresh', label: 'Unmatched accounts', align: 'right',
      render: (r) => (r.fresh > 0
        ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{num(r.fresh)}</span>
        : <span className="t-faint">0</span>),
    },
    {
      key: 'idsN', label: 'Unmatched identities', align: 'right',
      value: (r) => unmatchedIdentitiesFor(r).length,
      render: (r) => num(unmatchedIdentitiesFor(r).length),
    },
    { key: 'status', label: 'Outcome', render: (r) => <Pill tone={runTone(r.status)} dot>{r.status}</Pill> },
    { key: 'triggeredBy', label: 'Triggered by' },
  ]

  const runRowActions = (r) => [
    { id: 'open', label: 'Open run results', icon: 'eye', onSelect: () => navigate(`${BASE}/${r.id}`) },
    { id: 'summary', label: 'Run summary', icon: 'history', onSelect: () => navigate(`${BASE}/${r.id}/summary`) },
    { divider: true },
    { id: 'export', label: 'Export results', icon: 'download', onSelect: () => toast('ok', 'Export queued', `${r.id} results queued for CSV export.`) },
  ]

  return (
    <>
      {/* One announcing region for the screen. The figure strip above and the
          row skeleton inside whichever register is open are both decoration and
          stay silent, so the wait is described once. */}
      {loading ? <OverviewSkeleton /> : (
        <PageBar
          title="Trust Reconciliation"
          sub="Onboard an application, correlate its accounts against the identity store with matching rules, then resolve every discrepancy — unmatched accounts and unmatched identities alike."
          crumbs={[{ label: 'Applications' }, { label: 'Trust Reconciliation' }]}
          actions={
            <>
              <Button icon="jobs" onClick={() => navigate('/iam/jobs')}>Job log</Button>
              <Button icon="download" onClick={() => toast('ok', 'Export queued', `${RUNS.length} reconciliation runs queued for CSV export.`)}>Export</Button>
              <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/add`)}>Add source</Button>
            </>
          }
        />
      )}

      <div className="stack">
        {!loading && stats.failed > 0 && (
          <Banner tone="bad">
            <b>{stats.failed} application{stats.failed === 1 ? '' : 's'} failed the most recent reconciliation.</b>{' '}
            Results for those applications are partial and should not be acted on until a clean run completes.
          </Banner>
        )}

        {!loading && (
          <div className="stat-strip">
            <div className="stat-cell">
              <span className="stat-k"><Icon name="provision" size={12} />Applications onboarded</span>
              <span className="stat-v">{num(stats.apps)}</span>
              <span className="t-xs t-mut">Targets reconciled against the identity store</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="users" size={12} />Accounts read</span>
              <span className="stat-v">{num(stats.scanned)}</span>
              <span className="t-xs t-mut">Across the latest run of each application</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="checkC" size={12} />Matched</span>
              <span className="stat-v">{num(stats.matched)}</span>
              <span className="t-xs t-mut">Accounts correlated to a governed identity</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="orphan" size={12} />Unmatched accounts</span>
              <span className="stat-v" style={{ color: stats.unmatchedAccounts > 0 ? 'var(--bad)' : undefined }}>{num(stats.unmatchedAccounts)}</span>
              <span className="t-xs t-mut">On a target with no owning identity</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="user" size={12} />Unmatched identities</span>
              <span className="stat-v" style={{ color: stats.unmatchedIdentities > 0 ? 'var(--warn)' : undefined }}>{num(stats.unmatchedIdentities)}</span>
              <span className="t-xs t-mut">In the store with no account on the target</span>
            </div>
          </div>
        )}

        {/* The tab bar is chrome and stays live: a control that disappears
            under the pointer that just used it has been taken away
            mid-gesture. */}
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'sources', label: 'Trust sources', icon: 'server', count: sources.length },
            { id: 'users', label: 'Reconciled users', icon: 'users' },
            { id: 'synced', label: 'Synced data', icon: 'swap', count: synced.length },
            { id: 'applications', label: 'Applications', icon: 'provision', count: apps.length },
            { id: 'runs', label: 'Run history', icon: 'history', count: RUNS.length },
          ]}
        />

        {tab === 'sources' && (
          <DataWorkbench
            id="trust-sources"
            loading={loading}
            rows={sources}
            columns={[
              serialColumn('S.No'),
              {
                key: 'display_name', label: 'Source', locked: true, cls: 'td-main',
                value: (r) => `${r.display_name} ${r.application_name}`,
                render: (r) => (
                  <span className="cell-id">
                    <AppLogo brand={brandForConnector(r.connector)} name={sourceLabel(r)} size={24} />
                    <span className="trunc">
                      <span style={{ display: 'block' }}>{sourceLabel(r)}</span>
                      <span className="cell-sub mono">{r.application_name}</span>
                    </span>
                  </span>
                ),
              },
              { key: 'connector', label: 'Connector', value: (r) => connectorName(r.connector), render: (r) => <Tag>{connectorName(r.connector)}</Tag> },
              {
                key: 'endpoint', label: 'Reads from', sortable: false,
                value: (r) => connectionEndpoint(r.connector, r.connection),
                render: (r) => <span className="trunc mono t-xs">{connectionEndpoint(r.connector, r.connection)}</span>,
              },
              { key: 'attrs', label: 'Attributes', align: 'right', value: (r) => (r.mappings || []).length, render: (r) => (r.mappings || []).length },
              { key: 'lastRun', label: 'Last run', cls: 'td-mono', render: (r) => r.lastRun || 'Never run' },
              { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Healthy' ? 'ok' : r.status === 'Degraded' ? 'warn' : 'mut'} dot>{r.status || 'Draft'}</Pill> },
            ]}
            selectable
            searchPlaceholder="Search sources by name, connector or endpoint…"
            onRowClick={(r) => navigate(`${BASE}/sources/${r.id}`)}
            rowActions={(r) => [
              { id: 'open', label: 'Open source', icon: 'eye', onSelect: () => navigate(`${BASE}/sources/${r.id}`) },
              { id: 'conn', label: 'Connection settings', icon: 'server', onSelect: () => navigate(`${BASE}/sources/${r.id}/connection`) },
              { id: 'attrs', label: 'Attribute configuration', icon: 'sliders', onSelect: () => navigate(`${BASE}/sources/${r.id}/attributes`) },
              { id: 'users', label: 'User management', icon: 'users', onSelect: () => navigate(`${BASE}/sources/${r.id}/users`) },
              { divider: true },
              { id: 'run', label: 'Reconcile now', icon: 'refresh', onSelect: () => toast('ok', 'Reconciliation queued', `${sourceLabel(r)} is being read.`) },
              { divider: true },
              { id: 'del', label: 'Delete source', icon: 'trash', danger: true, onSelect: () => onRemoveSource(r) },
            ]}
emptyTitle="No trust source registered"
            emptyBody="Register the system identities are read out of, using any connector type the platform supports."
            emptyIcon="server"
            footNote="Sources are read on every reconciliation run"
          />
        )}

        {tab === 'users' && <TrustUsers sources={sources} loading={loading} />}

        {tab === 'synced' && (
          <DataWorkbench
            id="reconciliation-synced"
            header={(
              <div className="sync-head">
                {loading ? <SkeletonStats count={categoryCards(syncCounts).length} /> : (
                  <StatCards
                    items={categoryCards(syncCounts)}
                    value={category}
                    onChange={setCategory}
                    label="Filter the synced accounts by category"
                  />
                )}
              </div>
            )}
            loading={loading}
            rows={filterByCategory(synced, category)}
            columns={SYNCED_COLUMNS}
            searchPlaceholder="Search by account, identity, application or department…"
            onRowClick={(r) => navigate(`${BASE}/${r.runId}`)}
            emptyTitle="No accounts in this category"
            emptyBody="Select another category above, or widen the search."
            emptyIcon="recon"
            footNote={`${num(syncCounts.username + syncCounts.data)} of ${num(syncCounts.all)} synced accounts disagree with the identity store`}
          />
        )}

        {tab === 'applications' && (
          apps.length === 0 && !loading ? (
            <EmptyState
              icon="recon"
              title="No application is onboarded for reconciliation"
              body="Onboard an application to read its account inventory and correlate every account against the identity store."
              actions={<Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/sources`)}>Add source</Button>}
            />
          ) : (
            <DataWorkbench
              id="reconciliation-apps"
              loading={loading}
              rows={apps}
              columns={appColumns}
              selectable
              searchPlaceholder="Search by application, host or matching rule…"
              rowActions={appRowActions}
              bulkActions={(ids, clear) => (
                <Button
                  size="sm"
                  icon="refresh"
                  onClick={() => { toast('ok', 'Reconciliation queued', `${ids.length} application${ids.length === 1 ? '' : 's'} queued.`); clear() }}
                >
                  Run reconciliation
                </Button>
              )}
              onRowClick={openApp}
              toolbar={<Button size="sm" icon="plus" onClick={() => navigate(`${BASE}/add`)}>Add Application</Button>}
              emptyTitle="No applications match"
              emptyBody="Adjust the search to widen the result set."
              emptyIcon="provision"
              footNote={`${num(stats.unmatchedAccounts + stats.unmatchedIdentities)} open discrepancies across the latest runs`}
            />
          )
        )}

        {tab === 'runs' && (
          <DataWorkbench
            id="reconciliation-runs"
            loading={loading}
            rows={RUNS}
            columns={runColumns}
            selectable
            searchPlaceholder="Search by run id or application…"
            rowActions={runRowActions}
            bulkActions={(ids, clear) => (
              <Button size="sm" icon="download" onClick={() => { toast('ok', 'Export queued', `${ids.length} runs queued for CSV export.`); clear() }}>Export</Button>
            )}
            onRowClick={(r) => navigate(`${BASE}/${r.id}`)}
            emptyTitle="No reconciliation runs"
            emptyBody="No run matches the current view, filters or search. Run a reconciliation from the Applications tab."
            emptyIcon="recon"
            footNote="Run records are retained per the platform job policy"
          />
        )}
      </div>
    </>
  )
}

export default function ReconciliationPage({ segments = [] }) {
  const { navigate, toast, confirm } = useApp()
  const [apps, setApps] = useState(() => SOURCES.map((a) => defaultConfig(a)))
  // Registered trust sources — the systems identities are read out of. Separate
  // from `apps`, which is the matching-rule configuration per onboarded target.
  const [sources, setSources] = useState(SEED_SOURCES)

  const removeSource = (src) => confirm({
    title: `Delete ${sourceLabel(src)}?`,
    body: 'The source stops being reconciled. Identities already created from it are untouched.',
    confirmLabel: 'Delete source',
    onConfirm: () => {
      setSources((rs) => rs.filter((x) => x.id !== src.id))
      toast('ok', 'Source deleted', sourceLabel(src))
      navigate(BASE)
    },
  })

  const runNow = (app) => {
    const run = latestRunFor(app.appId)
    toast('ok', 'Reconciliation started', `${app.displayName} is reading its account inventory. Results publish when the run completes.`)
    if (run) navigate(`${BASE}/${run.id}`)
  }

  const removeApp = (app) => confirm({
    title: `Remove ${app.displayName} from reconciliation?`,
    body: 'The application stays provisioned, but its accounts are no longer correlated against the identity store and no new discrepancies are surfaced. Existing run history is retained.',
    confirmLabel: 'Remove application',
    onConfirm: () => {
      setApps((rs) => rs.filter((x) => x.id !== app.id))
      toast('ok', 'Application removed', `${app.displayName} no longer participates in reconciliation.`)
    },
  })

  if (segments[0] === 'add') {
    return (
      <TrustSourceForm
        onSave={(cfg) => {
          const id = nextSourceId(sources)
          setSources((rs) => [...rs, withConnector({ ...cfg, id })])
          toast('ok', 'Trust source saved', `${sourceLabel(cfg)} is registered. Run a reconciliation to read its users.`)
          navigate(`${BASE}/sources/${id}`)
        }}
        onCancel={() => navigate(BASE)}
      />
    )
  }

  if (segments[0] === 'sources' && segments[1]) {
    const src = sources.find((x) => String(x.id) === String(segments[1]))
    if (src && segments[2] === 'edit') {
      return (
        <TrustSourceForm
          source={src}
          onSave={(cfg) => {
            setSources((rs) => rs.map((x) => (x.id === src.id ? withConnector({ ...x, ...cfg }) : x)))
            toast('ok', 'Trust source saved', `${sourceLabel(cfg)} updated.`)
            navigate(`${BASE}/sources/${src.id}`)
          }}
          onCancel={() => navigate(`${BASE}/sources/${src.id}`)}
        />
      )
    }
    if (src) {
      return (
        <TrustSourceDetail
          key={src.id}
          source={src}
          tab={segments[2]}
          onTab={(t) => navigate(t === 'overview' ? `${BASE}/sources/${src.id}` : `${BASE}/sources/${src.id}/${t}`)}
          onPatch={(patch) => setSources((rs) => rs.map((x) => (x.id === src.id ? { ...x, ...patch } : x)))}
          onDelete={removeSource}
        />
      )
    }
    return (
      <>
        <PageBar
          title="Trust source not found"
          sub="This source is not registered, or it was removed in this session."
          crumbs={[{ label: 'Trust Reconciliation', to: BASE }, { label: 'Not found' }]}
        />
        <EmptyState
          icon="server"
          title={`No trust source with id ${segments[1]}`}
          body="Return to the overview to pick a source, or register it again."
          actions={<Button variant="pri" onClick={() => navigate(BASE)}>Back to Trust Reconciliation</Button>}
        />
      </>
    )
  }

  if (segments[0] === 'apps' && segments[1]) {
    const app = apps.find((a) => String(a.id) === String(segments[1]))
    if (!app) {
      return (
        <>
          <PageBar
            title="Application not onboarded"
            sub="This application is not part of reconciliation, or it was removed in this session."
            crumbs={[{ label: 'Trust Reconciliation', to: BASE }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="recon"
            title={`No onboarded application with id ${segments[1]}`}
            body="Return to the reconciliation overview to pick an application, or onboard it again."
            actions={<Button variant="pri" onClick={() => navigate(BASE)}>Back to Trust Reconciliation</Button>}
          />
        </>
      )
    }
    return (
      <AppOnboard
        key={app.id}
        app={app}
        onboardedIds={apps.map((a) => a.appId)}
        onSave={(cfg) => {
          setApps((rs) => rs.map((x) => (x.id === app.id ? { ...x, ...cfg, id: app.id } : x)))
          toast('ok', 'Configuration saved', `${cfg.displayName} uses the updated matching rules from the next run.`)
          navigate(BASE)
        }}
        onCancel={() => navigate(BASE)}
      />
    )
  }

  if (segments[0]) {
    const run = RUN_BY_ID[segments[0]]
    if (!run) {
      return (
        <>
          <PageBar
            title="Reconciliation run not found"
            sub="This run has aged out of the retention window, or the identifier in the address is not valid."
            crumbs={[{ label: 'Trust Reconciliation', to: BASE }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="recon"
            title={`No run with id ${segments[0]}`}
            body="Return to the overview to pick a reconciliation run, or start a new run against an onboarded application."
            actions={<Button variant="pri" onClick={() => navigate(BASE)}>Back to Trust Reconciliation</Button>}
          />
        </>
      )
    }
    return (
      <RunDetail
        key={run.id}
        run={run}
        tab={segments[1]}
        onTab={(t) => navigate(t === 'results' ? `${BASE}/${run.id}` : `${BASE}/${run.id}/${t}`)}
      />
    )
  }

  return <Overview apps={apps} sources={sources} onRemove={removeApp} onRemoveSource={removeSource} onRun={runNow} />
}
