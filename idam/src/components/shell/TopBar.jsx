import { useState } from 'react'
import Icon from '../primitives/Icon'
import Avatar from '../primitives/Avatar'
import Menu from '../primitives/Menu'
import { useApp } from '../../store/AppContext'
import NavLink from './NavLink'
import { ME, NOTIFICATIONS } from '../../data/seed'
import wordmark from '../../assets/tanflow-wordmark-white.png'

export default function TopBar() {
  const { navigate, setNavOpen, toast, setPaletteOpen, theme, toggleTheme } = useApp()
  const [menu, setMenu] = useState(null)
  const unread = NOTIFICATIONS.filter((n) => n.unread).length

  return (
    <header className="topbar">
      <button className="top-btn burger" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation">
        <Icon name="menu" />
      </button>

      <NavLink to="myapps" className="brand" aria-label="Tanflow home">
        <img className="brand-logo" src={wordmark} alt="Tanflow" />
      </NavLink>
      <span className="brand-sub">Identity &amp; Access Management</span>

      {/* Global search is a button, not an input — it opens the command palette. */}
      <button className="gsearch" onClick={() => setPaletteOpen(true)} aria-label="Search the console">
        <Icon name="search" />
        <span className="gs-hint">Search users, applications, groups, pages…</span>
        <kbd className="gs-kbd">⌘ K</kbd>
      </button>

      <div className="top-actions">
        <button className="top-btn" title="Notifications" onClick={() => navigate('notifications')} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <Icon name="bell" />
          {unread > 0 && <span className="top-btn-dot" />}
        </button>
        <button className="top-btn" title="Reports" onClick={() => navigate('reports')} aria-label="Reports">
          <Icon name="activity" />
        </button>
        <button
          className="top-btn"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="top-btn" title="Settings" onClick={() => navigate('settings')} aria-label="Settings">
          <Icon name="config" />
        </button>

        <div className="top-div" />

        <button
          className="top-user"
          aria-label={`Account menu for ${ME.firstName} ${ME.lastName}`}
          onClick={(e) => setMenu({
            anchor: e.currentTarget,
            items: [
              { label: `${ME.username} · ${ME.roleLabel}`, header: true },
              { label: `Last Login: ${ME.lastLogin}`, header: true },
              { id: 'profile', label: 'My profile', icon: 'user', onSelect: () => navigate('profile') },
              { id: 'pw', label: 'Change password', icon: 'lock', onSelect: () => toast('info', 'Change password', 'Opens the credential change dialog.') },
              { id: 'settings', label: 'Settings', icon: 'config', onSelect: () => navigate('settings') },
              { divider: true },
              { id: 'out', label: 'Log Out', icon: 'power', danger: true, onSelect: () => toast('info', 'Log out', 'Session termination is disabled in the prototype.') },
            ],
          })}
        >
          <Avatar first={ME.firstName} last={ME.lastName} />
        </button>
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </header>
  )
}
