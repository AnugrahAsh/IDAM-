import PageBar from '../../components/shell/PageBar'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { OPEN, nameOf, statusTone } from '../accessRequests/data'
import ApprovalWorkflow, { useWorkflow } from './ApprovalWorkflow'
import { durationText } from './workflow'

/**
 * The approval workflow as a page of its own.
 *
 * The rail expansion is enough to answer a question about one level while
 * deciding. This is for the readings that are about the chain rather than the
 * decision — an escalation asking where the days went, an auditor sampling the
 * request, a requester asking why what arrives is not what they asked for. It
 * is deep-linkable, so any of those can be sent the workflow rather than the
 * record with instructions to expand the third level.
 */
export default function WorkflowRecord({ id, rows }) {
  const { navigate, toast } = useApp()
  const row = rows.find((r) => String(r.id) === String(id))
  // Hooks run before the early return, so the model is derived against a
  // placeholder when the id is stale rather than conditionally.
  const view = useWorkflow(row || { id, level: 1, levels: 1, status: 'Pending', raised: '', target: '', type: '' })

  if (!row) {
    return (
      <>
        <PageBar
          title="Workflow not found"
          crumbs={[{ label: 'Approvals', to: '/iam/approvals' }, { label: String(id) }, { label: 'Workflow' }]}
        />
        <EmptyState
          icon="approve"
          title={`No approval record for ${id}`}
          body="The request may already be decided and archived, or the link is stale. Open the approval queue to find the current record."
          actions={<Button variant="pri" icon="chevL" onClick={() => navigate('/iam/approvals')}>Back to approvals</Button>}
        />
      </>
    )
  }

  const n = nameOf(row.username)
  const open = OPEN.has(row.status)

  return (
    <>
      <DetailHeader
        backTo="/iam/approvals"
        backLabel="Approvals"
        eyebrow="Approval workflow"
        title={row.id}
        sub={`Every level this request has passed through, how long each one held it, and what each one changed before handing it on. ${row.type} raised by ${row.requester} for ${row.username}.`}
        media={<Avatar first={n.first} last={n.last} size="xl" />}
        badges={(
          <>
            <Pill tone={statusTone(row.status)} dot>{row.status}</Pill>
            <SeverityBadge level={row.risk}>{row.risk}</SeverityBadge>
            <Tag>Level {row.level} of {row.levels}</Tag>
          </>
        )}
        meta={(
          <>
            <Fact icon="user" label="Raised by" value={row.requester} />
            <Fact icon="users" label="Identity" value={row.username} />
            <Fact icon="group" label="Entitlement" value={row.target} />
            <Fact icon="approve" label="Currently with" value={row.pendingWith || 'Decided'} />
            <Fact icon="clock" label="Time on request" value={durationText(view.elapsedH)} />
            <Fact icon="history" label="Raised" value={row.raised} />
          </>
        )}
        actions={(
          <>
            <Button
              icon="download"
              onClick={() => toast('ok', 'Evidence queued', `${row.id} approval trail written to the audit export.`)}
            >
              Export evidence
            </Button>
            <Button
              variant="pri"
              icon="request"
              onClick={() => navigate(`/iam/approvals/${row.id}`)}
            >
              {open ? 'Open the request to decide' : 'Open the request record'}
            </Button>
          </>
        )}
      />

      <div className="detail-body">
        <ApprovalWorkflow row={row} />
      </div>
    </>
  )
}
