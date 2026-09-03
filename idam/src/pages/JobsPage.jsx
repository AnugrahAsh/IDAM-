import './styles/JobsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Pill from '../components/primitives/Pill'
import StatCards from '../components/workbench/StatCards'
import RecordCard, { CardIcon } from '../components/workbench/RecordCard'
import { useLocalState } from '../lib/useLocalState'
import Button from '../components/primitives/Button'
import EmptyState from '../components/primitives/EmptyState'
import Icon from '../components/primitives/Icon'
import Tabs from '../components/primitives/Tabs'
import Meter from '../components/primitives/Meter'
import TextInput from '../components/primitives/TextInput'
import { useApp } from '../store/AppContext'
import { duration, num, serialColumn, statusTone } from '../lib/format'
import { JOBS, USERS } from '../data/seed'
import { appliedPct, meterTone } from './jobs/jobDetailData'
import { withDerivedCounts } from './jobs/jobData'
import JobDetail from './jobs/JobDetail'

const LIST_PATH = '/iam/jobs'

const DAYS = [...new Set(JOBS.map((j) => j.started.slice(0, 10)))].sort()

const TODAY = DAYS[DAYS.length - 1]

const SERIES = [
  { key: 'succeeded', label: 'Succeeded', color: 'var(--s2)' },
  { key: 'failed', label: 'Failed', color: 'var(--s6)' },
  { key: 'running', label: 'Running', color: 'var(--s1)' },
  { key: 'canceled', label: 'Canceled', color: 'var(--mut)' },
]

const isDone = (j) => j.status !== 'Running'

/* A group header that counted only terminal outcomes read "0 ok · 0 failed"
   over every section of the in-progress tab, where nothing has an outcome yet.
   It now names whatever statuses the section actually holds. */
const GROUP_WORD = { Succeeded: 'ok', Failed: 'failed', Running: 'running', Canceled: 'canceled' }

const groupSummary = (section) => {
  const seen = section.reduce((a, j) => ({ ...a, [j.status]: (a[j.status] || 0) + 1 }), {})
  return Object.keys(GROUP_WORD)
    .filter((k) => seen[k])
    .map((k) => `${seen[k]} ${GROUP_WORD[k]}`)
    .join(' · ')
}

const VIEWS = [
  { id: 'table', label: 'Table', icon: 'menu', desc: 'Dense run history with sortable columns' },
  { id: 'cards', label: 'Cards', icon: 'apps', desc: 'One card per run' },
  { id: 'groups', label: 'Grouped', icon: 'layers', desc: 'History split into sections' },
]

const GROUPINGS = [
  { id: 'module', label: 'Module', of: (j) => j.module },
  { id: 'status', label: 'Outcome', of: (j) => j.status },
  { id: 'target', label: 'Target', of: (j) => j.target },
  { id: 'triggeredBy', label: 'Triggered by', of: (j) => j.triggeredBy },
  { id: 'day', label: 'Day', of: (j) => String(j.started).slice(0, 10) },
]

