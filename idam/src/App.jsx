import { useMemo } from 'react'
import TopBar from './components/shell/TopBar'
import Sidebar from './components/shell/Sidebar'
import Toasts from './components/shell/Toasts'
import AppFooter from './components/shell/AppFooter'
import Drawer from './components/primitives/Drawer'
import Modal from './components/primitives/Modal'
import PlaceholderPage from './pages/PlaceholderPage'
import { useApp } from './store/AppContext'
import { useHotkeys } from './lib/useHotkeys'

import MyAppsPage from './pages/MyAppsPage'
import DirectoryPage from './pages/DirectoryPage'
import OrganizationsPage from './pages/OrganizationsPage'
import RolesPage from './pages/RolesPage'
import AuthenticationPage from './pages/AuthenticationPage'
import ReportsPage from './pages/ReportsPage'
import JobsPage from './pages/JobsPage'
import LicensePage from './pages/LicensePage'
import SsoConfigurationsPage from './pages/SsoConfigurationsPage'
import EmailManagementPage from './pages/EmailManagementPage'
import SmsManagementPage from './pages/SmsManagementPage'

const PAGES = {
  myapps: MyAppsPage,
  users: DirectoryPage,
  mfa: AuthenticationPage,
  organizations: OrganizationsPage,
  roles: RolesPage,
  ssoConfigurations: SsoConfigurationsPage,
  reports: ReportsPage,
  jobs: JobsPage,
  emails: EmailManagementPage,
  sms: SmsManagementPage,
  licenses: LicensePage,
}

export default function App() {
  const { route, segments, navMin, navOpen, drawer, setDrawer, modal, setModal, closeOverlays } = useApp()

  useHotkeys(useMemo(() => ({
    escape: () => closeOverlays(),
  }), [closeOverlays]))

  const Page = PAGES[route] || PlaceholderPage

  return (
    <div className="app" data-nav={navMin ? 'min' : undefined} data-nav-open={navOpen || undefined}>
      <a className="skip" href="#main">Skip to main content</a>
      <TopBar />
      <Sidebar />
      <main className="main">
        <div className="canvas" id="main">
          <div className="canvas-inner">
            <Page route={route} segments={segments} key={route} />
          </div>
        </div>
        <AppFooter />
      </main>
      <Toasts />
      {drawer && <Drawer {...drawer} onClose={() => setDrawer(null)} />}
      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  )
}
