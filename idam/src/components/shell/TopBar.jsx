import { useState } from 'react'
import Icon from '../primitives/Icon'
import Avatar from '../primitives/Avatar'
import Menu from '../primitives/Menu'
import { useApp } from '../../store/AppContext'
import NavLink from './NavLink'
import { ME, NOTIFICATIONS } from '../../data/seed'
import wordmark from '../../assets/tanflow-wordmark-white.png'

export default function TopBar() {
  const { navigate, setNavOpen, toast } = useApp()
  const [menu, setMenu] = useState(null)
  const unread = NOTIFICATIONS.filter((n) => n.unread).length

  return (
    <header className="topbar">
      <button className="top-btn" style={{ display: 'none' }} id="burger" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation">
        <Icon name="menu" />
      </button>

      <NavLink to="myapps" className="brand" aria-label="Tanflow home">
        <img className="brand-logo" src={wordmark} alt="Tanflow" />
      </NavLink>
      <span className="brand-sub">Identity &amp; Access Management</span>

      <div className="top-actions">
        <button className="top-btn" title="Notifications" onClick={() => navigate('notifications')} aria-label="Notifications">
          <Icon name="bell" />
          {unread > 0 && <span className="top-btn-dot" />}
        </button>
        <div className="top-div" />
        <button className="top-user" onClick={(e) => setMenu({
          anchor: e.currentTarget,
          items: [
            { label: `${ME.username} · ${ME.roleLabel}`, header: true },
            { label: `Last Login: ${ME.lastLogin}`, header: true },
            { id: 'pw', label: 'Change password', icon: 'lock', onSelect: () => toast('info', 'Change password', 'Opens the credential change dialog.') },
            { id: 'settings', label: 'Settings', icon: 'config', onSelect: () => navigate('settings') },
            { divider: true },
            { id: 'out', label: 'Log Out', icon: 'power', danger: true, onSelect: () => toast('info', 'Log out', 'Session termination is disabled in the prototype.') },
          ],
        })}>
          <span className="top-user-meta">
            <span className="top-user-name">{ME.firstName} {ME.lastName}</span>
            <span className="top-user-role">{ME.roleLabel}</span>
          </span>
          <Avatar first={ME.firstName} last={ME.lastName} />
        </button>
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </header>
  )
}
