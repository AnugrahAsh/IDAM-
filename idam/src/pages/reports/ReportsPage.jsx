import './ReportsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { CATEGORIES, REPORTS, reportById } from './reportDefs'
import ReportDetail from './ReportDetail'
import { ZONE_OPTIONS, inZone, zoneById, zoneSuffix } from './reportTime'
import { TODAY, niceDate, shiftDays } from './reportData'
import {
  applyReportFilters, blankValue, blankValues, filterChips,
  optionLabel, optionValue, rangeLabel,
} from './reportFilters'
import { exportRows } from './exportCsv'
import StatCards from '../../components/workbench/StatCards'
import { useLocalState } from '../../lib/useLocalState'
import {
  CATALOG_OLDEST, PIN_KEY, exportsFor, freshness, monthLabel, recordExport, totalExports,
} from './catalogMeta'

const PRESETS = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

// Which preset a stored window corresponds to, so the chips stay lit without a
// second piece of state that can disagree with the dates themselves.
const presetOf = (v) => {
  if (!v || (!v.from && !v.to)) return 'all'
  if (v.to !== TODAY) return 'custom'
  const hit = PRESETS.find((p) => p.days != null && shiftDays(TODAY, p.days) === v.from)
  return hit ? hit.id : 'custom'
}

const CATALOG_VIEWS = [
  { id: 'grid', icon: 'apps', label: 'Card view' },
  { id: 'list', icon: 'menu', label: 'List view' },
]

