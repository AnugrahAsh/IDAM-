import { useEffect, useState } from 'react'
import Icon from '../primitives/Icon'
import Avatar from '../primitives/Avatar'
import Menu from '../primitives/Menu'
import NavLink from './NavLink'
import { NAV, NAV_BADGES, BY_ID, moduleFor } from '../../data/nav'
import { useApp } from '../../store/AppContext'
import { useLocalState } from '../../lib/useLocalState'
import { ME } from '../../data/seed'
import { useBadges } from '../../lib/useBadges'

export default function Sidebar() {
  const { route, navigate, navMin, setNavMin, toast, can, role } = useApp()
  const [q, setQ] = useState('')
  const [closed, setClosed] = useLocalState('tf-idam-nav-closed', {})
  const [openParents, setOpenParents] = useLocalState('tf-idam-nav-open', {})
  const [menu, setMenu] = useState(null)
  const badges = useBadges()

  // Scroll the active nav item into view — deep groups otherwise leave it
  // off-screen after navigating from the command palette.
  useEffect(() => {
    const el = document.querySelector('.nav .nav-it[data-on]')
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
  }, [route])

  const needle = q.trim().toLowerCase()

  /* What the role being viewed as may actually reach. The account menu offered
     to view the console as a narrower role and then changed nothing, which made
     the toast a false claim; the navigation is now built from the same grants
     the pages check. A route with no permission module stays reachable. */
  const reachable = (id) => {
    const mod = moduleFor(id)
    return !mod || can(mod)
  }

  const hit = (id, groupLabel) => {
    const r = BY_ID[id]
    if (!r || !reachable(id)) return false
    return !needle || r.label.toLowerCase().includes(needle) || groupLabel.toLowerCase().includes(needle)
  }

  const item = (id, keyPrefix = '', sub = false) => {
    const r = BY_ID[id]
    if (!r) return null
    const badge = NAV_BADGES[id] ? badges[NAV_BADGES[id]] : null
    return (
      <NavLink
        key={keyPrefix + id}
        to={id}
        className="nav-it"
        data-sub={sub || undefined}
        data-on={route === id || undefined}
        title={r.label}
        aria-current={route === id ? 'page' : undefined}
      >
        <span className="nav-ic">
          <Icon name={r.icon} size={15} />
          {badge?.dot && <span className="nav-dot" data-sev={badge.dot} />}
        </span>
        <span className="nav-l">{r.label}</span>
        {badge?.count > 0 && (
          <span className="nav-n" data-tone={badge.tone === 'alert' ? 'alert' : undefined}>{badge.count}</span>
        )}
      </NavLink>
    )
  }

  const parent = (p, groupLabel) => {
    const here = typeof window !== 'undefined' ? window.location.pathname : ''
    const allowed = p.items.filter(reachable)
    const kids = allowed.filter((id) => hit(id, groupLabel) || (!needle && true))
    const visible = needle
      ? allowed.filter((id) => hit(id, groupLabel) || p.label.toLowerCase().includes(needle))
      : allowed
    if (!visible.length) return null
    const open = needle ? true : openParents[p.id] || p.items.includes(route)
    const kidBadge = p.items.map((id) => (NAV_BADGES[id] ? badges[NAV_BADGES[id]] : null)).find((b) => b && b.dot)
    return (
      <div key={p.id}>
        <button
          type="button"
          className="nav-it"
          data-on={p.items.includes(route) || undefined}
          onClick={() => setOpenParents((o) => ({ ...o, [p.id]: !open }))}
          aria-expanded={open}
          title={p.label}
        >
          <span className="nav-ic">
            <Icon name={p.icon} size={15} />
            {kidBadge && <span className="nav-dot" data-sev={kidBadge.dot} />}
          </span>
          <span className="nav-l">{p.label}</span>
          {!open && <span className="nav-hidden-hint" title={`${(p.links || p.items).length} hidden`}>{(p.links || p.items).length}</span>}
          <Icon name="chevD" size={11} className="nav-chev" data-closed={!open || undefined} />
        </button>
        {open && (p.links
          ? p.links.map((l) => (
            <NavLink
              key={l.path}
              to={l.path}
              className="nav-it"
              data-sub="true"
              data-on={here === l.path || undefined}
              title={l.label}
              aria-current={here === l.path ? 'page' : undefined}
            >
              <span className="nav-ic"><Icon name={p.icon} size={15} /></span>
              <span className="nav-l">{l.label}</span>
            </NavLink>
          ))
          : visible.map((id) => item(id, 'kid-', true)))}
      </div>
    )
  }

  return (
    <aside className="side">
      <div className="nav-head">
        <div className="nav-filter">
          <Icon name="search" size={13} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter navigation"
            aria-label="Filter navigation"
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setQ(''); e.currentTarget.blur(); return }
              if (e.key === 'Enter') {
                const first = document.querySelector('.nav .nav-it[href]')
                if (first) { first.click(); setQ(''); e.currentTarget.blur() }
              }
            }}
          />
          {q && (
            <button type="button" className="nav-filter-x" aria-label="Clear navigation filter" onClick={() => setQ('')}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>

      <nav className="nav" aria-label="Primary">
        {NAV.map((group) => {
          const flat = (group.items || []).filter((id) => hit(id, group.label))
          const parents = (group.parents || [])
            .filter((p) => p.items.some(reachable))
            .filter((p) => !needle || p.label.toLowerCase().includes(needle) || p.items.some((id) => hit(id, group.label)))
          if (!flat.length && !parents.length) return null
          const holdsActive = (group.items || []).includes(route)
            || (group.parents || []).some((p) => p.items.includes(route))
          const isClosed = !needle && closed[group.id] && !holdsActive
          // A collapsed group reports what is waiting inside it, not how many
          // links it holds — a plain item count reads as an alert count and is
          // noise on every group that has nothing to say.
          const groupIds = [...(group.items || []), ...(group.parents || []).flatMap((p) => p.items)]
          const groupAlerts = groupIds.reduce((a, id) => {
            const b = NAV_BADGES[id] ? badges[NAV_BADGES[id]] : null
            return a + (b?.count > 0 ? b.count : 0)
          }, 0)
          const groupTone = groupIds.some((id) => {
            const b = NAV_BADGES[id] ? badges[NAV_BADGES[id]] : null
            return b?.count > 0 && b.tone === 'alert'
          })
          return (
            <div className="nav-group" key={group.id}>
              <button
                type="button"
                className="nav-sect"
                onClick={() => setClosed((c) => ({ ...c, [group.id]: !c[group.id] }))}
                aria-expanded={!isClosed}
              >
                <span className="nav-sect-ic"><Icon name={group.icon} size={14} /></span>
                <span className="nav-sect-l">{group.label}</span>
                {isClosed && groupAlerts > 0 && (
                  <span
                    className="nav-n nav-sect-n"
                    data-tone={groupTone ? 'alert' : undefined}
                    title={`${groupAlerts} waiting inside ${group.label.toLowerCase()}`}
                  >
                    {groupAlerts}
                  </span>
                )}
                <Icon name="chevD" size={11} className="nav-chev" data-closed={isClosed || undefined} />
              </button>
              {!isClosed && (
                <div className="nav-kids">
                  {flat.map((id) => item(id))}
                  {parents.map((p) => parent(p, group.label))}
                </div>
              )}
            </div>
          )
        })}

        {needle && !NAV.some((g) =>
          (g.items || []).some((id) => hit(id, g.label))
          || (g.parents || []).some((p) => p.label.toLowerCase().includes(needle) || p.items.some((id) => hit(id, g.label)))) && (
          <div style={{ padding: 14, fontSize: 'var(--t-xs)', color: 'var(--mut)' }}>
            No navigation matches “{q}”.{' '}
            <button type="button" className="link" onClick={() => setQ('')}>Clear</button>
          </div>
        )}
      </nav>

      <div className="side-foot">
        {/* The identity chip opens My Profile; the account menu sits on its own
            control so the primary target stays unambiguous. */}
        <NavLink
          to="profile"
          className="side-user"
          data-on={route === 'profile' || undefined}
          title={`${ME.firstName} ${ME.lastName} — open my profile`}
        >
          <Avatar first={ME.firstName} last={ME.lastName} size="lg" />
          <span className="side-user-meta">
            <span className="side-user-name">{ME.firstName} {ME.lastName}</span>
            <span className="side-user-role" title={role.name}>{role.name}</span>
          </span>
        </NavLink>
        <button
          type="button"
          className="side-user-menu"
          aria-label="Account menu"
          title="Account menu"
          onClick={(e) => setMenu({
            anchor: e.currentTarget,
            items: [
              { label: role.name, header: true },
              { id: 'profile', label: 'My profile', icon: 'user', onSelect: () => navigate('profile') },
              { id: 'pw', label: 'Change password', icon: 'lock', onSelect: () => toast('info', 'Change password', 'Opens the credential change dialog.') },
              { id: 'settings', label: 'Settings', icon: 'config', onSelect: () => navigate('settings') },
              { divider: true },
              { id: 'out', label: 'Log Out', icon: 'power', danger: true, onSelect: () => toast('info', 'Log out', 'Session termination is disabled in the prototype.') },
            ],
          })}
        >
          <Icon name="kebab" size={15} />
        </button>
        <button type="button" className="side-min" onClick={() => setNavMin(!navMin)}
          aria-label={navMin ? 'Expand navigation' : 'Collapse navigation'} title={navMin ? 'Expand' : 'Collapse'}>
          <Icon name="chevL" size={15} />
        </button>
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </aside>
  )
}
