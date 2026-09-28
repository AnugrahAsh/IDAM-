import './ApprovalsPage.css'
import './ApprovalWorkflow.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Avatar from '../../components/primitives/Avatar'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { ME } from '../../data/seed'
import { OPEN, TODAY_DATE, levelColumnDefs, levelFields, nameOf, statusTone } from '../accessRequests/data'
import { useApprovalLevels } from '../settings/settingsStore'
import { auditCell } from '../accessRequests/RequestRail'
import RequestRecord from './RequestRecord'
import WorkflowRecord from './WorkflowRecord'
import { draftCounts, revisionsOf } from './data'
import { useApprovalRows, writeApprovalRows } from './approvalStore'
import StatCards from '../../components/workbench/StatCards'
import RecordCard, { CardIcon } from '../../components/workbench/RecordCard'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import { Skeleton, SkeletonPageBar, SkeletonStats } from '../../components/primitives/Skeleton'
import { useLocalState } from '../../lib/useLocalState'
import { useLoading } from '../../lib/useLoading'

// What an approver needs to separate: what is waiting, what is late, and what
// carries enough risk to read carefully before deciding.
const FACETS = {
  all: () => true,
  awaiting: (r) => OPEN.has(r.status),
  breached: (r) => r.sla === 'breached' && OPEN.has(r.status),
  risky: (r) => ['critical', 'high'].includes(r.risk) && OPEN.has(r.status),
  decided: (r) => !OPEN.has(r.status),
}

const SLA_LABEL = { breached: 'SLA breached', 'at-risk': 'SLA at risk', ok: 'Within SLA' }