function ReportCatalog({ onOpen }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [layout, setLayout] = useLocalState('tf-idam-reports-layout', 'grid')
  const [pins, setPins] = useLocalState(PIN_KEY, [])

  // Every catalog figure is read from the reports themselves on render.
  const meta = useMemo(() => REPORTS.map((r) => {
    const rows = r.rows()
    return { report: r, count: rows.length, ...freshness(rows), exports: exportsFor(r.id) }
  }), [])

  const totals = useMemo(() => {
    const records = meta.reduce((a, m) => a + m.count, 0)
    const audit = meta.filter((m) => m.report.category === 'Audit & Compliance')
      .reduce((a, m) => a + m.count, 0)
    const newest = meta.reduce((a, m) => (m.newest && m.newest > a ? m.newest : a), 0)
    return { records, audit, newest, exports: totalExports() }
  }, [meta])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return meta.filter((m) => (cat === 'all' || m.report.category === cat)
      && (!needle || `${m.report.name} ${m.report.description} ${m.report.category}`.toLowerCase().includes(needle)))
  }, [meta, q, cat])

  const pinned = shown.filter((m) => pins.includes(m.report.id))
  const rest = shown.filter((m) => !pins.includes(m.report.id))
  const togglePin = (id) => setPins((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const cards = [
    {
      key: 'catalog', icon: 'report', label: 'Reports in catalog', value: REPORTS.length,
      chip: `${CATEGORIES.length} categories`, sub: 'each exportable as CSV',
    },
    {
      key: 'records', icon: 'layers', label: 'Records held', value: totals.records,
      chip: 'live', chipTone: 'ok', sub: 'across every source ledger',
    },
    {
      key: 'audit', icon: 'logs', label: 'Audit trail entries', value: totals.audit,
      chip: freshness(REPORTS.filter((r) => r.category === 'Audit & Compliance').flatMap((r) => r.rows())).label,
      sub: 'administrative activity',
    },
    {
      key: 'exports', icon: 'download', label: 'Exports (30d)', value: totals.exports,
      chip: totals.exports ? 'this browser' : 'none yet',
      sub: 'CSV downloads taken',
    },
    {
      key: 'trail', icon: 'lock', label: 'Trail begins', value: monthLabel(CATALOG_OLDEST),
      chip: 'retained', sub: 'oldest record still held',
    },
  ]

  const reportCard = (m) => {
    const r = m.report
    const isPinned = pins.includes(r.id)
    return (
      <article
        key={r.id}
        className="rep-card"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(r.id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(r.id))}
      >
        <header className="rep-card-top">
          <span className="feed-ic" data-tone={r.tone}><Icon name={r.icon} size={15} /></span>
          <span className="rep-card-id">
            <span className="rep-card-name trunc">{r.name}</span>
            <span className="rep-card-cat">{r.category}</span>
          </span>
          <button
            type="button"
            className="rep-pin"
            data-on={isPinned || undefined}
            aria-pressed={isPinned}
            aria-label={isPinned ? `Unpin ${r.name}` : `Pin ${r.name}`}
            onClick={(e) => { e.stopPropagation(); togglePin(r.id) }}
          >
            <Icon name="star" size={14} />
          </button>
        </header>

        <p className="rep-card-desc">{r.description}</p>

        <div className="rep-card-facts">
          <span><Icon name="report" size={12} /><b className="num">{num(m.count)}</b> records</span>
          <span><Icon name="clock" size={12} />{m.label}</span>
          {m.exports > 0 && <span><Icon name="download" size={12} />{m.exports} export{m.exports === 1 ? '' : 's'} (30d)</span>}
        </div>

        <footer className="rep-card-foot">
          <span className="link">View report<Icon name="chevR" size={12} /></span>
        </footer>
      </article>
    )
  }

  const reportRow = (m) => {
    const r = m.report
    const isPinned = pins.includes(r.id)
    return (
      <button type="button" className="rep-row" key={r.id} onClick={() => onOpen(r.id)}>
        <span className="feed-ic" data-tone={r.tone}><Icon name={r.icon} size={14} /></span>
        <span className="rep-row-m">
          <span className="rep-row-name trunc">{r.name}</span>
          <span className="rep-row-desc trunc">{r.description}</span>
        </span>
        <span className="rep-row-cat">{r.category}</span>
        <span className="rep-row-n num">{num(m.count)}</span>
        <span className="rep-row-when">{m.label}</span>
        <span
          role="button"
          tabIndex={0}
          className="rep-pin"
          data-on={isPinned || undefined}
          aria-label={isPinned ? `Unpin ${r.name}` : `Pin ${r.name}`}
          onClick={(e) => { e.stopPropagation(); togglePin(r.id) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); togglePin(r.id) } }}
        >
          <Icon name="star" size={13} />
        </span>
        <Icon name="chevR" size={13} className="rep-row-go" />
      </button>
    )
  }

  return (
    <>
      <PageBar
        title="Reports"
        sub="Every governed activity in the platform, published as an evidence-grade report — filter it, drill into it and export it."
        crumbs={[{ label: 'Reports' }]}
      />

      <StatCards items={cards} label="Report catalog summary" />

      <div className="wb rep-catalog">
        <div className="wb-bar">
          <div className="wb-search">
            <Icon name="search" size={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports…"
              aria-label="Search reports"
            />
          </div>
          <div className="seg seg-wrap" role="group" aria-label="Filter by category">
            <button type="button" data-on={cat === 'all' || undefined} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                data-on={cat === c.id || undefined}
                aria-pressed={cat === c.id}
                title={c.blurb}
                onClick={() => setCat(c.id)}
              >
                {c.id}
              </button>
            ))}
          </div>
          <div className="wb-bar-r">
            <span className="t-xs t-mut">
              <b className="num">{shown.length}</b> of {REPORTS.length} reports
            </span>
            <div className="seg" role="group" aria-label="Catalog layout">
              {CATALOG_VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  data-on={layout === v.id || undefined}
                  aria-pressed={layout === v.id}
                  title={v.label}
                  onClick={() => setLayout(v.id)}
                >
                  <Icon name={v.icon} size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rep-body">
          {shown.length === 0 ? (
            <EmptyState
              icon="report"
              title="No report matches"
              body="Clear the search or choose another category to see the rest of the catalog."
            />
          ) : (
            <>
              {pinned.length > 0 && (
                <section className="rep-sect">
                  <h2 className="rep-sect-k"><Icon name="star" size={12} />Pinned</h2>
                  {layout === 'grid'
                    ? <div className="rep-grid">{pinned.map(reportCard)}</div>
                    : <div className="rep-list">{pinned.map(reportRow)}</div>}
                </section>
              )}

              <section className="rep-sect">
                <h2 className="rep-sect-k">
                  <Icon name="menu" size={12} />
                  {pinned.length > 0 ? 'All reports' : 'Reports'}
                </h2>
                {layout === 'grid'
                  ? <div className="rep-grid">{rest.map(reportCard)}</div>
                  : <div className="rep-list">{rest.map(reportRow)}</div>}
              </section>
            </>
          )}
        </div>

        <div className="wb-foot">
          <span>
            Every report reads live console data · export writes exactly the rows on screen
          </span>
          <div className="spacer" />
          <span className="t-faint">Data through {niceDate(TODAY)}</span>
        </div>
      </div>
    </>
  )
}

