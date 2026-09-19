import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import TopBar from './components/shell/TopBar'
import Sidebar from './components/shell/Sidebar'
import Toasts from './components/shell/Toasts'
import StatusBar from './components/shell/StatusBar'
import CommandPalette from './components/shell/CommandPalette'
import NotificationPopup from './components/shell/NotificationPopup'
import { TITLES, isRecertifyLinkPath, moduleFor } from './data/nav'
import RouteBoundary from './components/shell/RouteBoundary'
import EmptyState from './components/primitives/EmptyState'
import Button from './components/primitives/Button'
import Drawer from './components/primitives/Drawer'
import Modal from './components/primitives/Modal'
import { SkeletonTable } from './components/primitives/Skeleton'
import PlaceholderPage from './pages/placeholder/PlaceholderPage'
import { useApp } from './store/AppContext'
import { useHotkeys } from './lib/useHotkeys'


// Every route is its own chunk: opening the console downloads the shell and the
// page being viewed, not all forty-seven screens.
const MyAppsPage = lazy(() => import('./pages/myApps/MyAppsPage'))
const NotificationsPage = lazy(() => import('./pages/notificationCenter/NotificationsPage'))
const UsefulLinksPage = lazy(() => import('./pages/quickLinks/UsefulLinksPage'))
const DirectoryPage = lazy(() => import('./pages/users/DirectoryPage'))
const OrganizationsPage = lazy(() => import('./pages/organizations/OrganizationsPage'))
const RolesPage = lazy(() => import('./pages/roles/RolesPage'))
const ApprovalsPage = lazy(() => import('./pages/approvals/ApprovalsPage'))
const HierarchyPage = lazy(() => import('./pages/organizationStructure/HierarchyPage'))
const OrphanedPage = lazy(() => import('./pages/orphanAccounts/OrphanedPage'))
const RequestsPage = lazy(() => import('./pages/accessRequests/RequestsPage'))
const AuthenticationPage = lazy(() => import('./pages/multiFactorAuthentication/AuthenticationPage'))
const PoliciesPage = lazy(() => import('./pages/dynamicPolicies/PoliciesPage'))
const SodPage = lazy(() => import('./pages/segregationOfDuties/SodPage'))
const ReconciliationPage = lazy(() => import('./pages/trustReconciliation/ReconciliationPage'))
const NetworkPolicyPage = lazy(() => import('./pages/networkAccessPolicies/NetworkPolicyPage'))
const SchedulersPage = lazy(() => import('./pages/schedulers/SchedulersPage'))
const RecertificationPage = lazy(() => import('./pages/recertification/RecertificationPage'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))
const PasswordPolicyPage = lazy(() => import('./pages/passwordPolicy/PasswordPolicyPage'))
const JobsPage = lazy(() => import('./pages/backgroundJobs/JobsPage'))
const ConfigurationsPage = lazy(() => import('./pages/configurations/ConfigurationsPage'))
const LogsPage = lazy(() => import('./pages/securityEvents/LogsPage'))
const LicensePage = lazy(() => import('./pages/license/LicensePage'))
const ProfilePage = lazy(() => import('./pages/myProfile/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const LdapApplicationsPage = lazy(() => import('./pages/ldapApplications/LdapApplicationsPage'))
const SsoConfigurationsPage = lazy(() => import('./pages/ssoConfigurations/SsoConfigurationsPage'))
const EmailManagementPage = lazy(() => import('./pages/emailManagement/EmailManagementPage'))
const SmsManagementPage = lazy(() => import('./pages/smsManagement/SmsManagementPage'))
const EmailConfigurationPage = lazy(() => import('./pages/emailManagement/EmailConfigurationPage'))
const EmailTemplatesPage = lazy(() => import('./pages/emailManagement/EmailTemplatesPage'))
const SmsTemplatesPage = lazy(() => import('./pages/smsManagement/SmsTemplatesPage'))
const ConsentManagementPage = lazy(() => import('./pages/consentManagement/ConsentManagementPage'))
const ApplicationsPage = lazy(() => import('./pages/applications/ApplicationsPage'))
const GroupsPage = lazy(() => import('./pages/groups/GroupsPage'))
const SignOnPolicyPage = lazy(() => import('./pages/signOnPolicies/SignOnPolicyPage'))
const RecertifyLinkPage = lazy(() => import('./pages/recertification/RecertifyLinkPage'))

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
  dynamicPolicy: PoliciesPage,
  segregationofduties: SodPage,
  signOnPolicy: SignOnPolicyPage,
  applications: ApplicationsPage,
  trustReconciliation: ReconciliationPage,
  ipRestrictionPolicy: NetworkPolicyPage,
  schedulers: SchedulersPage,
  recertification: RecertificationPage,
  reports: ReportsPage,
  passwordPolicy: PasswordPolicyPage,
  jobs: JobsPage,
  configurations: ConfigurationsPage,
  syslogs: LogsPage,
  licenses: LicensePage,
  profile: ProfilePage,
  settings: SettingsPage,
  ldapapplications: LdapApplicationsPage,
  ssoConfigurations: SsoConfigurationsPage,
  emails: EmailManagementPage,
  emailManagement: EmailManagementPage,
  smsManagement: SmsManagementPage,
  emailConfigurations: EmailConfigurationPage,
  emailTemplates: EmailTemplatesPage,
  sms: SmsManagementPage,
  smsTemplates: SmsTemplatesPage,
  consent: ConsentManagementPage,
  groups: GroupsPage,
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

  // The sign-in page is outside this packet. Preserve deep links while starting
  // a demo session, including after Log Out; public review links stay public.
  useEffect(() => {
    if (isRecertifyLinkPath(window.location.pathname) || (signedIn && route !== 'login')) return undefined
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

  /* A recertification email link is answered by a reviewer who may hold no
     console session, so it renders ahead of the gate and without the shell. */
  if (isRecertifyLinkPath(window.location.pathname)) {
    return (
      <>
        <Suspense fallback={<PageFallback />}>
          <RecertifyLinkPage />
        </Suspense>
        <Toasts />
        {drawer && <Drawer {...drawer} onClose={() => setDrawer(null)} />}
        {modal && <Modal {...modal} onClose={() => setModal(null)} />}
      </>
    )
  }

  /* A pending demo sign-in does not render the console. */
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
