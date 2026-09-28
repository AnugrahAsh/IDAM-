import './RequestsPage.css'
import '../approvals/ApprovalWorkflow.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Menu from '../../components/primitives/Menu'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { ME } from '../../data/seed'
import { useApprovalRows, writeApprovalRows } from '../approvals/approvalStore'
import {
  APPROVERS_L1, OPEN, TODAY, TYPE_ORDER, TYPE_SPECS, levelColumnDefs, nextRequestId, statusTone,
} from './data'
import { useApprovalLevels } from '../settings/settingsStore'
import { auditCell } from './RequestRail'
import RequestForm from './RequestForm'
import RequestTracking from './RequestTracking'
import StatCards from '../../components/workbench/StatCards'
import RecordCard, { CardIcon } from '../../components/workbench/RecordCard'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import { Skeleton, SkeletonPageBar, SkeletonStats } from '../../components/primitives/Skeleton'
import { useLocalState } from '../../lib/useLocalState'
import { useLoading } from '../../lib/useLoading'

// A requester tracks their own asks: what is still moving, what cleared, and
// what came back refused.
const FACETS = {
  all: () => true,
  open: (r) => OPEN.has(r.status),
  escalated: (r) => r.status === 'Escalated',
  approved: (r) => r.status === 'Approved',
  rejected: (r) => r.status === 'Rejected',
}

