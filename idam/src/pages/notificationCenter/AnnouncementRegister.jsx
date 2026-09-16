import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RegisterSummary from '../../components/workbench/RegisterSummary'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import EmptyState from '../../components/primitives/EmptyState'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { stampText } from '../../lib/clock'
import { statusTone } from './announcementData'
import { reachOf, readAudience } from '../shared/comms/audienceModel'
import { notificationTaxonomy, useNotificationTaxonomy } from '../settings/settingsStore'
import AnnouncementEditor from './AnnouncementEditor'
import { useAnnouncements, writeAnnouncements } from './announcementStore'
import { INBOX_PATH, MANAGE_PATH, NOTIFICATION_MODULE, WRITE_ANNOUNCEMENT } from './notificationAccess'

/* SeverityBadge draws a four-step scale; the taxonomy files on three. An
   authored severity is rendered at the step it is filed under, so a tenant that
   renames "critical" to "P1" still gets the critical badge. */
const BADGE_LEVEL = { info: 'low', high: 'high', critical: 'critical' }

const blank = () => {
  const t = notificationTaxonomy()
  return {
    id: null, title: '', description: '', audience: 'All users', channel: 'In-app',
    category: t.categories[0]?.label || '',
    severity: t.severities[0]?.label || 'info',
    scheduleOn: '', status: 'Draft', reach: 0,
  }
}

/**
 * The Manage view of the Notification Center: a full page of its own, reached
 * from the inbox rather than from a second navigation entry, and only by an
 * identity whose role may author announcements.
 */
