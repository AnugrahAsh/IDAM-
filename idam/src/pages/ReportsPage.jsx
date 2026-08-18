import './styles/ReportsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import Field from '../components/primitives/Field'
import Select from '../components/primitives/Select'
import TextInput from '../components/primitives/TextInput'
import Banner from '../components/primitives/Banner'
import EmptyState from '../components/primitives/EmptyState'
import StatChip from '../components/primitives/StatChip'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { CATEGORIES, REPORTS, AUDIT_CATEGORIES, reportById, rangeLabel } from './reports/reportDefs'
import { APPLICATION_OPTIONS, ORG_OPTIONS, TODAY, dayOf, niceDate, shiftDays } from './reports/reportData'
import { exportRows } from './reports/exportCsv'

const PRESETS = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

const blankFilters = () => ({
  from: '', to: '', user: '', org: '', application: '', status: '', outcome: '', channel: '', category: '',
})

const applyFilters = (report, rows, f) => {
  const has = (k) => report.filters.includes(k)
  return rows.filter((r) => {
    if (has('dateRange')) {
      const d = dayOf(r.ts)
      if (f.from && d && d < f.from) return false
      if (f.to && d && d > f.to) return false
    }
    if (has('user') && f.user.trim()) {
      const needle = f.user.trim().toLowerCase()
      const hay = [r.username, r.actor, r.name, r.email, r.recipient].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(needle)) return false
    }
    if (has('org') && f.org && r.organization !== f.org) return false
    if (has('application') && f.application && r.application !== f.application) return false
    if (has('status') && f.status && r.status !== f.status) return false
    if (has('outcome') && f.outcome && r.outcome !== f.outcome) return false
    if (has('channel') && f.channel && r.channel !== f.channel) return false
    if (has('category') && f.category && r.category !== f.category) return false
    return true
  })
}

const activeCount = (report, f) => report.filters.reduce((a, k) => {
  if (k === 'dateRange') return a + (f.from || f.to ? 1 : 0)
  if (k === 'user') return a + (f.user.trim() ? 1 : 0)
  return a + (f[k === 'org' ? 'org' : k] ? 1 : 0)
}, 0)

