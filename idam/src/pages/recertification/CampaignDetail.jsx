import { useMemo } from 'react'
import PageBar from '../../components/shell/PageBar'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { num } from '../../lib/format'
import { REVIEWER_POOL, levelNames } from './data'
import { OverviewTab } from './CampaignInsights'
import { ReviewersTab } from './CampaignWork'
import { ItemsTab } from './CampaignItems'
import CampaignUserReview from './CampaignUserReview'

export default function CampaignDetail({
  id, segments = [], campaigns, items, users, decider, onSubmitLevel, onResend, onClose, onDelete,
}) {
  const { toast, navigate } = useApp()
  const tab = ['items', 'reviewers'].includes(segments[0]) ? segments[0] : 'overview'
  const setTab = (t) => navigate(t === 'overview' ? `/iam/recertification/${id}` : `/iam/recertification/${id}/${t}`, { replace: true })
  const c = campaigns.find((x) => String(x.id) === String(id))
  const scoped = useMemo(() => items.filter((r) => String(r.campaignId) === String(id)), [items, id])
  /* One flag for the record, keyed on the campaign and the tab it is read
     through. The masthead carries the tab strip, so it is chrome that stays
     put; what settles is the panel under it. A user opened from Items is a
     screen of its own and keeps its own flag. */
  const loading = useLoading(`${id}:${tab}`)

  if (!c) {
    return (
      <>
        <PageBar
          title="Campaign not found"
          crumbs={[{ label: 'Recertification', to: '/iam/recertification' }, { label: String(id) }]}
        />
        <EmptyState
          icon="certify"
          title={`No campaign with id ${id}`}
          body="The campaign may have been deleted, or the link is stale. Open the campaign list to find the current record."
          actions={<Button variant="pri" icon="chevL" onClick={() => navigate('/iam/recertification')}>Back to campaigns</Button>}
        />
      </>
    )
  }

  if (tab === 'items' && segments[1]) {
    return (
      <CampaignUserReview
        key={segments[1]}
        c={c}
        users={users}
        userId={segments[1]}
        levelParam={segments[2]}
        decider={decider}
        onSubmit={onSubmitLevel}
      />
    )
  }

  const closed = c.status !== 'Active'
  const chain = levelNames(c.levels)
  const pending = scoped.filter((r) => r.decision === 'Pending').length

  return (
    <>
      <DetailHeader
        backTo="/iam/recertification"
        backLabel="Recertification"
        eyebrow="Attestation campaign"
        title={c.name}
        sub={c.description}
        badges={(
          <>
            <Pill tone={closed ? 'mut' : c.dueIn <= 3 ? 'bad' : 'ok'} dot>{c.status}</Pill>
            <Tag>{chain.length} levels</Tag>
            {!closed && c.dueIn <= 3 && <Pill tone="bad" icon="clock">Closes in {c.dueIn}d</Pill>}
            {pending > 0 && <Pill tone="warn">{num(pending)} undecided here</Pill>}
          </>
        )}
        meta={(
          <>
            <Fact icon="user" label="Auditor" value={c.auditor} />
            <Fact icon="building" label="Scope" value={c.scope} />
            <Fact icon="hierarchy" label="Levels" value={c.levels} />
            <Fact icon="clock" label="Due in" value={closed ? 'Closed' : `${c.dueIn} ${c.dueIn === 1 ? 'day' : 'days'}`} />
            <Fact icon="inbox" label="Items" value={`${num(c.decided)} / ${num(c.items)} decided`} />
            <Fact icon="calendar" label="Started" value={c.started.slice(0, 10)} />
          </>
        )}
        actions={(
          <>
            <Button icon="mail" disabled={closed} onClick={() => onResend([c])}>Resend Mail</Button>
            <Button variant="danger" icon="lock" disabled={closed} onClick={() => onClose([c])}>Close campaign</Button>
          </>
        )}
        tabs={(
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'overview', label: 'Overview', icon: 'dashboard' },
              { id: 'items', label: 'Items', icon: 'inbox', count: users.length },
              { id: 'reviewers', label: 'Reviewers', icon: 'users', count: REVIEWER_POOL.length },
            ]}
          />
        )}
      />

      <div className="detail-body">
        {tab === 'overview' && <OverviewTab c={c} scoped={scoped} loading={loading} />}
        {tab === 'items' && <ItemsTab c={c} users={users} loading={loading} />}
        {tab === 'reviewers' && (
          <ReviewersTab
            c={c}
            loading={loading}
            onResendReviewer={(r) => toast('ok', 'Reminder sent', `${r.name} · ${num(r.remaining)} outstanding items, mail delivered to their review queue.`)}
            onEscalate={(r, kind) => (kind === 'reassign'
              ? toast('info', 'Queue reassigned', `${r.name}'s ${num(r.remaining)} outstanding items moved to the delegated reviewer queue.`)
              : toast('info', 'Escalated', `${r.name}'s queue was escalated to their line manager and copied to ${c.auditor}.`))}
          />
        )}
      </div>
    </>
  )
}
