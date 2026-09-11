import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import TopBar from './components/shell/TopBar'
import Sidebar from './components/shell/Sidebar'
import Toasts from './components/shell/Toasts'
import StatusBar from './components/shell/StatusBar'
import CommandPalette from './components/shell/CommandPalette'
import NotificationPopup from './components/shell/NotificationPopup'
import { TITLES, moduleFor } from './data/nav'
import RouteBoundary from './components/shell/RouteBoundary'
import EmptyState from './components/primitives/EmptyState'
import Button from './components/primitives/Button'
import Drawer from './components/primitives/Drawer'
import Modal from './components/primitives/Modal'
import { SkeletonTable } from './components/primitives/Skeleton'
import PlaceholderPage from './pages/PlaceholderPage'
import { useApp } from './store/AppContext'
import { useHotkeys } from './lib/useHotkeys'


// Every route is its own chunk: opening the console downloads the shell and the
// page being viewed, not all forty-seven screens.
const MyAppsPage = lazy(() => import('./pages/MyAppsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const UsefulLinksPage = lazy(() => import('./pages/UsefulLinksPage'))
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'))
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'))
const HierarchyPage = lazy(() => import('./pages/HierarchyPage'))
const OrphanedPage = lazy(() => import('./pages/OrphanedPage'))
const RequestsPage = lazy(() => import('./pages/RequestsPage'))
const AuthenticationPage = lazy(() => import('./pages/AuthenticationPage'))
const ReconciliationPage = lazy(() => import('./pages/ReconciliationPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const PasswordPolicyPage = lazy(() => import('./pages/PasswordPolicyPage'))
const JobsPage = lazy(() => import('./pages/JobsPage'))
const LogsPage = lazy(() => import('./pages/LogsPage'))
const LicensePage = lazy(() => import('./pages/LicensePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LdapApplicationsPage = lazy(() => import('./pages/LdapApplicationsPage'))

const PAGES = {
  myapps: MyAppsPage,
  notifications: NotificationsPage,
  usefullinks: UsefulLinksPage,
  users: DirectoryPage,
  organizations: OrganizationsPage,
  roles: RolesPage,
  approvals: ApprovalsPage,
  organizationHierarchy: HierarchyPage,
  orphanedpolicy: OrphanedPage,
  requests: RequestsPage,
  mfa: AuthenticationPage,
  trustReconciliation: ReconciliationPage,
  reports: ReportsPage,
  passwordPolicy: PasswordPolicyPage,
  jobs: JobsPage,
  syslogs: LogsPage,
  licenses: LicensePage,
  settings: SettingsPage,
  ldapapplications: LdapApplicationsPage,
}

// Shown only while a route's chunk is in flight — long enough to notice on a
// cold load, invisible on a warm one.
function PageFallback() {
  return (
    <div className="page-fallback" role="status" aria-live="polite">
      <SkeletonTable rows={6} cols={5} />
    </div>
  )
}

export default function App() {
  const { route, segments, navMin, navOpen, setNavOpen, drawer, setDrawer, modal, setModal,
    closeOverlays, paletteOpen, setPaletteOpen, can, role, navigate,
    signedIn, signIn, greeted, clearGreeting, notifOpen, setNotifOpen } = useApp()
  /* Whether the popup currently on screen is the one raised by the sign-in.
     It opens on Unread and says "Welcome back" in that case, and neither is
     right when the bell was pressed deliberately. */
  const [greetingPopup, setGreetingPopup] = useState(false)

  /* The sign-in greeting. `greeted` is set once by signIn() and cleared here,
     so the popup is raised on entering the console and not again on every
     route change inside it. */
  useEffect(() => {
    if (!greeted) return
    setGreetingPopup(true)
    setNotifOpen(true)
    clearGreeting()
  }, [greeted, clearGreeting, setNotifOpen])

  /* The sign-in screen is not part of this packet. A session that has not
     signed in (a first visit, or one that pressed Log Out) is signed in on
     arrival instead: it lands where the address bar points, My Apps by
     default, and raises the same greeting a real sign-in does. The timeout
     lets the provider settle the address bar on mount before signIn()
     rewrites it. */
  useEffect(() => {
    if (signedIn && route !== 'login') return undefined
    const t = setTimeout(signIn, 0)
    return () => clearTimeout(t)
  }, [signedIn, route, signIn])

  useHotkeys(useMemo(() => ({
    'mod+k': () => setPaletteOpen((v) => !v),
    escape: () => { setPaletteOpen(false); setNavOpen(false); closeOverlays() },
  }), [closeOverlays, setPaletteOpen, setNavOpen]))

  const Page = PAGES[route] || PlaceholderPage
  /* Hiding a link is not access control: the route was still reachable by URL
     while the console was being viewed as a role that holds nothing for it. */
  const routeModule = moduleFor(route)
  const allowed = !routeModule || can(routeModule)

  /* The gate. Not merely "the login route is showing": a session that has not
     signed in cannot render the console whatever the address bar says. Nothing
     renders here for the one tick before the effect above signs it in. */
  if (!signedIn || route === 'login') {
    return <Toasts />
  }

  return (
    <div className="app" data-nav={navMin ? 'min' : undefined} data-nav-open={navOpen || undefined}>
      <a className="skip" href="#main">Skip to main content</a>
      <TopBar />
      {/* Mobile nav drawer needs a dismissable backdrop — without it the drawer
          reads as broken because tapping outside does nothing. */}
      {navOpen && (
        <div
          className="nav-scrim"
          role="presentation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <Sidebar />
      <main className="main">
        <div className="canvas" id="main">
          <div className="canvas-inner">
            <RouteBoundary route={route} key={route}>
              <Suspense fallback={<PageFallback />}>
                {allowed
                  ? <Page route={route} segments={segments} />
                  : (
                    <EmptyState
                      icon="noentry"
                      title={`${role.name} cannot open ${TITLES[route] || 'this module'}`}
                      body="The console is being viewed as a role that holds no permission for this module. Switch back from the account menu to reach it."
                      actions={<Button variant="pri" icon="apps" onClick={() => navigate('myapps')}>Go to My Apps</Button>}
                    />
                  )}
              </Suspense>
            </RouteBoundary>
          </div>
        </div>
      </main>
      <StatusBar />
      <Toasts />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {drawer && <Drawer {...drawer} onClose={() => setDrawer(null)} />}
      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
      {notifOpen && (
        <NotificationPopup
          greeting={greetingPopup}
          onClose={() => { setNotifOpen(false); setGreetingPopup(false) }}
        />
      )}
    </div>
  )
}
