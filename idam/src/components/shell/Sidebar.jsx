import { useState } from 'react'
import Icon from '../primitives/Icon'
import Avatar from '../primitives/Avatar'
import Menu from '../primitives/Menu'
import NavLink from './NavLink'
import { NAV, NAV_BADGES, BY_ID } from '../../data/nav'
import { useApp } from '../../store/AppContext'
import { useLocalState } from '../../lib/useLocalState'
import { ME } from '../../data/seed'
import { useBadges } from '../../lib/useBadges'

export default function Sidebar() {
  const { route, navigate, navMin, setNavMin, toast } = useApp()
  const [q, setQ] = useState('')
  const [closed, setClosed] = useLocalState('tf-idam-nav-closed', {})
  const [menu, setMenu] = useState(null)
  const badges = useBadges()

  const needle = q.trim().toLowerCase()
  const hit = (id, groupLabel) => {
    const r = BY_ID[id]
    if (!r) return false
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

  const link = (l, groupIcon) => {
    const here = typeof window !== 'undefined' ? window.location.pathname : ''
    return (
      <NavLink
        key={l.path}
        to={l.path}
        className="nav-it"
        data-on={here === l.path || undefined}
        title={l.label}
        aria-current={here === l.path ? 'page' : undefined}
      >
        <span className="nav-ic"><Icon name={l.icon || groupIcon} size={15} /></span>
        <span className="nav-l">{l.label}</span>
      </NavLink>
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
            onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); e.currentTarget.blur() } }}
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
          const links = (group.links || []).filter((l) =>
            !needle || l.label.toLowerCase().includes(needle) || group.label.toLowerCase().includes(needle))
          if (!flat.length && !links.length) return null
          const isClosed = !needle && closed[group.id]
          const hiddenCount = (group.items || []).length + (group.links || []).length
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
                {isClosed && <span className="nav-hidden-hint" title={`${hiddenCount} hidden`}>{hiddenCount}</span>}
                <Icon name="chevD" size={11} className="nav-chev" data-closed={isClosed || undefined} />
              </button>
              {!isClosed && (
                <div className="nav-kids">
                  {flat.map((id) => item(id))}
                  {links.map((l) => link(l, group.icon))}
                </div>
              )}
            </div>
          )
        })}

        {needle && !NAV.some((g) =>
          (g.items || []).some((id) => hit(id, g.label))
          || (g.links || []).some((l) => l.label.toLowerCase().includes(needle) || g.label.toLowerCase().includes(needle))) && (
          <div style={{ padding: 14, fontSize: 'var(--t-xs)', color: 'var(--mut)' }}>
            No navigation matches “{q}”.{' '}
            <button type="button" className="link" onClick={() => setQ('')}>Clear</button>
          </div>
        )}
      </nav>

      <div className="side-foot">
        <button type="button" className="side-user" onClick={(e) => setMenu({
          anchor: e.currentTarget,
          items: [
            { label: ME.roleLabel, header: true },
            { id: 'pw', label: 'Change password', icon: 'lock', onSelect: () => toast('info', 'Change password', 'Opens the credential change dialog.') },
            { id: 'settings', label: 'Settings', icon: 'config', onSelect: () => navigate('settings') },
            { divider: true },
            { id: 'out', label: 'Log Out', icon: 'power', danger: true, onSelect: () => toast('info', 'Log out', 'Session termination is disabled in the prototype.') },
          ],
        })}>
          <Avatar first={ME.firstName} last={ME.lastName} size="lg" />
          <span className="side-user-meta">
            <span className="side-user-name">{ME.firstName} {ME.lastName}</span>
            <span className="side-user-role">{ME.roleLabel}</span>
          </span>
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