/**
 * One filter field, rendered from its declaration.
 *
 * The shape of the control follows the shape of the data: a closed set the
 * report actually holds becomes a chooser, and a free-form column stays a
 * search box. Nothing here knows which report it is filtering.
 */
function FilterField({ spec, value, onChange }) {
  const id = `fp-${spec.id}`

  if (spec.type === 'dateRange') {
    const preset = presetOf(value)
    return (
      <div className="field rep-fp-date">
        <span className="field-label">{spec.label}</span>
        <div className="rep-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              data-on={preset === p.id || undefined}
              aria-pressed={preset === p.id}
              onClick={() => onChange(p.days == null
                ? { from: '', to: '' }
                : { from: shiftDays(TODAY, p.days), to: TODAY })}
            >
              <Icon name="calendar" size={12} />{p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-2">
          <Field label="From" htmlFor={`${id}-from`}>
            <TextInput
              id={`${id}-from`}
              type="date"
              value={value.from}
              max={value.to || undefined}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </Field>
          <Field label="To" htmlFor={`${id}-to`}>
            <TextInput
              id={`${id}-to`}
              type="date"
              value={value.to}
              min={value.from || undefined}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </Field>
        </div>
      </div>
    )
  }

  if (spec.type === 'multi') {
    return (
      <Field label={spec.label} span={2}>
        {/* Several values at once: a row matching any of them is kept. */}
        <div className="rep-fp-opts" role="group" aria-label={spec.label}>
          {spec.options.map((o) => {
            const val = String(optionValue(o))
            const on = value.includes(val)
            return (
              <button
                key={val}
                type="button"
                className="chip"
                data-on={on || undefined}
                aria-pressed={on}
                onClick={() => onChange(on ? value.filter((x) => x !== val) : [...value, val])}
              >
                <Icon name={on ? 'check' : 'plus'} size={11} />{optionLabel(o)}
              </button>
            )
          })}
        </div>
      </Field>
    )
  }

  if (spec.type === 'select') {
    return (
      <Field label={spec.label} htmlFor={id}>
        <Select
          id={id}
          value={value}
          placeholder={spec.placeholder || 'Any'}
          options={spec.options}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    )
  }

  return (
    <Field label={spec.label} htmlFor={id}>
      <TextInput
        id={id}
        value={value}
        placeholder={spec.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

/**
 * The filter drawer.
 *
 * It edits its own draft and commits on Apply, so the table is not re-filtered
 * on every keystroke and the drawer element does not have to be rebuilt as the
 * operator types.
 */
function FilterPanel({ report, initial, onApply, onReset }) {
  const specs = report.filters || []
  const [d, setD] = useState(initial)
  const set = (id, v) => setD((x) => ({ ...x, [id]: v }))
  const n = filterChips(specs, d).length

  return (
    <div className="stack">
      <div className="grid grid-2 rep-fp-grid">
        {specs.map((spec) => (
          <FilterField
            key={spec.id}
            spec={spec}
            value={d[spec.id] ?? blankValue(spec)}
            onChange={(v) => set(spec.id, v)}
          />
        ))}
      </div>

      <div className="rep-fp-act">
        <span className="t-xs t-mut">{n === 0 ? 'No filters set' : `${n} filter${n === 1 ? '' : 's'} set`}</span>
        <div className="spacer" />
        <Button icon="refresh" onClick={onReset}>Reset</Button>
        <Button variant="pri" icon="filter" onClick={() => onApply(d)}>Apply</Button>
      </div>
    </div>
  )
}

function ReportView({ report, onBack }) {
  const { toast, setDrawer } = useApp()
  const specs = report.filters || []
  const [f, setF] = useState(() => blankValues(specs))
  const [zone, setZone] = useLocalState('tf-idam-report-zone', 'app')

  const all = useMemo(() => report.rows(), [report])
  const rows = useMemo(() => applyReportFilters(specs, all, f), [specs, all, f])
  const stats = useMemo(() => report.stats(rows), [report, rows])

  const chips = filterChips(specs, f)
  const nActive = chips.length
  const dateSpec = specs.find((s) => s.type === 'dateRange')
  const dateWindow = dateSpec ? f[dateSpec.id] : null

  const reset = () => setF(blankValues(specs))
  const clearOne = (id) => setF((x) => ({ ...x, [id]: blankValue(specs.find((s) => s.id === id)) }))
  const detailKind = (report.detail && report.detail.kind) || 'record'

  const openRow = (r) => setDrawer({
    title: report.detail ? report.detail.label : 'Details',
    sub: r.ts ? `${report.name} · ${inZone(r.ts, zone)} ${zoneSuffix(zone)}` : report.name,
    size: detailKind === 'record' ? 'md' : 'lg',
    children: <ReportDetail report={report} row={r} zone={zone} />,
  })

  const columns = useMemo(() => {
    const base = report.columns.map((c) => (c.key === 'ts'
      // Timestamps are stored in application time; the selector converts them
      // on render so the report can be read against a gateway log in UTC.
      ? { ...c, render: (r) => <span className="td-mono">{inZone(r.ts, zone) || '—'}</span> }
      : c))
    return [
      { key: '__sno', label: 'S.No.', width: 68, sortable: false, cls: 'td-mono', render: (r, i) => i + 1 },
      ...base,
      {
        // An explicit control, not a whole-row click: the row is wide and the
        // reader has to know the detail is there before they go looking.
        key: '__detail',
        label: report.detail ? report.detail.column : 'Details',
        width: 132,
        sortable: false,
        csv: false,
        render: (r) => (
          <Button size="sm" icon="eye" onClick={(e) => { e.stopPropagation(); openRow(r) }}>
            Show Details
          </Button>
        ),
      },
    ]
  }, [report, zone])

  // The panel edits a draft and commits on Apply, so the drawer does not need to
  // re-render on every keystroke — setDrawer only stores the element it is given.
  const openFilters = () => setDrawer({
    title: 'Filters',
    sub: `Narrow ${report.name} before you read or export it.`,
    size: 'md',
    children: (
      <FilterPanel
        report={report}
        initial={f}
        onApply={(next) => { setF(next); setDrawer(null) }}
        onReset={() => { reset(); setDrawer(null) }}
      />
    ),
  })

  const exportNow = () => {
    if (!rows.length) { toast('warn', 'Nothing to export', 'No rows match the current filters.'); return }
    /* The download has to agree with the screen. Writing stored application
       time into a file the reader asked to see in UTC produces an export that
       silently contradicts the report it came from. */
    const csvColumns = report.columns.map((c) => (c.key === 'ts'
      ? { ...c, label: `${c.label} (${zoneSuffix(zone)})`, csv: (r) => inZone(r.ts, zone) }
      : c))
    // Exactly the rows on screen: the filters are applied before the file is
    // written, never after it.
    const name = exportRows(report, csvColumns, rows, TODAY)
    recordExport(report.id)
    toast(
      'ok',
      'Report downloaded',
      nActive === 0
        ? `All ${num(rows.length)} rows written to ${name} in ${zoneById(zone).label.replace(' (default)', '')}.`
        : `${num(rows.length)} filtered rows of ${num(all.length)} written to ${name}, matching the ${nActive} active filter${nActive === 1 ? '' : 's'}.`,
    )
  }

  return (
    <>
      <PageBar
        title={report.name}
        sub={report.description}
        crumbs={[{ label: 'Reports', to: 'reports' }, { label: report.name }]}
        badge={<Pill tone={report.tone} dot>{report.category}</Pill>}
        /* Download and Filters sit here on every report, in this order, so an
           operator moving between reports does not have to find them again. */
        actions={
          <>
            <Button icon="chevL" onClick={onBack}>All reports</Button>
            <Button icon="download" onClick={exportNow}>Download</Button>
            <Button variant="pri" icon="filter" onClick={openFilters}>
              Filters
              {nActive > 0 && <span className="rep-fbadge num">{nActive}</span>}
            </Button>
          </>
        }
        rail={
          <>
            {stats.map((s) => (
              <span className="chip" key={s.k}><Icon name={s.icon} size={12} />{s.v} {s.k.toLowerCase()}</span>
            ))}
            {dateWindow && <span className="chip"><Icon name="calendar" size={12} />{rangeLabel(dateWindow.from, dateWindow.to)}</span>}
          </>
        }
      />

      <div className="stack">
        {/* The active-filter row. It renders whether or not anything is set, so
            the report data starts at the same place on every report and the
            answer to "what am I looking at" is always in the same spot. */}
        <section className="rep-active" aria-label="Active filters">
          <span className="rep-active-k">
            <Icon name="filter" size={12} />
            {nActive > 0 ? `Active filters (${nActive})` : 'No filters applied'}
          </span>

          {nActive > 0 ? (
            <div className="rep-active-chips">
              {chips.map((c) => (
                <span key={c.id} className="chip" data-on="true">
                  <span className="rep-chip-k">{c.label}</span>
                  {c.text}
                  <button
                    type="button"
                    className="chip-x"
                    aria-label={`Remove the ${c.label} filter`}
                    onClick={() => clearOne(c.id)}
                  >
                    <Icon name="x" size={9} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="t-xs t-mut">Every row this report holds is shown and will be exported.</span>
          )}

          <div className="spacer" />
          <span className="rep-active-n t-xs t-mut">
            <b className="num">{num(rows.length)}</b> of <b className="num">{num(all.length)}</b> rows
          </span>
          {nActive > 0 && <Button size="sm" icon="x" onClick={reset}>Clear all</Button>}
        </section>

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
              body="Remove a filter or widen the date range to bring rows back into the report."
              actions={<Button variant="pri" icon="refresh" onClick={reset}>Clear all filters</Button>}
            />
          </Card>
        ) : (
          <DataWorkbench
            id={`report-${report.id}`}
            rows={rows}
            columns={columns}
            pageSize={10}
            scrollBody
            searchPlaceholder={`Search within ${num(rows.length)} rows…`}
            onRowClick={openRow}
            toolbar={(
              <span className="rep-zone">
                <label className="rep-zone-k" htmlFor="rr-zone">Times in</label>
                <Select
                  id="rr-zone"
                  value={zone}
                  options={ZONE_OPTIONS()}
                  onChange={(e) => setZone(e.target.value)}
                />
              </span>
            )}
            emptyTitle="No rows match the search"
            emptyBody="Clear the search box to see every filtered row."
            emptyIcon={report.icon}
            footNote={`${dateWindow ? `${rangeLabel(dateWindow.from, dateWindow.to)} · ` : ''}${zoneSuffix(zone)} · generated ${niceDate(TODAY)}`}
          />
        )}
      </div>
    </>
  )
}

/**
 * A report is a place, not a mode.
 *
 * The open report used to live in component state, so it could not be linked,
 * bookmarked or reached with the back button — an auditor asked to "look at the
 * SMS-OTP log" had to be told which tile to click. It is a path segment now,
 * and an unknown id falls back to the catalog rather than a blank screen.
 */
export default function ReportsPage({ segments = [] }) {
  const { navigate } = useApp()
  const report = segments[0] ? reportById(segments[0]) : null

  if (segments[0] && !report) {
    return (
      <>
        <PageBar
          title="Report not found"
          crumbs={[{ label: 'Reports', to: 'reports' }, { label: 'Not found' }]}
        />
        <Card>
          <EmptyState
            icon="report"
            title={`No report called “${segments[0]}”`}
            body="It may have been renamed. The catalog lists every report the console publishes."
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate('reports')}>Back to reports</Button>}
          />
        </Card>
      </>
    )
  }

  if (!report) return <ReportCatalog onOpen={(id) => navigate(`/iam/reports/${id}`)} />
  return <ReportView key={report.id} report={report} onBack={() => navigate('reports')} />
}