function ReportCatalog({ onOpen }) {
  const { navigate } = useApp()
  const [cat, setCat] = useState(null)

  return (
    <>
      <PageBar
        title="Reports"
        sub="An enterprise report centre over the identity estate. Choose a report, narrow it with filters, then export the result set."
        crumbs={[{ label: 'Reports' }]}
        actions={
          <>
            <Button icon="logs" onClick={() => navigate('syslogs')}>Raw audit log</Button>
            <Button icon="history" onClick={() => navigate('jobs')}>Generation history</Button>
          </>
        }
        rail={
          <>
            <StatChip icon="report" active={!cat} onClick={() => setCat(null)}>{REPORTS.length} reports</StatChip>
            {CATEGORIES.map((c) => (
              <StatChip
                key={c.id}
                icon={c.icon}
                active={cat === c.id}
                onClick={() => setCat((v) => (v === c.id ? null : c.id))}
                title={c.blurb}
              >
                {REPORTS.filter((r) => r.category === c.id).length} {c.id.toLowerCase()}
              </StatChip>
            ))}
            <StatChip icon="calendar" title="Every report reads console data up to this date">
              Data through {niceDate(TODAY)}
            </StatChip>
          </>
        }
      />

      <div className="stack">
        <Banner tone="info">
          Every report reads live console data and is filtered in the browser. Export produces a CSV of exactly the
          rows on screen — the filters you apply are the rows you get.
        </Banner>

        {CATEGORIES.filter((c) => !cat || c.id === cat).map((group) => {
          const list = REPORTS.filter((r) => r.category === group.id)
          if (!list.length) return null
          return (
            <div className="section" key={group.id}>
              <div className="section-head">
                <span className="section-title"><Icon name={group.icon} size={13} /> {group.id}</span>
                <span className="section-sub">{group.blurb}</span>
              </div>
              <div className="grid grid-3 rep-grid">
                {list.map((r) => {
                  const count = r.rows().length
                  return (
                    <div
                      key={r.id}
                      className="tile rep-tile"
                      data-nav="true"
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpen(r.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(r.id))}
                    >
                      <div className="rep-tile-top">
                        <span className="feed-ic" data-tone={r.tone}><Icon name={r.icon} size={15} /></span>
                        <div className="rep-tile-name">{r.name}</div>
                      </div>
                      <div className="rep-tile-desc">{r.description}</div>
                      <div className="rep-tile-foot">
                        <Pill tone="mut">{num(count)} rows</Pill>
                        <span className="t-xs t-mut">{r.summary}</span>
                        <span className="spacer" />
                        <span className="rep-tile-go"><Icon name="chevR" size={13} /></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function ReportView({ report, onBack }) {
  const { toast } = useApp()
  const [f, setF] = useState(blankFilters)
  const [preset, setPreset] = useState('all')

  const all = useMemo(() => report.rows(), [report])
  const rows = useMemo(() => applyFilters(report, all, f), [report, all, f])
  const stats = useMemo(() => report.stats(rows), [report, rows])

  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const usePreset = (p) => {
    setPreset(p.id)
    if (p.days == null) set({ from: '', to: '' })
    else set({ from: shiftDays(TODAY, p.days), to: TODAY })
  }

  const reset = () => { setF(blankFilters()); setPreset('all') }
  const nActive = activeCount(report, f)
  const has = (k) => report.filters.includes(k)

  const columns = useMemo(
    () => [{ key: '__sno', label: '#', width: 60, sortable: false, cls: 'td-mono', render: (r, i) => i + 1 }, ...report.columns],
    [report],
  )

  const exportNow = () => {
    if (!rows.length) { toast('warn', 'Nothing to export', 'No rows match the current filters.'); return }
    const name = exportRows(report, report.columns, rows, TODAY)
    toast('ok', 'Export downloaded', `${num(rows.length)} rows written to ${name}.`)
  }

  return (
    <>
      <PageBar
        title={report.name}
        sub={report.description}
        crumbs={[{ label: 'Reports' }, { label: report.name }]}
        badge={<Pill tone={report.tone} dot>{report.category}</Pill>}
        actions={
          <>
            <Button icon="chevL" onClick={onBack}>All reports</Button>
            <Button icon="refresh" disabled={nActive === 0} onClick={reset}>Reset filters</Button>
            <Button variant="pri" icon="download" onClick={exportNow}>Export CSV</Button>
          </>
        }
        rail={
          <>
            {stats.map((s) => (
              <StatChip key={s.k} icon={s.icon} title={`${s.k} across the rows currently on screen`}>
                {s.v} {s.k.toLowerCase()}
              </StatChip>
            ))}
            {has('dateRange') && (
              <StatChip icon="calendar" title="Date range the filters currently span">
                {rangeLabel(f.from, f.to)}
              </StatChip>
            )}
          </>
        }
      />

      <div className="stack">
        <Card
          title="Filters"
          sub={nActive === 0 ? 'No filters applied — the full result set is shown' : `${nActive} filter${nActive === 1 ? '' : 's'} applied`}
          actions={
            <>
              <Pill tone={rows.length === all.length ? 'mut' : 'acc'} dot>
                {num(rows.length)} of {num(all.length)} rows
              </Pill>
              {nActive > 0 && <Button size="sm" icon="x" onClick={reset}>Clear</Button>}
            </>
          }
        >
          {has('dateRange') && (
            <div className="rep-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="chip"
                  data-on={preset === p.id || undefined}
                  onClick={() => usePreset(p)}
                >
                  <Icon name="calendar" size={12} />{p.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-3">
            {has('dateRange') && (
              <>
                <Field label="From date" htmlFor="rep-from">
                  <TextInput id="rep-from" type="date" value={f.from} onChange={(e) => { setPreset('custom'); set({ from: e.target.value }) }} />
                </Field>
                <Field label="To date" htmlFor="rep-to">
                  <TextInput id="rep-to" type="date" value={f.to} onChange={(e) => { setPreset('custom'); set({ to: e.target.value }) }} />
                </Field>
              </>
            )}
            {has('user') && (
              <Field label="User" hint="Username, name, email or recipient." htmlFor="rep-user">
                <TextInput id="rep-user" value={f.user} placeholder="Search identities…" onChange={(e) => set({ user: e.target.value })} />
              </Field>
            )}
            {has('org') && (
              <Field label="Organization" htmlFor="rep-org">
                <Select id="rep-org" value={f.org} placeholder="All organizations" options={ORG_OPTIONS} onChange={(e) => set({ org: e.target.value })} />
              </Field>
            )}
            {has('application') && (
              <Field label="Application" htmlFor="rep-app">
                <Select id="rep-app" value={f.application} placeholder="All applications" options={APPLICATION_OPTIONS} onChange={(e) => set({ application: e.target.value })} />
              </Field>
            )}
            {has('status') && (
              <Field label="Status" htmlFor="rep-status">
                <Select id="rep-status" value={f.status} placeholder="Any status" options={report.statusOptions || []} onChange={(e) => set({ status: e.target.value })} />
              </Field>
            )}
            {has('outcome') && (
              <Field label="Outcome" htmlFor="rep-outcome">
                <Select id="rep-outcome" value={f.outcome} placeholder="Any outcome" options={report.outcomeOptions || []} onChange={(e) => set({ outcome: e.target.value })} />
              </Field>
            )}
            {has('channel') && (
              <Field label="Channel" htmlFor="rep-channel">
                <Select id="rep-channel" value={f.channel} placeholder="All channels" options={report.channelOptions || []} onChange={(e) => set({ channel: e.target.value })} />
              </Field>
            )}
            {has('category') && (
              <Field label="Event category" htmlFor="rep-cat">
                <Select id="rep-cat" value={f.category} placeholder="All categories" options={AUDIT_CATEGORIES} onChange={(e) => set({ category: e.target.value })} />
              </Field>
            )}
          </div>
        </Card>

        <div className="grid grid-4">
          {stats.map((s) => (
            <div className="tile" key={s.k}>
              <div className="tile-k"><Icon name={s.icon} size={12} />{s.k}</div>
              <div className="tile-v">{s.v}</div>
              <div className="tile-f">{nActive === 0 ? 'Across the full result set' : 'Within the current filters'}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <Card>
            <EmptyState
              icon={report.icon}
              title="No rows match these filters"
              body="Widen the date range or clear a filter to bring rows back into the report."
              actions={<Button variant="pri" icon="refresh" onClick={reset}>Reset filters</Button>}
            />
          </Card>
        ) : (
          <DataWorkbench
            id={`report-${report.id}`}
            rows={rows}
            columns={columns}
            pageSize={25}
            searchPlaceholder={`Search within ${num(rows.length)} rows…`}
            toolbar={<Button size="sm" icon="download" onClick={exportNow}>Export CSV</Button>}
            emptyTitle="No rows match the search"
            emptyBody="Clear the search box to see every filtered row."
            emptyIcon={report.icon}
            footNote={`${rangeLabel(f.from, f.to)} · generated ${niceDate(TODAY)}`}
          />
        )}
      </div>
    </>
  )
}

export default function ReportsPage() {
  const [activeId, setActiveId] = useState(null)
  const report = activeId ? reportById(activeId) : null

  if (!report) return <ReportCatalog onOpen={setActiveId} />
  return <ReportView key={report.id} report={report} onBack={() => setActiveId(null)} />
}
