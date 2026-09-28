import { useState } from 'react'
import Icon from '../primitives/Icon'
import Avatar from '../primitives/Avatar'
import Menu from '../primitives/Menu'
import { useApp } from '../../store/AppContext'
import NavLink from './NavLink'
import { ME, ROLES } from '../../data/seed'
import { ROLE_OPTIONS } from '../../lib/access'
import wordmark from '../../assets/tanflow-wordmark-white.png'

const ACCOUNT_MENU_ID = 'tf-account-menu'

/* The scope a role is granted within, read off the register rather than
   restated here. A role row that names only the role leaves "Access Approver"
   ambiguous on a console where the same name is scoped per organization. */
const SCOPE = Object.fromEntries(ROLES.map((r) => [String(r.id), r.scope]))

/**
 * The account dropdown, shared by the header chip and the sidebar's kebab.
 *
 * Both chips used to print a role under the name, which is wrong on an identity
 * that holds more than one: the role moved in here, where the whole set fits,
 * the one in force is marked, and changing it is one keystroke rather than a
 * trip to another screen. Below the roles are the links an account menu
 * carries — My Profile, which left the navigation and now lives only here, and
 * the theme — and then the exit, set apart from everything above it.
 */
export function accountMenuItems({ role, roleId, setRoleId, can, theme, toggleTheme, navigate, toast, signOut }) {
  /* My Profile left the navigation, so this row is the only door to it, and it
     stays open. Greying it out put the reason in `title`, where it could never
     be read: a disabled row is `pointer-events:none`, so the browser never
     hovers it and the tooltip never fires, and the arrow keys skip disabled
     rows, so the keyboard never lands on it either. What the operator actually
     saw was a dead row and no explanation — the exact failure that greying it
     out was meant to prevent, on the one link this menu exists to carry.

     The reason now prints on the row itself, as its second line, before it is
     followed. Told in advance the reader is choosing; greyed out and silent
     they were guessing. The gate is unchanged — the module check still decides
     what the page renders, and it answers with the same sentence and an offer
     to switch back. */
  const ownProfile = can('My profile')
  return [
    {
      id: 'who',
      node: (
        <div className="acct-id">
          <Avatar first={ME.firstName} last={ME.lastName} size="lg" />
          <div className="acct-id-m">
            <span className="acct-name">{ME.firstName} {ME.lastName}</span>
            <span className="acct-user mono">@{ME.username.toLowerCase()}</span>
            <span className="acct-mail" title={ME.email}>{ME.email}</span>
          </div>
        </div>
      ),
    },
    { id: 'seen', node: <p className="acct-seen">Last sign-in {ME.lastLogin} · {ME.lastLoginRel}</p> },
    { divider: true },
    /* Every role the console may be acted with. Narrowing this to the primary
       role would read better and delete the only way to exercise the
       permission gate the pages and the navigation are built on, so the set
       stays whole and the row that is in force carries the tick. */
    { label: 'Roles', header: true },
    ...ROLE_OPTIONS.map((r) => ({
      id: `role-${r.id}`,
      label: r.name,
      desc: SCOPE[String(r.id)],
      checked: String(r.id) === String(roleId),
      onSelect: () => {
        setRoleId(r.id)
        toast('info', 'Role switched', `The console now renders what ${r.name} may reach.`)
      },
    })),
    { divider: true },
    {
      id: 'profile',
      label: 'My profile',
      icon: 'user',
      desc: ownProfile ? undefined : `${role.name} holds no permission for this module — switch role above to reach it.`,
      onSelect: () => navigate('profile'),
    },
    /* The one thing an operator opens their own profile to do, one row earlier.
       It lands on the tab that holds the form rather than on the profile's
       front page, because "change password" that arrives somewhere you then
       have to go looking is not the shortcut it claims to be. */
    {
      id: 'password',
      label: 'Change password',
      icon: 'lock',
      desc: ownProfile ? undefined : `${role.name} holds no permission for this module — switch role above to reach it.`,
      onSelect: () => navigate('/iam/profile/security'),
    },
    {
      id: 'theme',
      label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
      icon: theme === 'dark' ? 'sun' : 'moon',
      onSelect: toggleTheme,
    },
    { divider: true },
    {
      id: 'out',
      label: 'Log Out',
      icon: 'power',
      danger: true,
      onSelect: () => {
        signOut()
        toast('ok', 'Signed out', 'The session was ended. Sign in again to return to the console.')
      },
    },
  ]
}

export default function TopBar() {
  const { navigate, setNavOpen, toast, setPaletteOpen, theme, toggleTheme,
    role, roleId, setRoleId, can, signOut } = useApp()
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
        {/* Notifications, Reports and Settings each duplicated a navigation
            entry a few pixels to the left and left the bar. What stays is what
            has nowhere else to live: the theme. The account menu carries it too
            now, but a preference flipped this often earns a control of its own
            rather than two clicks behind a panel. */}
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
          aria-haspopup="menu"
          aria-expanded={!!menu}
          aria-controls={menu ? ACCOUNT_MENU_ID : undefined}
          onClick={(e) => setMenu(menu ? null : { anchor: e.currentTarget })}
        >
          <Avatar first={ME.firstName} last={ME.lastName} />
          {/* An avatar alone made the operator hover to learn who they were
              signed in as. The role that sat here has gone: an identity may
              hold several, only one of them was ever shown, and a truncated
              role name under a truncated user name read as a defect. Name and
              username stay — they are singular and they identify. */}
          <span className="top-user-m">
            <span className="top-user-n">{ME.firstName} {ME.lastName}</span>
            <span className="top-user-u">{ME.username}</span>
          </span>
          <Icon name="chevD" size={13} />
        </button>
      </div>

      {menu && (
        <Menu
          id={ACCOUNT_MENU_ID}
          anchor={menu.anchor}
          align="end"
          width={292}
          className="acct-menu"
          label={`Account menu for ${ME.firstName} ${ME.lastName}`}
          items={accountMenuItems({ role, roleId, setRoleId, can, theme, toggleTheme, navigate, toast, signOut })}
          onClose={() => setMenu(null)}
        />
      )}
    </header>
  )
}