export default function JobsPage({ segments = [] }) {
  const { toast, confirm, navigate, setModal, setDrawer } = useApp()
  const [tab, setTab] = useState('all')
  const [view, setView] = useLocalState('tf-idam-jobs-view', 'table')
  const [groupBy, setGroupBy] = useLocalState('tf-idam-jobs-groupby', 'module')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState(() => JOBS.map(withDerivedCounts))

  const completed = useMemo(() => rows.filter(isDone), [rows])
  const inProgress = useMemo(() => rows.filter((j) => j.status === 'Running'), [rows])
  const failed = useMemo(() => rows.filter((j) => j.status === 'Failed'), [rows])

  const dated = useMemo(() => {
    const pick = tab === 'progress' ? inProgress : tab === 'completed' ? completed : tab === 'failed' ? failed : rows
    return pick.filter((j) => {
      const day = String(j.started).slice(0, 10)
      if (startDate && day < startDate) return false
      if (endDate && day > endDate) return false
      return true
    })
  }, [tab, rows, inProgress, completed, failed, startDate, endDate])

  const stats = useMemo(() => {
    const today = rows.filter((j) => j.started.slice(0, 10) === TODAY)
    const finished = rows.filter((j) => j.status === 'Succeeded' || j.status === 'Failed')
    const totalMs = rows.reduce((a, j) => a + j.durationMs, 0)
    return {
      running: rows.filter((j) => j.status === 'Running').length,
      succeeded24: today.filter((j) => j.status === 'Succeeded').length,
      failed24: today.filter((j) => j.status === 'Failed').length,
      avgMs: rows.length ? Math.round(totalMs / rows.length) : 0,
      runs: rows.length,
      successRate: finished.length ? (finished.filter((j) => j.status === 'Succeeded').length / finished.length) * 100 : 0,
      records: rows.reduce((a, j) => a + j.succeeded, 0),
      recordsFailed: rows.reduce((a, j) => a + j.failed, 0),
      longRunning: rows.filter((j) => j.durationMs > 300000).length,
    }
  }, [rows])

  const doneStats = useMemo(() => {
    const totalMs = completed.reduce((a, j) => a + j.durationMs, 0)
    return {
      total: completed.length,
      succeeded: completed.filter((j) => j.status === 'Succeeded').length,
      failed: completed.filter((j) => j.status === 'Failed').length,
      canceled: completed.filter((j) => j.status === 'Canceled').length,
      records: completed.reduce((a, j) => a + j.succeeded, 0),
      rejected: completed.reduce((a, j) => a + j.failed, 0),
      avgMs: completed.length ? Math.round(totalMs / completed.length) : 0,
    }
  }, [completed])

  const outcomeSeries = useMemo(
    () => DAYS.map((d) => {
      const inDay = rows.filter((j) => j.started.slice(0, 10) === d)
      return {
        d,
        succeeded: inDay.filter((j) => j.status === 'Succeeded').length,
        failed: inDay.filter((j) => j.status === 'Failed').length,
        running: inDay.filter((j) => j.status === 'Running').length,
        canceled: inDay.filter((j) => j.status === 'Canceled').length,
      }
    }),
    [rows],
  )

  const mutate = (ids, patch, title, body) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, ...patch } : r)))
    toast('ok', title, body)
  }

  const cancel = (list) => {
    const running = list.filter((r) => r.status === 'Running')
    if (running.length === 0) {
      toast('info', 'Nothing to cancel', 'Only running executions can be canceled.')
      return
    }
    confirm({
      title: running.length === 1 ? `Cancel ${running[0].jobId}?` : `Cancel ${running.length} executions?`,
      body: 'Records already written to the target are not rolled back. The remainder of the batch is discarded and must be replayed.',
      confirmLabel: 'Cancel execution',
      onConfirm: () => mutate(running.map((r) => r.id), { status: 'Canceled' }, 'Execution canceled', `${running.length} ${running.length === 1 ? 'job' : 'jobs'} stopped.`),
    })
  }

  const remove = (list, done) => {
    const removable = list.filter((r) => r.status !== 'Running')
    if (removable.length === 0) {
      toast('info', 'Nothing to remove', 'Cancel a running execution before removing it from history.')
      if (done) done()
      return
    }
    confirm({
      title: removable.length === 1 ? `Remove ${removable[0].jobId}?` : `Remove ${removable.length} executions?`,
      body: 'The execution record and its per-record outcomes are deleted from job history. Records already written to the target are unaffected. This cannot be undone.',
      confirmLabel: `Remove ${removable.length}`,
      onConfirm: () => {
        const set = new Set(removable.map((r) => String(r.id)))
        setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
        toast('ok', 'Execution removed', `${removable.length} ${removable.length === 1 ? 'record' : 'records'} deleted from job history.`)
        if (done) done()
      },
    })
  }

  const selected = segments[0] ? rows.find((r) => r.jobId === segments[0]) : null

  if (segments[0]) {
    if (!selected) {
      return (
        <>
          <PageBar
            title="Execution not found"
            sub="This job execution is no longer in history."
            crumbs={[{ label: 'Background Jobs', to: LIST_PATH }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="jobs"
            title="No execution with that identifier"
            body="It may have been removed from job history since the link was created."
            actions={<Button variant="pri" iconRight="chevR" onClick={() => navigate(LIST_PATH)}>Back to jobs</Button>}
          />
        </>
      )
    }
    return (
      <JobDetail
        job={selected}
        navigate={navigate}
        setModal={setModal}
        setDrawer={setDrawer}
        onCancel={() => cancel([selected])}
        onRemove={() => remove([selected], () => navigate(LIST_PATH))}
        onDownload={() => toast('ok', 'Result file queued', `${selected.jobId} · ${num(selected.total)} records will be exported as CSV.`)}
      />
    )
  }

  const columns = [
    serialColumn('S.No'),
    { key: 'module', label: 'Module', locked: true, cls: 'td-main', render: (r) => <span className="tag">{r.module}</span> },
    { key: 'operation', label: 'Operation' },
    {
      key: 'progress', label: 'Progress', width: 168, sortable: false,
      render: (r) => (
        <span className="cell-id" style={{ gap: 8 }}>
          <span style={{ flex: 1, minWidth: 64 }}>
            <Meter value={appliedPct(r)} tone={meterTone(r.status)} />
          </span>
          {/* The meter already reads applied-over-total; printing a flat 100%
              beside it told a run that rejected 90 records it had applied
              everything. Both now say the same thing. */}
          <span className="t-xs t-mut num" style={{ flex: 'none' }}>{`${appliedPct(r)}%`}</span>
        </span>
      ),
    },
    { key: 'total', label: 'Total', align: 'right', render: (r) => num(r.total) },
    { key: 'succeeded', label: 'Success', align: 'right', render: (r) => num(r.succeeded) },
    {
      key: 'failed', label: 'Failed', align: 'right',
      render: (r) => (r.failed > 0
        ? <span className="num" style={{ color: 'var(--bad)', fontWeight: 600 }}>{num(r.failed)}</span>
        : <span className="t-faint num">0</span>),
    },
    { key: 'started', label: 'Create On', cls: 'td-mono' },
  ]

  const rowActions = (r) => [
    { id: 'view', label: 'View job details', icon: 'eye', onSelect: () => navigate(`${LIST_PATH}/${r.jobId}`) },
    {
      id: 'download',
      label: 'Download job details',
      icon: 'download',
      onSelect: () => toast('ok', 'Download queued', `${r.jobId} — payload, response and the full run log are being bundled as ${r.jobId}.zip.`),
    },
    { divider: true },
    { id: 'close', label: 'Close job', icon: 'ban', disabled: r.status !== 'Running', onSelect: () => cancel([r]) },
    { id: 'remove', label: 'Remove job', icon: 'trash', danger: true, disabled: r.status === 'Running', onSelect: () => remove([r]) },
  ]

  const bulkActions = (ids, clear) => {
    const list = rows.filter((r) => ids.map(String).includes(String(r.id)))
    return (
      <>
        <Button size="sm" icon="download" onClick={() => { toast('ok', 'Results queued', `${ids.length} result files will be bundled into one archive.`); clear() }}>Download results</Button>
        <Button size="sm" icon="ban" onClick={() => { cancel(list); clear() }}>Cancel running</Button>
        <Button size="sm" variant="danger" icon="trash" onClick={() => remove(list, clear)}>Remove</Button>
      </>
    )
  }

  return (
    <>
      <PageBar
        title="Background Jobs"
        sub="Every provisioning, reconciliation and policy execution the platform has dispatched, with per-record outcomes for replay."
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Execution history is being exported as CSV.')}>Export</Button>
            <Button variant="pri" icon="play" onClick={() => toast('info', 'Run a job', 'The ad-hoc execution wizard opens here.')}>Run job</Button>
          </>
        }
      />

      <StatCards
        items={[
          { id: 'all', icon: 'jobs', label: 'Executions', value: rows.length, chip: `${stats.successRate.toFixed(1)}% ok`, chipTone: stats.successRate > 90 ? 'ok' : 'warn', sub: `over the last ${DAYS.length} days`, hint: 'Every dispatched run' },
          { id: 'progress', icon: 'refresh', label: 'Running now', value: stats.running, chip: stats.running ? 'in flight' : 'idle', sub: 'dispatched and not finished', hint: 'Runs still executing' },
          { id: 'completed', icon: 'checkC', label: 'Succeeded 24h', value: stats.succeeded24, chip: `${num(stats.records)} records`, chipTone: 'ok', sub: 'clean completions', hint: 'Runs that finished cleanly today' },
          { id: 'failed', icon: 'warn', label: 'Failed 24h', value: stats.failed24, chip: `${num(stats.recordsFailed)} records`, chipTone: stats.failed24 ? 'bad' : undefined, sub: 'need a replay', hint: 'Runs that failed today' },
          { key: 'slow', icon: 'clock', label: 'Average duration', value: duration(stats.avgMs), chip: `${stats.longRunning} over 5 min`, chipTone: stats.longRunning ? 'warn' : undefined, sub: 'across every run' },
        ]}
        value={tab}
        onChange={(id) => setTab(id)}
        label="Filter the execution history"
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All Jobs', icon: 'jobs', count: rows.length },
            { id: 'progress', label: 'In-Progress Jobs', icon: 'refresh', count: inProgress.length },
            { id: 'completed', label: 'Completed Jobs', icon: 'checkC', count: completed.length },
            { id: 'failed', label: 'Failed Jobs', icon: 'warn', count: failed.length },
          ]}
        />

        {tab === 'completed' && (
          <div className="stat-strip">
            <div className="stat-cell">
              <span className="stat-k"><Icon name="jobs" size={11} />Completed</span>
              <span className="stat-v">{num(doneStats.total)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="checkC" size={11} />Succeeded</span>
              <span className="stat-v">{num(doneStats.succeeded)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="warn" size={11} />Failed</span>
              <span className="stat-v" style={{ color: doneStats.failed > 0 ? 'var(--bad)' : undefined }}>{num(doneStats.failed)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="ban" size={11} />Canceled</span>
              <span className="stat-v">{num(doneStats.canceled)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="swap" size={11} />Records applied</span>
              <span className="stat-v">{num(doneStats.records)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="clock" size={11} />Average duration</span>
              <span className="stat-v">{duration(doneStats.avgMs)}</span>
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <DataWorkbench
            id={`jobs-${tab}`}
            rows={dated}
            columns={columns}
            selectable
            views={VIEWS}
            view={view}
            onViewChange={setView}
            groupOf={(GROUPINGS.find((g) => g.id === groupBy) || GROUPINGS[0]).of}
            groupSummary={groupSummary}
            renderCard={(j, ctx) => (
              <RecordCard
                ctx={ctx}
                label={j.jobId}
                media={<CardIcon name="jobs" tone={j.status === 'Failed' ? 'bad' : j.status === 'Running' ? 'warn' : 'ok'} />}
                title={j.jobId}
                sub={`${j.module} · ${j.operation}`}
                tags={(
                  <>
                    <Pill tone={statusTone(j.status)} dot>{j.status}</Pill>
                    <span className="spacer" />
                    <span className="rcard-stat"><b className="num">{num(j.total)}</b> records</span>
                  </>
                )}
                line={<span className="trunc">{j.target}</span>}
                meta={[
                  { k: 'Succeeded', v: num(j.succeeded) },
                  { k: 'Failed', v: j.failed ? num(j.failed) : '0' },
                  { k: 'Duration', v: duration(j.durationMs) },
                  { k: 'Triggered by', v: j.triggeredBy },
                ]}
                footR={`Started ${j.started}`}
              />
            )}
            searchPlaceholder="Search"
            bulkActions={bulkActions}
            rowActions={rowActions}
            onRowClick={(j) => navigate(`${LIST_PATH}/${j.jobId}`)}
            toolbar={(
              <>
                <span className="job-filter">
                  <label htmlFor="job-start">Start Date</label>
                  <TextInput id="job-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </span>
                <span className="job-filter">
                  <label htmlFor="job-end">End Date</label>
                  <TextInput id="job-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </span>
                {(startDate || endDate) && (
                  <Button size="sm" icon="x" onClick={() => { setStartDate(''); setEndDate('') }}>Clear</Button>
                )}
              </>
            )}
            emptyTitle="No executions match"
            emptyBody="Clear the search or widen the date range."
            emptyIcon="jobs"
            pageSize={25}
          />

        </div>
      </div>
    </>
  )
}
