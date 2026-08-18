import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BASE, BY_PATH, DETAIL_ROUTES, LEGACY, pathFor } from '../data/nav'
import { useLocalState } from '../lib/useLocalState'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

function resolve(loc) {
  let path = loc.pathname.replace(/\/+$/, '') || BASE
  if (loc.hash && loc.hash.length > 1) {
    const legacyHash = `${BASE}/${loc.hash.replace(/^#/, '')}`
    if (BY_PATH[legacyHash] || LEGACY[legacyHash]) path = legacyHash
  }
  if (!path.startsWith(BASE)) path = BASE
  const mapped = LEGACY[path] || path

  const exact = BY_PATH[mapped]
  if (exact) return { id: exact.id, path: mapped, segments: [] }

  const parent = DETAIL_ROUTES.find((r) => mapped.startsWith(r.path + '/'))
  if (parent) {
    const rest = mapped.slice(parent.path.length + 1)
    return { id: parent.id, path: mapped, segments: rest.split('/').filter(Boolean) }
  }
  return { id: 'myapps', path: `${BASE}/myapps`, segments: [] }
}

export function AppProvider({ children }) {
  const initial = resolve(window.location)
  const [route, setRoute] = useState(initial.id)
  const [segments, setSegments] = useState(initial.segments || [])
  const [density, setDensity] = useLocalState('tf-idam-density', 'comfortable')
  const [navMin, setNavMin] = useLocalState('tf-idam-navmin', false)
  const [navOpen, setNavOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [drawer, setDrawer] = useState(null)
  const [modal, setModal] = useState(null)
  const seq = useRef(0)

  useEffect(() => {
    if (window.location.pathname !== initial.path) {
      window.history.replaceState(null, '', initial.path + window.location.search)
    }
  }, [initial.path])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  const navigate = useCallback((id, opts = {}) => {
    const path = typeof id === 'string' && id.startsWith('/') ? id : pathFor(id)
    const resolved = resolve({ pathname: path, hash: '' })
    setRoute(resolved.id)
    setSegments(resolved.segments || [])
    setNavOpen(false)
    setDrawer(null)
    setModal(null)
    if (window.location.pathname !== resolved.path) {
      if (opts.replace) window.history.replaceState(null, '', resolved.path)
      else window.history.pushState(null, '', resolved.path)
    }
    const canvas = document.querySelector('.canvas')
    if (canvas) canvas.scrollTop = 0
  }, [])

  useEffect(() => {
    const onPop = () => {
      const next = resolve(window.location)
      setRoute(next.id)
      setSegments(next.segments || [])
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [])

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback((tone, title, body) => {
    seq.current += 1
    const id = seq.current
    setToasts((t) => [...t, { id, tone, title, body }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4600)
    return id
  }, [])

  const confirm = useCallback((cfg) => setModal({ kind: 'confirm', tone: 'bad', ...cfg }), [])
  const closeOverlays = useCallback(() => {
    setDrawer(null)
    setModal(null)
  }, [])

  const value = useMemo(() => ({
    route, segments, navigate,
    density, setDensity,
    navMin, setNavMin, navOpen, setNavOpen,
    toasts, toast, dismissToast,
    drawer, setDrawer, modal, setModal, confirm,
    closeOverlays,
  }), [route, segments, navigate, density, setDensity, navMin, setNavMin,
    navOpen, toasts, toast, dismissToast, drawer, modal, confirm, closeOverlays])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
