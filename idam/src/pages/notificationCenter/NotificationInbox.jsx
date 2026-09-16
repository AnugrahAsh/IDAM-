import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Icon from '../../components/primitives/Icon'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { useLocalState } from '../../lib/useLocalState'
import { serialColumn } from '../../lib/format'
import Button from '../../components/primitives/Button'
import KeyValue from '../../components/primitives/KeyValue'
import { useApp } from '../../store/AppContext'
import { markRead, markUnread, useRead } from './readStore'
import { inboxRows } from './inboxModel'
import { usePublishedAnnouncements } from './announcementStore'
import { useNotificationTaxonomy } from '../settings/settingsStore'
import { MANAGE_PATH, NOTIFICATION_MODULE, WRITE_ANNOUNCEMENT } from './notificationAccess'

const SEVERITY = {
  critical: { tone: 'bad', label: 'Critical' },
  high: { tone: 'warn', label: 'High' },
  info: { tone: 'acc', label: 'Info' },
}

/* The mark beside a notification is the one its category carries in Settings →
   Notification Management Setup. A row filed under a category that has since
   been deleted still renders — it falls back to the bell rather than nothing. */
const markFor = (taxonomy, category) =>
  taxonomy.categories.find((c) => c.label === category)?.icon || 'bell'

export default function NotificationInbox() {
  const { toast, setDrawer, navigate, can } = useApp()
  const taxonomy = useNotificationTaxonomy()
  const [sev, setSev] = useState('all')
  const [view, setView] = useLocalState('tf-idam-notif-view', 'table')
  const read = useRead()
  // Announcements published in the Manage view land here, so the inbox is
  // genuinely the notification center rather than a second, stale list.
  const announcements = usePublishedAnnouncements()
  const mayManage = can(NOTIFICATION_MODULE, WRITE_ANNOUNCEMENT)

  // Read state is applied before anything is counted, so the tile, the filter
  // and the navigation badge can never disagree about what is still unread.
  const all = useMemo(() => inboxRows(announcements, read), [announcements, read])

  const stats = useMemo(() => ({
    total: all.length,
    unread: all.filter((r) => r.unread).length,
    critical: all.filter((r) => r.severity === 'critical').length,
    high: all.filter((r) => r.severity === 'high').length,
  }), [all])

  const rows = useMemo(
    () => (sev === 'all' ? all
      : sev === 'unread' ? all.filter((r) => r.unread)
        : all.filter((r) => r.severity === sev)),
    [sev, all],
  )

  /* Opening a notification is what marks it read — the same gesture in every
     inbox the operator already uses. */
  const open = (row) => {
    markRead(row.id)
    setDrawer({
      title: row.title,
      sub: `${SEVERITY[row.severity].label} · ${row.category} · ${row.scheduleOn}`,
      children: (
        <div className="stack">
          <div className="banner" data-tone={SEVERITY[row.severity].tone === 'bad' ? 'bad' : SEVERITY[row.severity].tone === 'warn' ? 'warn' : 'info'}>
            <Icon name={markFor(taxonomy, row.category)} size={15} />
            <div>{row.description}</div>
          </div>
          <KeyValue
            cols={1}
            rows={[
              { k: 'Severity', v: SEVERITY[row.severity].label, icon: 'warn' },
              { k: 'Category', v: row.category, icon: 'layers' },
              { k: 'Published', v: row.scheduleOn, icon: 'clock' },
              { k: 'State', v: 'Read', icon: 'checkC' },
            ]}
          />
        </div>
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Close</Button>
          <Button
            icon="eyeoff"
            onClick={() => { markUnread(row.id); setDrawer(null); toast('ok', 'Marked unread', row.title) }}
          >
            Mark unread
          </Button>
        </>
      ),
    })
  }

  const markAllRead = () => {
    const unread = all.filter((r) => r.unread)
    if (!unread.length) return
    markRead(unread.map((r) => r.id))
    toast('ok', 'All notifications read', `${unread.length} ${unread.length === 1 ? 'notification' : 'notifications'} marked read. The navigation badge is cleared.`)
  }

  // Naming the active filter keeps the empty state honest: an inbox filtered
  // down to nothing is not an inbox with nothing in it.
  const scopeLabel = sev === 'unread' ? 'unread' : (SEVERITY[sev]?.label || '').toLowerCase()

  const columns = [
    serialColumn('S.No'),
    {
      key: 'title', label: 'Title', locked: true, width: 300,
      value: (r) => `${r.title} ${SEVERITY[r.severity].label} ${r.category}`,
      render: (r) => (
        <span className="ntf">
          <span className="feed-ic" data-tone={SEVERITY[r.severity].tone}>
            <Icon name={markFor(taxonomy, r.category)} size={13} />
          </span>
          <span className="cell-stack">
            <span className="ntf-t" data-unread={r.unread || undefined}>
              {r.unread && <span className="ntf-dot" aria-label="Unread" />}
              <span className="trunc">{r.title}</span>
            </span>
            <span className="cell-sub">
              <span className="ntf-sev" data-tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].label}</span>
              <span className="ntf-sep">·</span>
              {r.category}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'description', label: 'Description', cls: 'td-flex',
      render: (r) => <span className="trunc" style={{ display: 'block' }} title={r.description}>{r.description}</span>,
    },
    { key: 'scheduleOn', label: 'Schedule On', cls: 'td-mono', align: 'right', width: 150 },
  ]

  return (
    <>
      <PageBar
        title="Notification Center"
        crumbs={[{ label: 'Notification Center' }]}
        sub="Everything the platform has published to you — governance deadlines, operational failures and security events."
        actions={
          <>
            <Button icon="checkC" disabled={stats.unread === 0} onClick={markAllRead}>
              Mark all read{stats.unread ? ` (${stats.unread})` : ''}
            </Button>
            {/* Authoring lives inside this page rather than beside it in the
                navigation, and only for identities whose role may author. */}
            {mayManage && (
              <Button variant="pri" icon="sliders" onClick={() => navigate(MANAGE_PATH)}>Manage</Button>
            )}
          </>
        }
      />
      <StatCards
        items={[
          { id: 'all', icon: 'bell', label: 'Notifications', value: stats.total, chip: `${stats.unread} unread`, sub: 'published to you', hint: 'Everything the platform has raised' },
          { id: 'unread', icon: 'info', label: 'Unread', value: stats.unread, chip: stats.unread ? 'not yet opened' : 'all read', chipTone: stats.unread ? 'warn' : 'ok', sub: 'waiting to be read', hint: 'Notifications you have not opened' },
          { id: 'critical', icon: 'warn', label: 'Critical', value: stats.critical, chip: stats.critical ? 'act now' : 'none', chipTone: stats.critical ? 'bad' : undefined, sub: 'highest severity', hint: 'Critical severity notifications' },
          { id: 'high', icon: 'activity', label: 'High', value: stats.high, chip: 'review today', chipTone: stats.high ? 'warn' : undefined, sub: 'raised for attention', hint: 'High severity notifications' },
        ]}
        value={sev}
        onChange={(id) => setSev(id === sev && id !== 'all' ? 'all' : id)}
        label="Filter notifications"
      />

      <DataWorkbench
        id="notifications"
        rows={rows}
        columns={columns}
        /* Table and Grouped only. A notification is a title, a severity and a
           line of body text — a card gave that a whole tile and turned a
           thirteen-row inbox into three screens of scrolling. */
        views={[
          { id: 'table', label: 'Table', icon: 'menu', desc: 'Dense list with sortable columns' },
          { id: 'groups', label: 'Grouped', icon: 'layers', desc: 'Split by category' },
        ]}
        view={view}
        onViewChange={setView}
        groupOf={(r) => r.category}
        groupSummary={(section) => `${section.filter((r) => r.unread).length} unread`}
        searchPlaceholder="Search notifications by title, description or category…"
        onRowClick={open}
        rowActions={(r) => [
          { id: 'open', label: 'Open', icon: 'eye', onSelect: () => open(r) },
          r.unread
            ? { id: 'read', label: 'Mark read', icon: 'checkC', onSelect: () => { markRead(r.id); toast('ok', 'Marked read', r.title) } }
            : { id: 'unread', label: 'Mark unread', icon: 'eyeoff', onSelect: () => { markUnread(r.id); toast('ok', 'Marked unread', r.title) } },
        ]}
        toolbar={(
          <div className="seg">
            {/* Unread is reachable from the tile above, so it has a seat here
                too — otherwise choosing it leaves the strip with nothing on. */}
            {[['all', 'All'], ['unread', 'Unread'], ['critical', 'Critical'], ['high', 'High'], ['info', 'Info']].map(([id, label]) => (
              <button key={id} type="button" className={sev === id ? 'on' : undefined} onClick={() => setSev(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
        emptyTitle={sev === 'all' ? 'No notifications' : 'No matching notifications'}
        emptyBody={sev === 'all'
          ? 'Nothing has been published to you yet.'
          : `Nothing in the inbox is ${scopeLabel}. Choose All to see everything published to you.`}
        emptyIcon={sev === 'all' ? 'bell' : 'search'}
      />
    </>
  )
}
