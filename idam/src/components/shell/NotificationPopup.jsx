import { useMemo, useState } from 'react'
import Icon from '../primitives/Icon'
import Button from '../primitives/Button'
import IconButton from '../primitives/IconButton'
import EmptyState from '../primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { useDialogFocus } from '../../lib/useDialogFocus'
import { inboxRows } from '../../pages/notificationCenter/inboxModel'
import { usePublishedAnnouncements } from '../../pages/notificationCenter/announcementStore'
import { markRead, markUnread, useRead } from '../../pages/notificationCenter/readStore'
import { useNotificationTaxonomy } from '../../pages/settings/settingsStore'
import { INBOX_PATH } from '../../pages/notificationCenter/notificationAccess'
import { NOW_MS } from '../../lib/clock'

/**
 * The notification popup.
 *
 * Raised once on sign-in, and from the bell in the header. It is the same
 * inbox the Notification Center renders — one composition, one read store —
 * shown at the size an interruption should be: enough to read the unread ones
 * and act, not a register to work through.
 *
 * A dialog rather than a menu hung off the bell. It has to open by itself on
 * sign-in, when there is nothing under the pointer for a menu to be anchored
 * to, and the same surface then has to serve the bell so the two are not two
 * different notification UIs.
 */

const SEVERITY = {
  critical: { tone: 'bad', label: 'Critical' },
  high: { tone: 'warn', label: 'High' },
  info: { tone: 'acc', label: 'Info' },
}

/* The register stamps a notification `YYYY-MM-DD HH:MM`, which is the right
   thing on a row that is being compared with the rows above it and the wrong
   thing on a popup that is telling someone what happened while they were away.

   Measured against the platform clock, not the wall clock: every timestamp in
   this console is generated from NOW_MS, so "2 hours ago" read as "a month
   ago" whenever the machine's own date had moved on. */
