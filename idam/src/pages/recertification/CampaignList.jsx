import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import Meter from '../../components/primitives/Meter'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Avatar from '../../components/primitives/Avatar'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { daysIdle, levelCount, nameOf, projectionFor } from './data'
import StatCards from '../../components/workbench/StatCards'
import { Skeleton, SkeletonPageBar, SkeletonStats } from '../../components/primitives/Skeleton'
import { useLoading } from '../../lib/useLoading'
import { CampaignProgressSkeleton } from './RecertificationSkeleton'

export default function CampaignList({ campaigns, items, onResend, onClose, onDelete }) {
  const { toast, navigate } = useApp()
  const [tab, setTab] = useState('campaigns')
  /* One flag for the page. The masthead, the four tiles, the register and the
     progress cards are the same campaigns counted four ways, so they settle as
     one thing; the tab bar between them is chrome and stays put. */
  const loading = useLoading()

  const stats = useMemo(() => ({
    active: campaigns.filter((c) => c.status === 'Active').length,
    items: items.length,
    pending: items.filter((r) => r.decision === 'Pending').length,
    decided: items.filter((r) => r.decision !== 'Pending').length,
    flagged: items.filter((r) => r.recommendation === 'Revoke' && r.decision === 'Pending').length,
  }), [campaigns, items])

  const campaignColumns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Name', locked: true, cls: 'td-main',
      render: (c) => (
        <span className="cell-id">
          <Icon name="certify" size={14} style={{ color: 'var(--mut)' }} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{c.name}</span>
            <span className="cell-sub">{c.scope}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'description', label: 'Description', width: 300, optional: true,
      render: (c) => <span className="t-mut trunc" title={c.description}>{c.description}</span>,
    },
    {
      key: 'auditor', label: 'Auditor',
      render: (c) => (
        <span className="cell-id">
          <Avatar name={c.auditor} size="sm" />
          <span className="trunc">{c.auditor}</span>
        </span>
      ),
    },
    { key: 'levels', label: 'Chain', optional: true, render: (c) => <Tag>{levelCount(c.levels)} levels</Tag> },
    {
      key: 'status', label: 'Status',
      render: (c) => (
        <span className="row" style={{ gap: 6 }}>
          <Pill tone={c.status === 'Active' ? (c.dueIn <= 3 ? 'bad' : 'ok') : 'mut'} dot>{c.status}</Pill>
          {c.status === 'Active' && c.dueIn <= 3 && <span className="t-xs t-mut">{c.dueIn}d left</span>}
        </span>
      ),
    },
    { key: 'createdOn', label: 'Created on', cls: 'td-mono', optional: true },
    { key: 'items', label: 'Items', align: 'right', render: (c) => <span className="num">{num(c.items)}</span> },
    { key: 'revoked', label: 'Revoked', align: 'right', optional: true, render: (c) => <span className="num">{num(c.revoked)}</span> },
    {
      key: 'progress', label: 'Progress', width: 168, sortable: false,
      render: (c) => (
        <span className="cell-id" style={{ gap: 8 }}>
          <span style={{ flex: 1, minWidth: 64 }}>
            <Meter value={c.progress} tone={c.status !== 'Active' ? 'warn' : c.progress >= 80 ? 'ok' : undefined} />
          </span>
          <span className="t-xs t-mut num" style={{ flex: 'none' }}>{c.progress}%</span>
        </span>
      ),
    },
  ]

  const campaignActions = (c) => [
    { id: 'open', label: 'Open campaign', icon: 'eye', onSelect: () => navigate(`/iam/recertification/${c.id}`) },
    { id: 'mail', label: 'Resend Mail', icon: 'mail', disabled: c.status !== 'Active', onSelect: () => onResend([c]) },
    { id: 'close', label: 'Close', icon: 'lock', disabled: c.status !== 'Active', onSelect: () => onClose([c]) },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete([c]) },
  ]

  const campaignBulk = (ids, clear) => {
    const list = campaigns.filter((c) => ids.map(String).includes(String(c.id)))
    return (
      <>
        <Button size="sm" icon="mail" onClick={() => { onResend(list); clear() }}>Resend mail</Button>
        <Button size="sm" icon="lock" onClick={() => onClose(list, clear)}>Close</Button>
        <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(list, clear)}>Delete</Button>
      </>
    )
  }

  return (
    <>
      {/* One region for the page. The register below draws its own body
          skeleton from `loading` and stays silent, so the wait is described
          once rather than band by band. */}
      {loading ? (
        <Skeleton label="Loading the recertification campaigns">
          <SkeletonPageBar actions={1} crumbs={2} />
          <SkeletonStats count={4} />
        </Skeleton>
      ) : (
        <>
          <PageBar
            title="Recertification"
            crumbs={[{ label: 'Governance' }, { label: 'Recertification' }]}
            sub="Attestation campaigns and the entitlement decisions that close them. Every certify and revoke is written to the audit trail with the reviewer, the timestamp and the recommendation it overrode."
            actions={
              <>
                <Button variant="pri" icon="plus" onClick={() => navigate('/iam/recertification/add')}>Add Campaign</Button>
              </>
            }
          />

          <StatCards
            items={[
              { key: 'active', icon: 'certify', label: 'Active campaigns', value: stats.active, chip: `${num(stats.items)} items`, sub: 'attestation in flight' },
              { key: 'pending', icon: 'clock', label: 'Undecided', value: stats.pending, chip: stats.pending ? 'awaiting a reviewer' : 'all decided', chipTone: stats.pending ? 'warn' : 'ok', sub: 'items with no decision yet' },
              { key: 'flagged', icon: 'ban', label: 'Recommended revoke', value: stats.flagged, chip: stats.flagged ? 'unused access' : 'none', chipTone: stats.flagged ? 'bad' : undefined, sub: 'flagged by the platform' },
              { key: 'decided', icon: 'checkC', label: 'Decided', value: stats.decided, chip: 'evidence captured', chipTone: 'ok', sub: 'certified or revoked' },
            ]}
            label="Recertification summary"
          />
        </>
      )}

      <div className="stack">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'campaigns', label: 'Campaigns', icon: 'certify', count: campaigns.length },
            { id: 'progress', label: 'Campaign progress', icon: 'dashboard', count: campaigns.filter((c) => c.status === 'Active').length },
          ]}
        />

        {tab === 'campaigns' && (
          <DataWorkbench
            id="recert-campaigns"
            rows={campaigns}
            loading={loading}
            columns={campaignColumns}
            selectable
            searchPlaceholder="Search by campaign, description, auditor or scope…"
            bulkActions={campaignBulk}
            rowActions={campaignActions}
            onRowClick={(c) => navigate(`/iam/recertification/${c.id}`)}
            emptyTitle="No campaigns match"
            emptyBody="Adjust the view, filters or search, or launch a campaign to start collecting entitlements for review."
            emptyIcon="certify"
            footNote="Closed campaigns are retained for seven years"
            pageSize={25}
          />
        )}

        {tab === 'progress' && loading && <CampaignProgressSkeleton count={campaigns.length} />}

        {tab === 'progress' && !loading && (
          <div className="grid grid-3">
            {campaigns.map((c) => {
              const closed = c.status !== 'Active'
              const urgent = !closed && c.dueIn <= 3
              const proj = projectionFor(c)
              return (
                <Card
                  key={c.id}
                  title={c.name}
                  sub={c.scope}
                  style={closed ? { opacity: 0.66 } : undefined}
                  actions={<Pill tone={closed ? 'mut' : urgent ? 'bad' : 'ok'} dot>{c.status}</Pill>}
                  footer={
                    <>
                      <Button size="sm" icon="eye" onClick={() => navigate(`/iam/recertification/${c.id}`)}>Open</Button>
                      <Button size="sm" icon="mail" disabled={closed} onClick={() => onResend([c])}>Resend mail</Button>
                      <span className="spacer" />
                      <span className="t-xs t-faint">{c.levels}</span>
                    </>
                  }
                >
                  <div className="row" style={{ gap: 16, alignItems: 'center' }}>
                    <div className="stack" style={{ gap: 7, flex: 1, minWidth: 0 }}>
                      <div className="row-between">
                        <span className="t-xs t-mut">Decided</span>
                        <span className="t-sm num" style={{ fontWeight: 600 }}>{num(c.decided)} / {num(c.items)}</span>
                      </div>
                      <div className="row-between">
                        <span className="t-xs t-mut">Revoked</span>
                        <span className="t-sm num" style={{ fontWeight: 600 }}>{num(c.revoked)}</span>
                      </div>
                      <div className="row-between">
                        <span className="t-xs t-mut">Auditor</span>
                        <span className="t-sm trunc">{c.auditor}</span>
                      </div>
                      <div className="row-between">
                        <span className="t-xs t-mut">Remaining</span>
                        {closed
                          ? <Pill tone="mut">Closed</Pill>
                          : <Pill tone={urgent ? 'bad' : 'mut'} dot={urgent}>{c.dueIn} {c.dueIn === 1 ? 'day' : 'days'}</Pill>}
                      </div>
                      <div className="row-between">
                        <span className="t-xs t-mut">Forecast</span>
                        <span className="t-xs" style={{ color: proj.verdict === 'late' ? 'var(--bad)' : 'var(--mut)' }}>
                          {proj.verdict === 'closed' ? 'Sealed'
                            : proj.verdict === 'stalled' ? 'No progress'
                              : proj.verdict === 'late' ? `${proj.needed - c.dueIn}d late` : 'On track'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

      </div>
    </>
  )
}
