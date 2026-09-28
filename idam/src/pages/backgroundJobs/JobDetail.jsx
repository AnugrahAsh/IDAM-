import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { useLoading } from '../../lib/useLoading'
import { JobRecordSkeleton } from './JobsSkeleton'
import { duration, num, serialColumn, statusTone } from '../../lib/format'
import {
  appliedPct, completedAt, hrMinSec, jobResponseFor, meterTone, operationFor,
  payloadFor, recordsFor, responseFor,
} from './jobDetailData'
import JobExchange from './JobExchange'

const LIST_PATH = '/iam/jobs'

const outcomeTone = (o) => (o === 'Failed' ? 'bad' : o === 'Pending' ? 'warn' : 'ok')

/**
 * One job execution.
 *
 * The screen follows the two questions a job is actually opened with, in order:
 * *what was this run, and how did it resolve* (Information), then *what
 * happened to each record it touched* (Job Details). The per-record payload and
 * response — the thing a failed row is opened for — is one click from that
 * register rather than two, and the run-level exchange sits with the summary it
 * belongs to instead of on a tab of its own.
 */
export default function JobDetail({ job, onCancel, onRemove, onDownload, navigate, setModal, setDrawer }) {
  const [tab, setTab] = useState('information')
  /* One flag for the record, keyed on the execution. Both tabs are readings of
     the same per-record outcomes, so moving between them is not a round trip
     and does not settle again — only opening a different execution does. */
  const loading = useLoading(job.jobId)
  const records = useMemo(() => recordsFor(job), [job])
  const exchange = useMemo(() => jobResponseFor(job), [job])
  const op = operationFor(job)
  const done = completedAt(job)

  const throughput = job.durationMs > 0 ? Math.max(1, Math.round(job.total / (job.durationMs / 1000))) : 0
  const counts = useMemo(() => ({
    failed: records.filter((r) => r.outcome === 'Failed').length,
    pending: records.filter((r) => r.outcome === 'Pending').length,
  }), [records])

  const openExchange = (title, sub, payload, response) => setDrawer({
    title,
    sub,
    size: 'wide',
    children: <JobExchange payload={payload} response={response} />,
    footer: <Button onClick={() => setDrawer(null)}>Close</Button>,
  })

  const openRecord = (rec) => openExchange(
    'Details',
    `${op.verb} on ${job.target} for ${rec.displayName} (${rec.principal}).`,
    payloadFor(job, rec),
    responseFor(job, rec),
  )

  const detailColumns = [
    serialColumn('S.No'),
    { key: 'jobId', label: 'Job ID', cls: 'td-mono', width: 108 },
    { key: 'module', label: 'Module', render: (r) => <Tag>{r.module}</Tag> },
    { key: 'entity', label: op.entity || 'Entity', render: (r) => <span className="trunc">{r.entity}</span> },
    {
      key: 'principal', label: 'Username', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-stack">
          <span className="trunc">{r.principal}</span>
          <span className="cell-sub trunc">{r.displayName}</span>
        </span>
      ),
    },
    { key: 'operationCode', label: 'Operation', render: (r) => <Tag tone="acc">{r.operationCode}</Tag> },
    {
      // The target answers with a boolean, and the register prints it as one —
      // an operator scanning for what to replay is looking for "False".
      key: 'success', label: 'Success', width: 96,
      value: (r) => (r.success === true ? 1 : r.success === false ? 0 : -1),
      render: (r) => (r.success == null
        ? <span className="t-faint">—</span>
        : <Pill tone={r.success ? 'ok' : 'bad'} dot>{r.success ? 'True' : 'False'}</Pill>),
      csv: (r) => (r.success == null ? '' : String(r.success)),
    },
    {
      key: 'message', label: 'Message',
      render: (r) => (r.message
        ? <span className="trunc" title={r.message}>{r.message}</span>
        : <span className="t-faint">—</span>),
    },
    {
      key: 'error', label: 'Error', width: 190,
      render: (r) => (r.error === 'N/A'
        ? <span className="t-faint">N/A</span>
        : <span className="mono t-xs" style={{ color: 'var(--bad)' }}>{r.error}</span>),
    },
    { key: 'createdAt', label: 'Create At', cls: 'td-mono', width: 148 },
    {
      key: '__show', label: 'Show details', width: 132, sortable: false, csv: false,
      render: (r) => (
        <Button size="sm" icon="eye" onClick={(e) => { e.stopPropagation(); openRecord(r) }}>View Details</Button>
      ),
    },
  ]

  if (loading) return <JobRecordSkeleton tab={tab} />

  return (
    <>
      <DetailHeader
        backTo={LIST_PATH}
        backLabel="Background Jobs"
        eyebrow="Job execution"
        title={job.jobId}
        sub={`${job.operation} against ${job.target}, dispatched by ${job.triggeredBy}.`}
        media={
          <span className="feed-ic" data-tone={job.status === 'Failed' ? 'bad' : job.status === 'Running' ? 'acc' : 'ok'} style={{ width: 56, height: 56, borderRadius: 6 }}>
            <Icon name="jobs" size={22} />
          </span>
        }
        badges={
          <>
            <Pill tone={statusTone(job.status)} dot>{job.status}</Pill>
            <Tag>{job.module}</Tag>
            {job.failed > 0 && <Pill tone="bad">{num(job.failed)} failed</Pill>}
          </>
        }
        meta={
          <>
            <Fact icon="bolt" label="Operation" value={job.operation} />
            <Fact icon="provision" label="Target" value={job.target} />
            <Fact icon="clock" label="Total time" value={hrMinSec(job.durationMs)} />
            <Fact icon="swap" label="Total count" value={num(job.total)} />
            <Fact icon="history" label="Created" value={`${job.started} UTC`} />
          </>
        }
        actions={
          <>
            <Button icon="download" onClick={onDownload}>Download Report</Button>
            <Button icon="ban" disabled={job.status !== 'Running'} onClick={onCancel}>Close job</Button>
            <Button variant="danger" icon="trash" disabled={job.status === 'Running'} onClick={onRemove}>Remove</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'information', label: 'Information', icon: 'info' },
              { id: 'details', label: 'Job Details', icon: 'menu', count: records.length },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'information' && (
          <div className="detail-cols">
            <div className="stack">
              <Card>
                <h2 className="job-block-k"><Icon name="info" size={12} />Information</h2>
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Job ID', v: job.jobId, icon: 'jobs' },
                    { k: 'Module', v: job.module, icon: 'layers' },
                    { k: 'Operation', v: job.operation, icon: 'bolt' },
                    { k: 'Target', v: job.target, icon: 'provision' },
                    { k: 'Request created day', v: `${job.started} UTC`, icon: 'calendar' },
                    { k: 'Triggered by', v: job.triggeredBy, icon: job.triggeredBy === 'Scheduler' ? 'clock' : 'user' },
                    { k: 'Mode', v: op.method === 'GET' ? 'Read-only' : 'Write', icon: 'edit' },
                  ]}
                />
              </Card>

              <Card>
                <h2 className="job-block-k"><Icon name="activity" size={12} />Job summary</h2>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="t-xs t-mut">{job.status === 'Running' ? 'Execution progress' : 'Records applied'}</span>
                  <span className="t-sm num" style={{ fontWeight: 600 }}>
                    {job.status === 'Running' ? `${job.progress}%` : `${num(job.succeeded)} / ${num(job.total)}`}
                  </span>
                </div>
                <Meter value={appliedPct(job)} tone={meterTone(job.status)} height={7} />
                <div style={{ marginTop: 14 }}>
                  <KeyValue
                    cols={1}
                    rows={[
                      { k: 'Total count', v: num(job.total), icon: 'swap' },
                      { k: 'Success', v: num(job.succeeded), icon: 'checkC' },
                      { k: 'Failed', v: num(job.failed), icon: 'warn' },
                      { k: 'Progress', v: `${appliedPct(job)}%`, icon: 'activity' },
                      { k: 'Status', node: <Pill tone={statusTone(job.status)} dot>{job.status}</Pill>, icon: 'power' },
                      { k: 'Total time', v: hrMinSec(job.durationMs), icon: 'clock' },
                      { k: 'Completed at', v: done ? `${done} UTC` : 'Still running', icon: 'history' },
                    ]}
                  />
                </div>
              </Card>
            </div>

            <div className="stack">
              <Card title="Outcome" sub="The run at a glance">
                <div className="stat-strip">
                  <div className="stat-cell">
                    <span className="stat-k"><Icon name="checkC" size={12} />Succeeded</span>
                    <span className="stat-v">{num(job.succeeded)}</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-k"><Icon name="warn" size={12} />Failed</span>
                    <span className="stat-v">{num(job.failed)}</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-k"><Icon name="activity" size={12} />Throughput</span>
                    <span className="stat-v">{num(throughput)}/s</span>
                  </div>
                </div>

                <div className="t-xs t-mut" style={{ marginTop: 10 }}>
                  {job.status === 'Running'
                    ? `${num(job.succeeded)} of ${num(job.total)} records dispatched to ${job.target}.`
                    : job.failed > 0
                      ? `${num(job.failed)} records were rejected by the target and require replay.`
                      : 'Every record in the batch was accepted by the target.'}
                </div>

                <div style={{ marginTop: 12 }}>
                  <Button
                    icon="swap"
                    onClick={() => openExchange(
                      'Details',
                      `The worker exchange for ${job.jobId} against ${job.target}.`,
                      exchange.request,
                      exchange.response,
                    )}
                  >
                    View job payload and response
                  </Button>
                </div>
              </Card>

              {exchange.response.body.errors.length > 0 && (
                <Card title="Reported errors" sub="Distinct failure reasons returned by the target">
                  {exchange.response.body.errors.map((e) => (
                    <div className="job-reason" key={e.code} style={{ marginBottom: 8 }}>
                      <Icon name="warn" size={13} />
                      <span><b className="mono">{e.code}</b> — {e.reason}</span>
                    </div>
                  ))}
                </Card>
              )}

              <Card title="Records touched" sub="Jump to the per-record outcomes">
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Pill tone="ok" dot>{records.length - counts.failed - counts.pending} succeeded</Pill>
                  {counts.failed > 0 && <Pill tone="bad" dot>{counts.failed} failed</Pill>}
                  {counts.pending > 0 && <Pill tone="warn" dot>{counts.pending} pending</Pill>}
                </div>
                <Button iconRight="chevR" onClick={() => setTab('details')}>Open Job Details</Button>
              </Card>
            </div>
          </div>
        )}

        {tab === 'details' && (
          <DataWorkbench
            id={`job-details-${job.jobId}`}
            rows={records}
            columns={detailColumns}
            pageSize={10}
            searchPlaceholder="Search by username, entity, operation, message or error…"
            onRowClick={openRecord}
rowActions={(r) => [
              { id: 'view', label: 'View Details', icon: 'eye', onSelect: () => openRecord(r) },
              { divider: true },
              { id: 'identity', label: 'Open identity', icon: 'external', onSelect: () => navigate('/iam/users') },
            ]}
            emptyTitle="No records match"
            emptyBody="Adjust the search to find the record you are looking for."
            emptyIcon="users"
            footNote={`Showing ${records.length} of ${num(job.total)} records — download the report for the complete set`}
          />
        )}
      </div>
    </>
  )
}