export default function AnnouncementRegister({ segments = [] }) {
  const { navigate, toast, confirm, can, role } = useApp()
  const all = useAnnouncements()
  // Category colour and severity step both come from Settings → Notification Management Setup.
  const taxonomy = useNotificationTaxonomy()
  const toneOf = (label) => taxonomy.categories.find((c) => c.label === label)?.tone
  const badgeOf = (label) => BADGE_LEVEL[taxonomy.severities.find((x) => x.label === label)?.level] || 'low'
  const [status, setStatus] = useState('All')
  const rows = useMemo(() => (status === 'All' ? all : all.filter((r) => r.status === status)), [all, status])
  const setRows = writeAnnouncements

  const mode = segments[0]
  const record = useMemo(
    () => (mode && mode !== 'add' ? all.find((r) => String(r.id) === String(mode)) : null),
    [mode, all],
  )

  // The gate is checked here as well as on the button that reaches it, so a
  // pasted address cannot walk around the navigation.
  if (!can(NOTIFICATION_MODULE, WRITE_ANNOUNCEMENT)) {
    return (
      <>
        <PageBar
          title="Notification Management"
          crumbs={[{ label: 'Notification Center', to: 'notifications' }, { label: 'Notification Management' }]}
        />
        <Card>
          <EmptyState
            icon="lock"
            title="You cannot author announcements"
            body={`${role.name} may read the notification center but not publish to it. Ask a Global Identity Administrator for the Notification Center authoring permissions.`}
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate(INBOX_PATH)}>Back to notifications</Button>}
          />
        </Card>
      </>
    )
  }

  const publish = (v) => {
    setRows((rs) => rs.map((r) => (r.id === v.id
      ? { ...r, ...v, status: 'Published', scheduleOn: v.scheduleOn || stampText(), reach: reachOf(readAudience(v)) }
      : r)))
    toast('ok', 'Announcement published', `Delivered to ${v.audience} over ${v.channel}.`)
    navigate(MANAGE_PATH)
  }

  if (mode === 'add') {
    return (
      <AnnouncementEditor
        record={blank()}
        onCancel={() => navigate(MANAGE_PATH)}
        onDelete={() => {}}
        onPublish={(v) => {
          setRows((rs) => [...rs, { ...v, id: rs.reduce((m, r) => Math.max(m, r.id), 0) + 1, status: 'Published', scheduleOn: v.scheduleOn || stampText(), reach: reachOf(readAudience(v)) }])
          toast('ok', 'Announcement published', `Delivered to ${v.audience}.`)
          navigate(MANAGE_PATH)
        }}
        onSave={(v) => {
          setRows((rs) => [...rs, { ...v, id: rs.reduce((m, r) => Math.max(m, r.id), 0) + 1 }])
          toast('ok', 'Announcement created', v.title)
          navigate(MANAGE_PATH)
        }}
      />
    )
  }

  if (mode) {
    if (!record) {
      return (
        <>
          <PageBar
            title="Announcement not found"
            crumbs={[{ label: 'Notification Center', to: 'notifications' }, { label: 'Notification Management', to: MANAGE_PATH }, { label: 'Not found' }]}
          />
          <Card>
            <EmptyState
              icon="bell"
              title="No such announcement"
              body={`Announcement ${mode} does not exist.`}
              actions={<Button variant="pri" onClick={() => navigate(MANAGE_PATH)}>Back</Button>}
            />
          </Card>
        </>
      )
    }
    return (
      <AnnouncementEditor
        record={record}
        onCancel={() => navigate(MANAGE_PATH)}
        onPublish={publish}
        onSave={(v) => { setRows((rs) => rs.map((r) => (r.id === v.id ? v : r))); toast('ok', 'Announcement saved', v.title); navigate(MANAGE_PATH) }}
        onDelete={(r) => confirm({
          title: `Delete ${r.title}?`,
          body: 'It is removed from every notification center it has already reached.',
          confirmLabel: 'Delete announcement',
          onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Announcement deleted', r.title); navigate(MANAGE_PATH) },
        })}
      />
    )
  }

  const published = all.filter((r) => r.status === 'Published')
  const scheduled = all.filter((r) => r.status === 'Scheduled')
  const drafts = all.filter((r) => r.status === 'Draft')

  const columns = [
    serialColumn('S.No'),
    { key: 'title', label: 'Title', cls: 'td-main', locked: true, render: (r) => <span className="link" onClick={() => navigate(`${MANAGE_PATH}/${r.id}`)}>{r.title}</span> },
    { key: 'description', label: 'Description', render: (r) => <span className="trunc" style={{ display: 'block', maxWidth: 420 }}>{r.description}</span> },
    { key: 'audience', label: 'Audience', render: (r) => <span className="trunc" style={{ display: 'block', maxWidth: 240 }}>{r.audience}</span> },
    {
      key: 'category',
      label: 'Category',
      render: (r) => <Tag tone={toneOf(r.category)}>{r.category || taxonomy.categories[0]?.label}</Tag>,
    },
    { key: 'channel', label: 'Channel', render: (r) => <Tag>{r.channel}</Tag> },
    { key: 'severity', label: 'Severity', render: (r) => <SeverityBadge level={badgeOf(r.severity)}>{r.severity}</SeverityBadge> },
    { key: 'scheduleOn', label: 'Schedule On', cls: 'td-mono', render: (r) => r.scheduleOn || '—' },
    { key: 'reach', label: 'Reach', align: 'right', render: (r) => (r.reach ? num(r.reach) : '—') },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone[r.status]} dot>{r.status}</Pill> },
  ]

  return (
    <>
      <PageBar
        title="Notification Management"
        sub="Everything published to the Notification Center, with audience, schedule and reach. Publishing here puts the announcement in the inbox."
        crumbs={[{ label: 'Notification Center', to: 'notifications' }, { label: 'Notification Management' }]}
        actions={
          <>
            <Button icon="chevL" onClick={() => navigate(INBOX_PATH)}>Back to notifications</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate(`${MANAGE_PATH}/add`)}>Add announcement</Button>
          </>
        }
      />

      <RegisterSummary
        ariaLabel="Announcement register"
        icon="bell"
        label="Announcements"
        value={all.length}
        caption="authored in the console"
        facts={[{ k: 'Total reach', v: all.reduce((a, r) => a + r.reach, 0) }]}
        segments={[
          { id: 'Published', icon: 'checkC', label: 'Published', value: published.length, sub: 'live in the inbox' },
          { id: 'Scheduled', icon: 'calendar', label: 'Scheduled', value: scheduled.length, sub: 'waiting for their window' },
          { id: 'Draft', icon: 'edit', label: 'Drafts', value: drafts.length, sub: 'not sent to anyone' },
        ]}
        active={status}
        allId="All"
        onSelect={setStatus}
      />

      <DataWorkbench
        id="notification-management"
        rows={rows}
        columns={columns}
        selectable
        searchPlaceholder="Search by title, audience or channel…"
        onRowClick={(r) => navigate(`${MANAGE_PATH}/${r.id}`)}
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" icon="bell" onClick={() => {
              const s = new Set(ids.map(String))
              setRows((rs) => rs.map((r) => (s.has(String(r.id)) ? { ...r, status: 'Published', scheduleOn: r.scheduleOn || stampText(), reach: reachOf(readAudience(r)) } : r)))
              clear(); toast('ok', 'Published', `${ids.length} announcements published.`)
            }}>Publish</Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => confirm({
              title: `Delete ${ids.length} announcements?`,
              body: 'They are removed from every notification center they have reached.',
              confirmLabel: `Delete ${ids.length}`,
              onConfirm: () => {
                const s = new Set(ids.map(String))
                setRows((rs) => rs.filter((r) => !s.has(String(r.id))))
                clear(); toast('ok', 'Deleted', `${ids.length} removed.`)
              },
            })}>Delete</Button>
          </>
        )}
        rowActions={(r) => [
          { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${MANAGE_PATH}/${r.id}`) },
          { id: 'pub', label: 'Publish now', icon: 'bell', disabled: r.status === 'Published', onSelect: () => publish(r) },
          { id: 'dup', label: 'Duplicate', icon: 'copy', onSelect: () => toast('ok', 'Duplicated', `${r.title} copy created as a draft.`) },
          { divider: true },
          {
            id: 'del', label: 'Delete', icon: 'trash', danger: true,
            onSelect: () => confirm({
              title: `Delete ${r.title}?`,
              body: 'It is removed from every notification center it has already reached.',
              confirmLabel: 'Delete announcement',
              onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Deleted', r.title) },
            }),
          },
        ]}
        emptyTitle="No announcements"
        emptyBody="Publish an announcement to reach every identity in the console."
        emptyIcon="bell"
      />
    </>
  )
}