function ApprovalQueue({ rows, stats, onApprove, onReject, onReassign, onExport }) {
  const { navigate, toast } = useApp()
  const levels = useApprovalLevels()
  const [facet, setFacet] = useState('all')
  // One flag for the whole queue. The masthead, the tiles and the register are
  // three readings of the same set of requests, so they settle together rather
  // than each arriving on its own timer.
  const loading = useLoading()

  const visible = useMemo(() => rows.filter(FACETS[facet] || FACETS.all), [rows, facet])

  const cards = [
    {
      id: 'all', icon: 'approve', label: 'All requests', value: rows.length,
      chip: `${num(stats.decided)} decided`, sub: 'in this queue',
      hint: 'Every request routed to this queue',
    },
    {
      id: 'awaiting', icon: 'inbox', label: 'Awaiting decision', value: stats.awaiting,
      chip: `${stats.twoLevel} two-level`, sub: 'waiting on a human',
      hint: 'Requests still open for a decision',
    },
    {
      id: 'breached', icon: 'clock', label: 'SLA breached', value: stats.breached,
      chip: stats.atRisk ? `${stats.atRisk} at risk` : 'none at risk',
      chipTone: stats.breached ? 'bad' : undefined, sub: 'past the decision window',
      hint: 'Open requests that have missed their decision window',
    },
    {
      id: 'risky', icon: 'warn', label: 'High risk open', value: stats.risky,
      chip: 'read before deciding', chipTone: stats.risky ? 'warn' : undefined,
      sub: 'critical or high',
      hint: 'Open requests carrying critical or high risk',
    },
    {
      id: 'decided', icon: 'checkC', label: 'Approved today', value: stats.approvedToday,
      chip: `${num(stats.decided)} total decided`, sub: 'cleared today',
      hint: 'Requests already decided',
    },
  ]

  const groupSummary = (section) => {
    const open = section.filter((r) => OPEN.has(r.status)).length
    const late = section.filter((r) => r.sla === 'breached').length
    return `${num(open)} open · ${late} breached`
  }

  const renderCard = (r, ctx) => (
    <RecordCard
      ctx={ctx}
      label={r.id}
      media={<CardIcon name="approve" tone={r.sla === 'breached' ? 'bad' : OPEN.has(r.status) ? 'acc' : 'ok'} />}
      title={r.id}
      sub={r.type}
      tags={(
        <>
          <Pill tone={statusTone(r.status)} dot>{r.status}</Pill>
          {r.sla !== 'ok' && <Tag>{SLA_LABEL[r.sla]}</Tag>}
          <span className="spacer" />
          <SeverityBadge level={r.risk} />
        </>
      )}
      line={<span className="trunc">{r.justification}</span>}
      meta={[
        { k: 'Identity', v: r.username },
        { k: 'Entitlement', v: r.target },
        { k: 'Raised by', v: r.requester },
        { k: 'Level', v: `${r.level} of ${r.levels}` },
      ]}
      footL={`Raised ${r.raised}`}
      footR={SLA_LABEL[r.sla]}
    />
  )

  const columns = [
    serialColumn('S.No'),
    { key: 'id', label: 'Request Id.', locked: true, cls: 'td-main td-mono' },
    { key: 'type', label: 'Type' },
    {
      key: 'username', label: 'Username',
      render: (r) => {
        const n = nameOf(r.username)
        return (
          <span className="cell-id">
            <Avatar first={n.first} last={n.last} size="sm" />
            <span className="trunc">{r.username}</span>
          </span>
        )
      },
    },
    { key: 'firstName', label: 'First name', optional: true, render: (r) => nameOf(r.username).first },
    { key: 'lastName', label: 'Last name', optional: true, render: (r) => nameOf(r.username).last },
    { key: 'status', label: 'Approval Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    { key: 'raised', label: 'Created on', cls: 'td-mono' },
    { key: 'requester', label: 'Created by' },
    // Generated from Settings → Approval levels, so renaming a level renames
    // the column pair rather than leaving the table quoting a stale level name.
    ...levelColumnDefs(levels).map((c, i) => ({
      key: c.key,
      label: c.label,
      // Two columns per level is more audit trail than the queue can hold at a
      // desktop width. The first level opens with the register; the rest are a
      // tick away in the column control.
      optional: i >= 2,
      render: c.kind === 'date'
        ? (r) => auditCell(r[c.key])
        : (r) => (r[c.key] || <span className="t-faint">—</span>),
    })),
  ]

  const rowActions = (r) => [
    { id: 'open', label: 'Open request', icon: 'eye', onSelect: () => navigate(`/iam/approvals/${r.id}`) },
    { divider: true },
    { id: 'approve', label: 'Approve', icon: 'checkC', disabled: !OPEN.has(r.status), onSelect: () => onApprove([r.id]) },
    { id: 'reject', label: 'Reject', icon: 'ban', danger: true, disabled: !OPEN.has(r.status), onSelect: () => onReject([r.id]) },
    { id: 'reassign', label: 'Reassign approver', icon: 'swap', disabled: !OPEN.has(r.status), onSelect: () => onReassign([r.id]) },
    { divider: true },
    { id: 'evidence', label: 'Export approval evidence', icon: 'download', onSelect: () => onExport(1, r.id) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="checkC" onClick={() => { onApprove(ids); clear() }}>Approve</Button>
      <Button size="sm" variant="danger" icon="ban" onClick={() => onReject(ids, clear)}>Reject</Button>
      <Button size="sm" icon="swap" onClick={() => onReassign(ids, clear)}>Reassign</Button>
      <Button size="sm" icon="download" onClick={() => { onExport(ids.length); clear() }}>Export evidence</Button>
    </>
  )

  return (
    <>
      {/* The register draws its own body skeleton from the `loading` prop, and
          that skeleton is decoration — so the one announcing region here covers
          the whole wait rather than one shape announcing per band. */}
      {loading ? (
        <Skeleton label="Loading the approval queue">
          <SkeletonPageBar actions={1} crumbs={2} />
          <SkeletonStats count={cards.length} />
        </Skeleton>
      ) : (
        <>
          <PageBar
            title="Approvals"
            crumbs={[{ label: 'Access governance' }, { label: 'Approvals' }]}
            sub="Every access decision waiting on a human. Open a request to read what it grants before deciding."
            actions={
              <>
                <Button icon="download" onClick={() => onExport(rows.length)}>Export</Button>
              </>
            }
          />

          <StatCards
            items={cards}
            value={facet}
            onChange={(id) => setFacet(id === facet && id !== 'all' ? 'all' : id)}
            label="Filter the approval queue"
          />
        </>
      )}

      <DataWorkbench
        id="approvals"
        rows={visible}
        loading={loading}
        columns={columns}
        selectable
        searchPlaceholder="Search by request id, requester, identity, entitlement or approver…"
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(r) => navigate(`/iam/approvals/${r.id}`)}
        emptyTitle="Nothing waiting on you"
        emptyBody="No request matches the current search."
        emptyIcon="approve"
        pageSize={25}
      />
    </>
  )
}

export default function ApprovalsPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  const levels = useApprovalLevels()
  // Session state, not page state: see approvalStore.js for why.
  const rows = useApprovalRows()
  const setRows = writeApprovalRows

  const stats = useMemo(() => {
    const awaiting = rows.filter((r) => OPEN.has(r.status))
    const decided = rows.filter((r) => !OPEN.has(r.status))
    return {
      awaiting: awaiting.length,
      decided: decided.length,
      approvedToday: rows.filter((r) => r.status === 'Approved' && r.raised.slice(0, 10) === TODAY_DATE).length,
      twoLevel: rows.filter((r) => r.approvedByL2).length,
      breached: awaiting.filter((r) => r.sla === 'breached').length,
      atRisk: awaiting.filter((r) => r.sla === 'at-risk').length,
      risky: awaiting.filter((r) => ['critical', 'high'].includes(r.risk)).length,
    }
  }, [rows])

  const exportEvidence = (count, label) => toast(
    'ok',
    'Evidence queued',
    label
      ? `${label} approval trail written to the audit export.`
      : `${num(count)} approval ${count === 1 ? 'record' : 'records'} queued for CSV export.`,
  )

  /**
   * A decision is recorded against the level that took it and then the request
   * moves: forward to the next reviewer, or to a final state when the last
   * level has signed. The row is not deleted — the queue has to be able to show
   * what was decided, and the audit columns have to have something to hold.
   */
  const decide = (ids, decision, note, remarks, draft) => {
    const set = new Set(ids.map(String))
    const stampNow = `${TODAY_DATE} ${new Date().toISOString().slice(11, 16)}`
    const me = ME.firstName ? `${ME.firstName} ${ME.lastName}` : ME.username
    let advanced = 0
    let completed = 0

    setRows((rs) => rs.map((r) => {
      if (!set.has(String(r.id)) || !OPEN.has(r.status)) return r
      const at = Math.max(0, (r.level || 1) - 1)
      const f = levelFields(at)
      /* The revision this level made is committed with the decision — and only
         with an approval. A rejected request carries no revision because
         nothing from it will ever be provisioned. The revisions already on the
         row are materialised here too, so a seeded history and a live one are
         the same data from this point on. */
      const committed = revisionsOf(r)
      const ops = decision === 'Approved' && draft ? draft.ops : []
      const revisions = ops.length
        ? [...committed, { level: r.level || 1, approver: me, role: (levels[at] || {}).name || '', when: stampNow, ops }]
        : committed
      const stamped = {
        ...r,
        [f.on]: stampNow,
        [f.by]: me,
        [f.comment]: (remarks || '').trim(),
        revisions,
      }
      if (decision === 'Rejected') return { ...stamped, status: 'Rejected', pendingWith: '' }
      const last = (r.level || 1) >= (r.levels || 1)
      if (last) { completed += 1; return { ...stamped, status: 'Approved', pendingWith: '' } }
      advanced += 1
      const nextLevel = (r.level || 1) + 1
      return {
        ...stamped,
        level: nextLevel,
        pendingWith: (levels[nextLevel - 1] || {}).role || r.pendingWith,
      }
    }))

    const shape = ids.length === 1 ? 'request' : 'requests'
    toast(
      decision === 'Approved' ? 'ok' : 'warn',
      decision === 'Approved' ? 'Request approved' : 'Request rejected',
      note || (decision === 'Rejected'
        ? `${ids.length} ${shape} rejected. The requester is notified with your comment.`
        : advanced && completed
          ? `${completed} ${completed === 1 ? 'request' : 'requests'} completed, ${advanced} advanced to the next level.`
          : advanced
            ? `${advanced} ${advanced === 1 ? 'request' : 'requests'} advanced to the next approval level.`
            : `${ids.length} ${shape} fully approved and queued for provisioning.`),
    )
  }

  const approve = (ids, note, remarks, draft) => {
    decide(ids, 'Approved', note, remarks, draft)
    if (segments[0]) navigate('/iam/approvals')
  }

  const reject = (ids, done, note, remarks) => confirm({
    title: ids.length === 1 ? 'Reject this request?' : `Reject ${ids.length} requests?`,
    body: 'The requester is notified with your decision and comment, and the entitlement is not provisioned. Rejections cannot be reopened; a new request must be raised.',
    confirmLabel: `Reject ${ids.length}`,
    onConfirm: () => {
      decide(ids, 'Rejected', note, remarks)
      if (done) done()
      if (segments[0]) navigate('/iam/approvals')
    },
  })

  const reassign = (ids, done, note) => {
    toast('info', 'Reassigned', note || `${ids.length} ${ids.length === 1 ? 'request' : 'requests'} moved to the delegated approver queue.`)
    if (done) done()
  }

  /* /iam/approvals/<id>/workflow — the chain in depth, on a page of its own so
     it can be linked to directly. Kept a segment under the record rather than a
     route of its own: it is a reading of one request, and an id that no longer
     resolves should land on the record's own "not found", not on a bare page. */
  if (segments[0] && segments[1] === 'workflow') {
    return <WorkflowRecord key={segments[0]} id={segments[0]} rows={rows} />
  }

  if (segments[0]) {
    return (
      <RequestRecord
        key={segments[0]}
        id={segments[0]}
        rows={rows}
        onApprove={(row, basis, comment, draft) => {
          const c = draftCounts(draft)
          const rev = c.total > 0
            ? ` · level ${row.level} revision committed (${c.added} added, ${c.removed} removed, ${c.changed} changed)`
            : ''
          approve(
            [row.id],
            `${row.id} approved · ${basis}${rev}${comment.trim() ? ` · "${comment.trim().slice(0, 90)}"` : ''}.`,
            comment,
            draft,
          )
        }}
        onReject={(row, basis, comment) => {
          if (!comment.trim()) {
            toast('warn', 'Comment required', 'A rejection must carry a comment. The requester sees it verbatim.')
            return
          }
          reject([row.id], undefined, `${row.id} rejected · ${basis} · "${comment.trim().slice(0, 90)}".`, comment)
        }}
        onReassign={(row, assignee, comment) => reassign(
          [row.id],
          undefined,
          `${row.id} reassigned to ${assignee}${comment.trim() ? ' with your note attached' : ''}.`,
        )}
      />
    )
  }

  return (
    <ApprovalQueue
      rows={rows}
      stats={stats}
      onApprove={(ids) => approve(ids)}
      onReject={(ids, clear) => reject(ids, clear)}
      onReassign={(ids, clear) => reassign(ids, clear)}
      onExport={exportEvidence}
    />
  )
}