const relative = (stamp, nowMs = NOW_MS) => {
  const t = Date.parse(String(stamp).replace(' ', 'T') + 'Z')
  if (Number.isNaN(t)) return stamp
  const mins = Math.round((nowMs - t) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return String(stamp).slice(0, 10)
}

export default function NotificationPopup({ onClose, greeting = false }) {
  const { navigate } = useApp()
  const ref = useDialogFocus(onClose)
  const read = useRead()
  const announcements = usePublishedAnnouncements()
  const taxonomy = useNotificationTaxonomy()
  const [tab, setTab] = useState(greeting ? 'unread' : 'all')
  const [openId, setOpenId] = useState(null)
  /* Opening a notification marks it read, which on the Unread tab took the row
     out of the list the instant it was clicked — the thing the operator was
     reading disappeared from under the pointer. Rows read inside this popup
     stay on the tab until it is closed. They no longer count as unread; they
     are just still on screen. */
  const [held, setHeld] = useState(() => new Set())

  const all = useMemo(() => inboxRows(announcements, read), [announcements, read])
  const unread = useMemo(() => all.filter((r) => r.unread), [all])
  const unreadView = useMemo(() => all.filter((r) => r.unread || held.has(String(r.id))), [all, held])

  /* Newest first, and anything unread ahead of anything read: the popup is a
     catch-up, so the order is what still needs attention rather than the
     register's plain chronology.

     A row read inside the popup keeps the rank it opened with. Sorting on the
     live flag instead sent the notification the operator had just clicked to
     the bottom of the list, so the thing they were reading moved out from
     under them. */
  const rows = useMemo(() => {
    const list = tab === 'unread' ? unreadView : all
    const rank = (r) => ((r.unread || held.has(String(r.id))) ? 0 : 1)
    return [...list].sort((a, b) => (
      rank(a) - rank(b) || String(b.scheduleOn).localeCompare(String(a.scheduleOn))
    ))
  }, [tab, all, unreadView, held])

  const markOf = (category) => taxonomy.categories.find((c) => c.label === category)?.icon || 'bell'

  const toggle = (row) => {
    setOpenId((id) => (id === row.id ? null : row.id))
    if (row.unread) {
      setHeld((h) => new Set(h).add(String(row.id)))
      markRead(row.id)
    }
  }

  const readAll = () => {
    if (!unread.length) return
    /* Everything cleared by this action stays on screen too, so "mark all read"
       reads as the list settling rather than as the list vanishing. */
    setHeld((h) => {
      const next = new Set(h)
      unread.forEach((r) => next.add(String(r.id)))
      return next
    })
    markRead(unread.map((r) => r.id))
  }

  const openCenter = () => {
    onClose()
    navigate(INBOX_PATH)
  }

  /* Everything published, and what is still waiting. Severity is already on
     every row, so a Critical tab was a third way to reach a subset the eye
     finds without it. */
  const TABS = [
    { id: 'all', label: 'All', n: all.length },
    { id: 'unread', label: 'Unread', n: unread.length },
  ]

  return (
    <div className="np-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={ref}
        tabIndex={-1}
        className="np"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        <header className="np-h">
          <span className="np-h-ic">
            <Icon name="bell" size={17} />
            {unread.length > 0 && <span className="np-h-dot" />}
          </span>
          <div className="np-h-meta">
            <h2 className="np-h-t">{greeting ? 'Welcome back' : 'Notifications'}</h2>
            <p className="np-h-s">
              {unread.length
                ? `${unread.length} unread of ${all.length} published to you`
                : `All ${all.length} caught up — nothing waiting`}
            </p>
          </div>
          <IconButton icon="x" label="Close notifications" onClick={onClose} />
        </header>

        <div className="np-tabs" role="tablist" aria-label="Filter notifications">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              data-on={tab === t.id || undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className="np-tab-n">{t.n}</span>
            </button>
          ))}
        </div>

        <div className="np-list">
          {rows.length === 0 ? (
            <div className="np-empty">
              <EmptyState
                size="sm"
                icon={tab === 'unread' ? 'checkC' : 'bell'}
                title={tab === 'unread' ? 'Nothing unread' : 'Nothing here'}
                body={tab === 'unread'
                  ? 'Every notification published to you has been read.'
                  : 'Nothing has been published to you yet.'}
              />
            </div>
          ) : rows.map((r, i) => (
            <article
              className="np-it"
              key={r.id}
              data-unread={r.unread || undefined}
              data-open={openId === r.id || undefined}
              /* The stagger is capped: past a dozen rows it stops being an
                 entrance and becomes a wait. */
              style={{ '--i': Math.min(i, 11) }}
            >
              <button type="button" className="np-it-hit" onClick={() => toggle(r)} aria-expanded={openId === r.id}>
                <span className="np-it-ic" data-tone={SEVERITY[r.severity].tone}>
                  <Icon name={markOf(r.category)} size={14} />
                </span>
                <span className="np-it-body">
                  <span className="np-it-top">
                    <span className="np-it-t">{r.title}</span>
                    {r.unread && <span className="np-it-new" aria-label="Unread" />}
                  </span>
                  <span className="np-it-d">{r.description}</span>
                  <span className="np-it-meta">
                    <span className="np-it-sev" data-tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].label}</span>
                    <span className="np-it-sep">·</span>
                    <span>{r.category}</span>
                    <span className="np-it-sep">·</span>
                    <span>{relative(r.scheduleOn)}</span>
                  </span>
                </span>
                <span className="np-it-chev" aria-hidden="true"><Icon name="chevD" size={13} /></span>
              </button>

              {openId === r.id && (
                <div className="np-it-more">
                  <p className="np-it-full">{r.description}</p>
                  <div className="np-it-acts">
                    <span className="np-it-stamp">{r.scheduleOn}</span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setHeld((h) => { const next = new Set(h); next.delete(String(r.id)); return next })
                        markUnread(r.id)
                      }}
                    >
                      Mark unread
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        <footer className="np-f">
          <Button size="sm" icon="checkC" disabled={unread.length === 0} onClick={readAll}>
            Mark all read{unread.length ? ` (${unread.length})` : ''}
          </Button>
          <Button size="sm" variant="pri" iconRight="chevR" onClick={openCenter}>
            Open Notification Center
          </Button>
        </footer>
      </section>
    </div>
  )
}
