import { Suspense, lazy, useMemo } from 'react'
import TopBar from './components/shell/TopBar'
import Sidebar from './components/shell/Sidebar'
import Toasts from './components/shell/Toasts'
import StatusBar from './components/shell/StatusBar'
import CommandPalette from './components/shell/CommandPalette'
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
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'))
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'))
const HierarchyPage = lazy(() => import('./pages/HierarchyPage'))
const OrphanedPage = lazy(() => import('./pages/OrphanedPage'))
const RequestsPage = lazy(() => import('./pages/RequestsPage'))
const AuthenticationPage = lazy(() => import('./pages/AuthenticationPage'))
const PasswordPolicyPage = lazy(() => import('./pages/PasswordPolicyPage'))
const JobsPage = lazy(() => import('./pages/JobsPage'))
const LicensePage = lazy(() => import('./pages/LicensePage'))
const LdapApplicationsPage = lazy(() => import('./pages/LdapApplicationsPage'))
const SsoConfigurationsPage = lazy(() => import('./pages/SsoConfigurationsPage'))

const PAGES = {
  notifications: NotificationsPage,
  users: DirectoryPage,
  organizations: OrganizationsPage,
  roles: RolesPage,
  approvals: ApprovalsPage,
  organizationHierarchy: HierarchyPage,
  orphanedpolicy: OrphanedPage,
  requests: RequestsPage,
  mfa: AuthenticationPage,
  ldapapplications: LdapApplicationsPage,
  passwordPolicy: PasswordPolicyPage,
  jobs: JobsPage,
  ssoConfigurations: SsoConfigurationsPage,
  licenses: LicensePage,
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
    closeOverlays, paletteOpen, setPaletteOpen, can, role, navigate } = useApp()

  useHotkeys(useMemo(() => ({
    'mod+k': () => setPaletteOpen((v) => !v),
    escape: () => { setPaletteOpen(false); setNavOpen(false); closeOverlays() },
  }), [closeOverlays, setPaletteOpen, setNavOpen]))

  const Page = PAGES[route] || PlaceholderPage
  /* Hiding a link is not access control: the route was still reachable by URL
     while the console was being viewed as a role that holds nothing for it. */
  const routeModule = moduleFor(route)
  const allowed = !routeModule || can(routeModule)

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
    </div>
  )
}
