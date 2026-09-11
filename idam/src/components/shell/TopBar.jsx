import { useState } from 'react'
import Icon from '../primitives/Icon'
import Avatar from '../primitives/Avatar'
import Menu from '../primitives/Menu'
import { useApp } from '../../store/AppContext'
import NavLink from './NavLink'
import { ME } from '../../data/seed'
import { ROLE_OPTIONS } from '../../lib/access'
import wordmark from '../../assets/tanflow-wordmark-white.png'

export default function TopBar() {
  const { navigate, setNavOpen, toast, setPaletteOpen, theme, toggleTheme, roleId, setRoleId, role, signOut } = useApp()
  const [menu, setMenu] = useState(null)
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
        {/* One control. Notifications, Reports and Settings each duplicated a
            navigation entry a few pixels to the left; the theme switch is the
            only thing here with nowhere else to live. */}
        <button
          className="top-btn"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>

        <div className="top-div" />

        <button
          className="top-user"
          aria-label={`Account menu for ${ME.firstName} ${ME.lastName}`}
          onClick={(e) => setMenu({
            anchor: e.currentTarget,
            items: [
              { label: `Last login ${ME.lastLogin}`, header: true },
              /* Pages that fold an administrative surface into a user-facing
                 one — the Notification Center and Quick Links both do — decide
                 what to offer from the signed-in role. Switching it here is how
                 that gate is exercised without a second account, which is why
                 it is the one thing this menu still carries besides the exit.
                 My profile, Change password and Settings all left: each was a
                 second door onto a screen already in the navigation. */
              { label: 'View console as', header: true },
              ...ROLE_OPTIONS.map((r) => ({
                id: `role-${r.id}`,
                label: r.name,
                icon: String(r.id) === String(roleId) ? 'check' : 'roles',
                onSelect: () => {
                  setRoleId(r.id)
                  toast('info', 'Role switched', `The console now renders what ${r.name} may reach.`)
                },
              })),
              { divider: true },
              { id: 'out', label: 'Log Out', icon: 'power', danger: true, onSelect: () => { signOut(); toast('ok', 'Signed out', 'The session was ended. Sign in again to return to the console.') } },
            ],
          })}
        >
          <Avatar first={ME.firstName} last={ME.lastName} />
          {/* An avatar alone made the operator hover to learn who they were
              signed in as, and the role they were viewing as was invisible
              until the menu was open — on a console where that switch changes
              what the whole navigation offers. */}
          <span className="top-user-m">
            <span className="top-user-n">{ME.firstName} {ME.lastName}</span>
            <span className="top-user-r">{role.name}</span>
            <span className="top-user-u">{ME.username}</span>
          </span>
          <Icon name="chevD" size={13} />
        </button>
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </header>
  )
}