function RequesterList({ rows, stats, onCancel, onDuplicate, onExport }) {
  const levels = useApprovalLevels()
  const { navigate, toast } = useApp()
  const [menu, setMenu] = useState(null)
  const [facet, setFacet] = useState('all')
  // One flag for the page: the masthead, the tiles and the register are the
  // same requests counted three ways and settle as one thing.
  const loading = useLoading()

  const visible = useMemo(() => rows.filter(FACETS[facet] || FACETS.all), [rows, facet])

  const cards = [
    { id: 'all', icon: 'request', label: 'My requests', value: rows.length, chip: `${stats.open} open`, sub: 'raised from this account', hint: 'Every request you have raised' },
    { id: 'open', icon: 'clock', label: 'In flight', value: stats.open, chip: 'awaiting a decision', sub: 'with an approver', hint: 'Requests still moving through approval' },
    { id: 'escalated', icon: 'trendUp', label: 'Escalated', value: stats.escalated, chip: stats.escalated ? 'needs a nudge' : 'none', chipTone: stats.escalated ? 'warn' : undefined, sub: 'raised a level', hint: 'Requests escalated to a higher approver' },
    { id: 'approved', icon: 'checkC', label: 'Approved', value: stats.approved, chip: 'granted', chipTone: 'ok', sub: 'entitlement provisioned', hint: 'Requests that were granted' },
    { id: 'rejected', icon: 'ban', label: 'Rejected', value: stats.rejected, chip: stats.rejected ? 'refused' : 'none', chipTone: stats.rejected ? 'bad' : undefined, sub: 'with a stated reason', hint: 'Requests that were refused' },
  ]

  const groupSummary = (section) => `${section.filter((r) => OPEN.has(r.status)).length} open · ${section.filter((r) => r.status === 'Approved').length} approved`

  const renderCard = (r, ctx) => (
    <RecordCard
      ctx={ctx}
      label={r.id}
      media={<CardIcon name="request" tone={r.status === 'Rejected' ? 'bad' : r.status === 'Approved' ? 'ok' : 'acc'} />}
      title={r.id}
      sub={r.type}
      tags={(
        <>
          <Pill tone={statusTone(r.status)} dot>{r.status}</Pill>
          <Tag>{`Level ${r.level} of ${r.levels}`}</Tag>
          <span className="spacer" />
          <SeverityBadge level={r.risk} />
        </>
      )}
      line={<span className="trunc">{r.justification}</span>}
      meta={[
        { k: 'Identity', v: r.username },
        { k: 'Entitlement', v: r.target },
        { k: 'Approver', v: r.approvedBy || r.approvedByL1 },
        { k: 'Raised', v: r.raised },
      ]}
      footR={r.approvedOn ? `Decided ${r.approvedOn}` : 'Awaiting decision'}
    />
  )

  const columns = [
    serialColumn('S.No'),
    { key: 'id', label: 'Request Id.', locked: true, cls: 'td-main td-mono' },
    { key: 'username', label: 'Username' },
    { key: 'type', label: 'Request type', render: (r) => <span className="tag">{r.type}</span> },
    { key: 'status', label: 'Approval Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    { key: 'raised', label: 'Created on', cls: 'td-mono' },
    { key: 'requester', label: 'Created by' },
    ...levelColumnDefs(levels).map((c, i) => ({
      key: c.key,
      label: c.label,
      // Three levels is six audit columns, more than the register can hold at a
      // desktop width. The first level opens with it; the rest are a tick away
      // in the column control.
      optional: i >= 2,
      render: c.kind === 'date'
        ? (r) => auditCell(r[c.key])
        : (r) => (r[c.key] || <span className="t-faint">—</span>),
    })),
  ]

  const rowActions = (r) => [
    { id: 'view', label: 'Open request', icon: 'eye', onSelect: () => navigate(`/iam/requests/${r.id}`) },
    { id: 'approvals', label: 'Open in the approval queue', icon: 'approve', onSelect: () => navigate(`/iam/approvals/${r.id}`) },
    { id: 'dup', label: 'Duplicate', icon: 'copy', onSelect: () => onDuplicate(r) },
    { id: 'evidence', label: 'Export approval evidence', icon: 'download', onSelect: () => onExport(1, r.id) },
    { divider: true },
    { id: 'cancel', label: 'Cancel request', icon: 'ban', danger: true, disabled: !OPEN.has(r.status), onSelect: () => onCancel([r.id]) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="download" onClick={() => { onExport(ids.length); clear() }}>Export</Button>
      <Button size="sm" variant="danger" icon="ban" onClick={() => onCancel(ids, clear)}>Cancel selected</Button>
    </>
  )

  const typeMenu = (e) => setMenu({
    anchor: e.currentTarget,
    items: [
      { label: 'Request type', header: true },
      ...TYPE_ORDER.map((k) => ({
        id: k,
        label: TYPE_SPECS[k].label,
        icon: TYPE_SPECS[k].icon,
        onSelect: () => navigate(`/iam/requests/new/${k}`),
      })),
    ],
  })

  return (
    <>
      {/* One announcing region for the screen. The register below draws its own
          body skeleton from the `loading` prop and stays silent. */}
      {loading ? (
        <Skeleton label="Loading your access requests">
          <SkeletonPageBar actions={2} crumbs={2} />
        </Skeleton>
      ) : (
        <PageBar
          title="Access Requests"
          crumbs={[{ label: 'Access governance' }, { label: 'Access Requests' }]}
          sub="Everything raised against the directory, from a single group membership to emergency privileged access, with the approval chain each request must clear."
          actions={
            <>
              <Button icon="download" onClick={() => onExport(rows.length)}>Export</Button>
              <Button variant="pri" icon="plus" iconRight="chevD" onClick={typeMenu}>Add request</Button>
            </>
          }
        />
      )}

      {/* The four request-type tiles duplicated the "Add request" menu in the
          page bar, which already lists every type — including the ones the row
          of four could not fit. A whole band of the page repeating a control
          beside it earned its place from neither. */}
      <div className="stack">
        {loading ? (
          <SkeletonStats count={cards.length} />
        ) : (
          <StatCards
            items={cards}
            value={facet}
            onChange={(id) => setFacet(id === facet && id !== 'all' ? 'all' : id)}
            label="Filter my requests"
          />
        )}

        <DataWorkbench
          id="requests"
          rows={visible}
          loading={loading}
          columns={columns}
          selectable
          searchPlaceholder="Search by request id, identity, entitlement or approver…"
          bulkActions={bulkActions}
          rowActions={rowActions}
          onRowClick={(r) => navigate(`/iam/requests/${r.id}`)}
          toolbar={(
            <>
              <Button
                size="sm"
                icon="approve"
                onClick={() => { toast('info', 'Approval queue', 'Switching to the decision queue.'); navigate('/iam/approvals') }}
              >
                Approval queue
              </Button>
            </>
          )}
          emptyTitle="No requests match"
          emptyBody="Adjust the view, clear the filters or raise a new request for an identity in the directory."
          emptyIcon="request"
          footNote="Requests are evaluated against policy every 15 minutes"
          pageSize={25}
        />
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}

export default function RequestsPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  /* The same rows the approval queue reads. They used to be this page's own
     state, seeded from the demo data: a request raised here never reached the
     approver it named, and an approver's edits never came back to the person
     who raised it. */
  const rows = useApprovalRows()
  const setRows = writeApprovalRows

  const stats = useMemo(() => {
    const open = rows.filter((r) => OPEN.has(r.status))
    const approved = rows.filter((r) => r.status === 'Approved')
    const rejected = rows.filter((r) => r.status === 'Rejected')
    return {
      open: open.length,
      approved: approved.length,
      rejected: rejected.length,
      escalated: rows.filter((r) => r.status === 'Escalated').length,
    }
  }, [rows])

  const exportRows = (count, label) => toast(
    'ok',
    'Export queued',
    label
      ? `${label} approval trail written to the audit export.`
      : `${num(count)} ${count === 1 ? 'request' : 'requests'} queued for CSV export.`,
  )

  const cancel = (ids, done) => confirm({
    title: ids.length === 1 ? 'Cancel this request?' : `Cancel ${ids.length} requests?`,
    body: 'Approvers are notified that the request was withdrawn. Canceled requests cannot be reopened; a new one must be raised.',
    confirmLabel: `Cancel ${ids.length}`,
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
      if (done) done()
      toast('ok', 'Request withdrawn', `${ids.length} ${ids.length === 1 ? 'request' : 'requests'} removed from the approval queue.`)
      if (segments[0] && ids.map(String).includes(String(segments[0]))) navigate('/iam/requests')
    },
  })

  const duplicate = (r) => {
    const id = nextRequestId(rows)
    setRows((rs) => [{
      ...r,
      id,
      status: 'Pending',
      level: 1,
      sla: 'ok',
      raised: TODAY,
      pendingWith: APPROVERS_L1[0],
      approvedOn: '',
      approvedBy: '',
      approvedOnL1: '',
      approvedByL1: '',
      commentL1: '',
      approvedOnL2: '',
      approvedByL2: '',
      commentL2: '',
    }, ...rs])
    toast('ok', 'Request duplicated', `${id} raised for ${r.username} · ${r.target}.`)
    navigate(`/iam/requests/${id}`)
  }

  const submit = (spec, v, built, levels) => {
    const id = nextRequestId(rows)
    setRows((rs) => [{
      id,
      type: spec.label,
      userId: built.userId,
      username: built.username,
      requester: `${ME.firstName} ${ME.lastName}`,
      target: built.target,
      status: 'Pending',
      risk: built.risk,
      level: 1,
      levels,
      sla: 'ok',
      raised: TODAY,
      justification: String(v.justification || '').trim() || 'No justification supplied.',
      duration: v.duration || '',
      detail: built.detail,
      changes: built.changes || null,
      profile: built.profile || null,
      entitlements: built.entitlements || null,
      addGroups: built.addGroups || null,
      removeGroups: built.removeGroups || null,
      pendingWith: APPROVERS_L1[0],
      approvedOn: '',
      approvedBy: '',
      approvedOnL1: '',
      approvedByL1: '',
      commentL1: '',
      approvedOnL2: '',
      approvedByL2: '',
      commentL2: '',
    }, ...rs])
    toast('ok', 'Request raised', `${id} · ${spec.label} for ${built.username} sent to level 1 approval.`)
    navigate(`/iam/requests/${id}`)
  }

  if (segments[0] === 'new') {
    return <RequestForm key={segments[1] || 'none'} type={segments[1]} onSubmit={submit} />
  }

  if (segments[0]) {
    return (
      <RequestTracking
        key={segments[0]}
        id={segments[0]}
        rows={rows}
        onCancel={cancel}
        onDuplicate={duplicate}
      />
    )
  }

  return (
    <RequesterList
      rows={rows}
      stats={stats}
      onCancel={cancel}
      onDuplicate={duplicate}
      onExport={exportRows}
    />
  )
}
