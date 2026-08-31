import { Suspense, lazy, useMemo } from 'react'
import TopBar from './components/shell/TopBar'
import Sidebar from './components/shell/Sidebar'
import Toasts from './components/shell/Toasts'
import StatusBar from './components/shell/StatusBar'
import CommandPalette from './components/shell/CommandPalette'
import RouteBoundary from './components/shell/RouteBoundary'
import Drawer from './components/primitives/Drawer'
import Modal from './components/primitives/Modal'
import { SkeletonTable } from './components/primitives/Skeleton'
import PlaceholderPage from './pages/PlaceholderPage'
import { useApp } from './store/AppContext'
import { useHotkeys } from './lib/useHotkeys'


// Every route is its own chunk: opening the console downloads the shell and the
// page being viewed, not all forty-seven screens.
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'))

// Users is the screen this packet delivers. Every other route in the navigation
// falls through to PlaceholderPage, which renders the route's own title over a
// "Screen in progress" card — the surfaces land in later packets.
const PAGES = {
  users: DirectoryPage,
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
    closeOverlays, paletteOpen, setPaletteOpen } = useApp()

  useHotkeys(useMemo(() => ({
    'mod+k': () => setPaletteOpen((v) => !v),
    escape: () => { setPaletteOpen(false); setNavOpen(false); closeOverlays() },
  }), [closeOverlays, setPaletteOpen, setNavOpen]))

  const Page = PAGES[route] || PlaceholderPage

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
                <Page route={route} segments={segments} />
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
