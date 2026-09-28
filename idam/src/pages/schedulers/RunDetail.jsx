import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import {
  Skeleton, SkeletonCard, SkeletonList, SkeletonTable, SkeletonText,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { duration, num, statusTone } from '../../lib/format'
import { getServiceLogs, workerLines } from './schedulerApi'
import { schedulerTime } from './schedulerModel'
import {
  emptyStateFor, isKnownOutcome, needsAttention, outcomeLabel, outcomeTone,
  refLabel, resultViewFor, runSummaryFor,
} from './runResults'

/**
 * One run, and what it did to each record.
 *
 * The per-item table was shaped for user deprovisioning — a username and a date
 * of retirement — and four services were reading it. For Approval Escalation a
 * record is a request, for Audit Log Cleanup it is a retention policy, for
 * Recertification it is a campaign, and a date of retirement means nothing to
 * any of them. Each of the four brings its own columns; everything else keeps
 * the plain record view.
 *
 * Times are converted once, into the zone the response reports in
 * `display_timezone`, through the scheduler's own helper. The console's general
 * date formatter is not used anywhere on this screen: it treats a stamp as
 * already local and would add the offset a second time.
 */

const dash = <span className="t-faint">—</span>

const names = (list) => (list || []).filter(Boolean).join(', ')

/* From → to. The single most useful fact in an escalation row: a reader wants
   to know who lost the request and who has it now, and everything else in the
   row is context for that. */
const FromTo = ({ details }) => {
  const to = names(details?.newApprovers)
  if (!to) return dash
  return (
    <span className="sch-move">
      <span className="sch-move-a">{names(details?.previousApprovers) || 'nobody'}</span>
      <Icon name="arrowRight" size={12} />
      <span className="sch-move-b">{to}</span>
    </span>
  )
}

/**
 * The outcome, in words.
 *
 * An operation this console has never heard of still renders — title-cased off
 * the part after the colon — and is marked as such, because a rule the server
 * added is worth noticing rather than worth hiding. The raw operation is on the
 * cell's title for anyone comparing against a server log.
 */
const Outcome = ({ row }) => (
  <span className="sch-outcome" title={row.operation_type}>
    {outcomeLabel(row.operation_type)}
    {!isKnownOutcome(row.operation_type) && (
      <span title={`${row.operation_type} is not in this console’s outcome list`}>
        <Tag tone="mut">New outcome</Tag>
      </span>
    )}
  </span>
)

const Result = ({ row }) => (
  <Pill tone={outcomeTone(row)} dot>
    {row.success === false ? 'Failed' : outcomeTone(row) === 'mut' ? 'No change' : 'Done'}
  </Pill>
)

/* A message, with whatever evidence the row carries under it. The archive path
   is a location on the server and deliberately not a link — a browser cannot
   open it, and a link that goes nowhere is worse than plain text. */
const Message = ({ row }) => (
  <span className="cell-stack">
    <span>{row.message}</span>
    {row.details?.archivePath && (
      <span className="sch-evidence">
        <Icon name="save" size={11} />
        <code className="sch-path">{row.details.archivePath}</code>
        {row.details.verification
          ? <Pill tone="ok">{row.details.verification}</Pill>
          : <Pill tone="warn" dot>Not verified</Pill>}
      </span>
    )}
  </span>
)

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const approvalColumns = (tz, navigate) => [
  {
    key: 'ref',
    label: 'Request',
    cls: 'td-mono',
    render: (r) => (
      <button type="button" className="link" onClick={() => navigate(`/iam/approvals/${r.entity_ref}`)}>
        {refLabel(r.entity_ref)}
      </button>
    ),
  },
  { key: 'type', label: 'Type', render: (r) => r.details?.requestType || dash },
  { key: 'by', label: 'Raised by', cls: 'td-flex', render: (r) => r.details?.requestedBy || dash },
  {
    key: 'waiting',
    label: 'Waiting',
    cls: 'td-num',
    render: (r) => (r.details?.waitingDays == null ? dash : `${num(r.details.waitingDays)} days`),
  },
  { key: 'outcome', label: 'Outcome', width: 200, render: (r) => <Outcome row={r} /> },
  { key: 'result', label: 'Result', render: (r) => <Result row={r} /> },
  { key: 'message', label: 'Message', cls: 'td-flex', render: (r) => <Message row={r} /> },
  { key: 'when', label: 'When', cls: 'td-mono', render: (r) => schedulerTime(r.created_at, tz) },
]

const COLUMNS = {
  escalation: (tz, navigate) => {
    const cols = approvalColumns(tz, navigate)
    /* The move sits immediately after the outcome that produced it, so the rule
       and its result read as one sentence across the row. */
    cols.splice(5, 0, { key: 'moved', label: 'From → to', cls: 'td-flex', render: (r) => <FromTo details={r.details} /> })
    return cols
  },

  reminder: (tz, navigate) => {
    const cols = approvalColumns(tz, navigate)
    cols.splice(5, 0, {
      key: 'sent',
      label: 'Sent to',
      cls: 'td-flex',
      render: (r) => (names(r.details?.approvers)
        ? <span className="sch-move"><span className="sch-move-a">Reminder {r.details.reminderNumber}</span><Icon name="arrowRight" size={12} /><span className="sch-move-b">{names(r.details.approvers)}</span></span>
        : dash),
    })
    return cols
  },

  cleanup: () => [
    { key: 'ref', label: 'Log type', cls: 'td-mono td-main', render: (r) => r.entity_ref },
    { key: 'table', label: 'Table', cls: 'td-mono', render: (r) => r.details?.table || dash },
    {
      key: 'action',
      label: 'Action',
      width: 230,
      /* A preview row carries how much it found; the label alone says only that
         it looked. Both the Archived and Deleted columns read zero on a dry
         run, so this is the only place the size of the job appears. */
      render: (r) => (
        <span className="cell-stack">
          <Outcome row={r} />
          {r.details?.wouldRemove != null && (
            <span className="cell-sub">{num(r.details.wouldRemove)} past retention</span>
          )}
        </span>
      ),
    },
    {
      key: 'archived',
      label: 'Archived',
      cls: 'td-num',
      render: (r) => (r.details?.rowsArchived ? num(r.details.rowsArchived) : <span className="t-faint">0</span>),
    },
    {
      key: 'deleted',
      label: 'Deleted',
      cls: 'td-num',
      render: (r) => (r.details?.rowsDeleted ? num(r.details.rowsDeleted) : <span className="t-faint">0</span>),
    },
    { key: 'cutoff', label: 'Cutoff', cls: 'td-mono', render: (r) => r.details?.cutoff || dash },
    { key: 'result', label: 'Result', render: (r) => <Result row={r} /> },
    { key: 'message', label: 'Message', cls: 'td-flex', render: (r) => <Message row={r} /> },
  ],

  campaign: (tz, navigate) => [
    {
      key: 'ref',
      label: 'Campaign',
      cls: 'td-main td-flex',
      render: (r) => (r.details?.campaignId
        ? (
          <button type="button" className="link trunc" onClick={() => navigate(`/iam/recertification/${r.details.campaignId}`)}>
            {r.details.campaignName}
          </button>
        )
        : <span className="trunc">{r.details?.campaignName || r.entity_ref}</span>),
    },
    { key: 'id', label: 'Campaign id', cls: 'td-mono', render: (r) => (r.details?.campaignId ? refLabel(r.details.campaignId) : dash) },
    { key: 'period', label: 'Period', cls: 'td-mono', render: (r) => r.details?.period || dash },
    { key: 'outcome', label: 'Outcome', width: 240, render: (r) => <Outcome row={r} /> },
    { key: 'result', label: 'Result', render: (r) => <Result row={r} /> },
    { key: 'message', label: 'Message', cls: 'td-flex', render: (r) => <Message row={r} /> },
    { key: 'when', label: 'When', cls: 'td-mono', render: (r) => schedulerTime(r.created_at, tz) },
  ],

  generic: (tz) => [
    { key: 'ref', label: 'Record', cls: 'td-mono td-main', render: (r) => r.entity_ref },
    { key: 'outcome', label: 'Outcome', render: (r) => <Outcome row={r} /> },
    { key: 'result', label: 'Result', render: (r) => <Result row={r} /> },
    { key: 'message', label: 'Message', cls: 'td-flex', render: (r) => <Message row={r} /> },
    { key: 'when', label: 'When', cls: 'td-mono', render: (r) => schedulerTime(r.created_at, tz) },
  ],
}

/* The table scrolls inside its own box. Eight columns do not fit a drawer on a
   laptop and will never fit a phone; taking the page with them would move the
   masthead and the run summary out from under the reader as well. */
function ResultTable({ columns, rows }) {
  return (
    <div className="sch-tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.cls} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-attention={needsAttention(r) ? 'true' : undefined}>
              {columns.map((c) => <td key={c.key} className={c.cls}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RunSummary({ summary }) {
  return (
    <div>
      <div className="cfg-group-h">Run summary</div>
      <div className="stat-strip">
        {summary.mode && (
          /* Mode leads and is the only cell here that is not a count: a reader
             who takes a dry run for an apply misreads every number beside it. */
          <div className="stat-cell sch-mode">
            <span className="stat-k"><Icon name="sliders" size={12} />Mode</span>
            <span className="stat-v">
              <Pill tone={summary.mode === 'Apply' ? 'warn' : 'info'} dot>{summary.mode}</Pill>
            </span>
          </div>
        )}
        {summary.facts.map((f) => (
          <div className="stat-cell" key={f.label}>
            <span className="stat-k"><Icon name={f.icon || 'layers'} size={12} />{f.label}</span>
            <span className="stat-v" data-tone={f.tone && f.value ? f.tone : undefined}>
              {f.text ? <span className="sch-stat-text">{f.value}</span> : num(f.value)}
            </span>
          </div>
        ))}
      </div>
      {summary.chips && summary.chips.length > 0 && (
        <div className="sch-chip-row">
          <span className="sch-chip-k">{summary.chipsLabel}</span>
          {summary.chips.map((c) => (
            <Tag key={c.key} tone="info">{c.label} · {num(c.value)}</Tag>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The run, opened from the history.
 *
 * A component rather than an element handed straight to the drawer, because
 * opening a run is its own round trip: the worker output and the per-item
 * results are retained beside the execution record, not inside it. The whole
 * panel settles together — a stat strip that lands before the results under it
 * reads as two separate waits for one thing.
 */
export default function RunDetail({ execution, scheduler, svc }) {
  const { navigate, can } = useApp()
  const [attempt, setAttempt] = useState(0)
  const [onlyFailures, setOnlyFailures] = useState(false)
  /* The run is what settles, and a retry re-enters that wait. The failures
     filter deliberately does not: it narrows what is already on screen, and
     blanking the table you just filtered is a worse answer than showing the
     shorter one immediately. */
  const loading = useLoading(`${execution.id}|${attempt}`)

  /* The permission the server checks before it will read the log at all. A
     refusal is a response with a message, not an absence. */
  const allowed = can('Schedulers', 'View Scheduler service logs')

  /* `attempt` is a dependency on purpose and is not read inside: Try again
     re-issues the call, and re-entering the settle is what makes a retry look
     like one rather than like a button that does nothing. */
  const response = useMemo(
    () => getServiceLogs({ execution, scheduler, service: svc, onlyFailures, allowed }),
    [execution, scheduler, svc, onlyFailures, allowed, attempt],
  )

  const tz = response.display_timezone
  const view = resultViewFor(svc?.serviceCode)
  const rows = response.totalResults

  /* The summary describes the run, not the filter. Counted from the whole
     result set even while the table below shows only the failures — a "Due"
     that drops to 3 because three rows failed is not a fact about the run. */
  const whole = useMemo(
    () => (onlyFailures ? getServiceLogs({ execution, scheduler, service: svc, allowed }) : response),
    [onlyFailures, response, execution, scheduler, svc, allowed],
  )
  const summary = useMemo(
    () => runSummaryFor(view, whole.totalResults, execution, execution.config),
    [view, whole, execution],
  )
  const columns = useMemo(() => COLUMNS[view](tz, navigate), [view, tz, navigate])

  if (loading) {
    return (
      <Skeleton label={`Loading run ${execution.id}`}>
        <div className="stack">
          <SkeletonList rows={1} media={false} trailing={false} />
          <SkeletonText lines={2} />
          <SkeletonCard head><SkeletonText lines={6} /></SkeletonCard>
          <SkeletonCard head><SkeletonTable rows={6} cols={5} /></SkeletonCard>
        </div>
      </Skeleton>
    )
  }

  const results = () => {
    if (response.status === 403) {
      return (
        <EmptyState
          size="sm"
          icon="lock"
          title="These results are not yours to read"
          body={response.message}
        />
      )
    }
    if (!response.ok) {
      return (
        <EmptyState
          size="sm"
          icon="warn"
          title="The per-item results could not be read"
          body={response.message}
          actions={<Button icon="refresh" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>}
        />
      )
    }
    if (rows.length === 0 && onlyFailures) {
      return (
        <EmptyState
          size="sm"
          icon="checkC"
          title="Nothing in this run failed"
          body={`All ${num(execution.records_processed)} results succeeded. Switch off Failures only to see them.`}
        />
      )
    }
    if (rows.length === 0) {
      const empty = emptyStateFor(svc?.serviceCode, execution.config)
      return <EmptyState size="sm" icon={empty.icon} title={empty.title} body={empty.body} />
    }
    return <ResultTable columns={columns} rows={rows} />
  }

  return (
    <div className="stack">
      {/* B4.3 — neutral, never success. A rehearsal read as the real thing is
          the one misreading this screen cannot afford. */}
      {execution.dry_run && (
        <Banner tone="info">
          <strong>Dry run — nothing was changed.</strong>{' '}
          These are the actions this scheduler would have taken.
        </Banner>
      )}

      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="activity" size={12} />Status</span>
          <span className="stat-v"><Pill tone={statusTone(execution.status)} dot>{execution.status}</Pill></span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="clock" size={12} />Duration</span>
          <span className="stat-v">{duration(execution.duration_ms)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="layers" size={12} />Records</span>
          <span className="stat-v">{num(execution.records_processed)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="warn" size={12} />Failed</span>
          <span className="stat-v">{num(execution.records_failed)}</span>
        </div>
      </div>

      <div className="t-sm t-mut">
        {execution.trigger === 'Manual' ? 'Dispatched by an operator' : 'Dispatched on schedule'} · started {schedulerTime(execution.started_at, tz)}
        {execution.finished_at ? ` · finished ${schedulerTime(execution.finished_at, tz)}` : ' · still running'}
        {execution.attempt > 1 && ` · attempt ${execution.attempt}`}
        {` · times in ${tz}`}
      </div>

      {/* Only where the summary says something the strip above does not. For a
          plain record log it would be the same two numbers a second time. */}
      {response.ok && whole.totalResults.length > 0 && view !== 'generic' && <RunSummary summary={summary} />}

      <div>
        <div className="cfg-group-h">Worker output</div>
        <div className="log-view">
          {workerLines(execution, svc).map((l, i) => <div key={i} className={l.tone}>{l.text}</div>)}
        </div>
      </div>

      {svc?.metadata?.producesItemLogs ? (
        <div>
          <div className="sch-results-h">
            <div className="cfg-group-h">
              Per-run results
              {response.ok && <span className="cfg-group-n">{num(response.totalCount)}</span>}
            </div>
            {/* Left on screen and disabled when the log cannot be read at all:
                the filter exists, and which of those two it is matters. */}
            <span className="sch-failfilter">
              <span>Failures only</span>
              <Switch
                checked={onlyFailures}
                disabled={!response.ok}
                label="Show only the results that failed"
                onChange={setOnlyFailures}
              />
            </span>
          </div>
          {results()}
        </div>
      ) : (
        <div className="t-xs t-mut">
          {svc?.displayName || 'This service'} does not produce per-item results — only the worker output above is retained.
        </div>
      )}
    </div>
  )
}
