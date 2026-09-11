import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BASE, BY_PATH, DETAIL_ROUTES, LEGACY, pathFor } from '../data/nav'
import { useLocalState } from '../lib/useLocalState'
import { can as canWith, grantsFor, roleFor } from '../lib/access'

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

/**
 * Whether this browsing session has signed in.
 *
 * Session storage rather than local: the console is expected to open on its
 * sign-in screen, which it cannot do if a visit three weeks ago is still
 * counted as one. Reloading the tab keeps the session, closing it ends it —
 * the same contract a real console holds.
 */
const SESSION_KEY = 'tf-idam-session'

const readSession = () => {
  try { return sessionStorage.getItem(SESSION_KEY) === 'in' } catch { return false }
}

export function AppProvider({ children }) {
  const initial = resolve(window.location)
  const [signedIn, setSignedIn] = useState(readSession)
  /* Where the identity was heading before the gate stopped them. A deep link
     into the console survives the sign-in rather than dropping everyone on My
     Apps. */
  const [intended, setIntended] = useState(() => (initial.id === 'login' ? null : initial))
  /* Set for exactly one render pass after a sign-in, so the shell can raise the
     notification popup once rather than on every visit to a route. */
  const [greeted, setGreeted] = useState(false)
  const [route, setRoute] = useState(() => (readSession() ? initial.id : 'login'))
  const [segments, setSegments] = useState(() => (readSession() ? (initial.segments || []) : []))
  const [density, setDensity] = useLocalState('tf-idam-density', 'comfortable')
  /* Which role the console is being viewed as. Screens that fold an admin
     surface into a user-facing page read this to decide whether to offer it. */
  const [roleId, setRoleId] = useLocalState('tf-idam-roleid', 1)
  const [navMin, setNavMin] = useLocalState('tf-idam-navmin', false)
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  /* The notification popup. Shell state rather than the generic modal slot:
     it is raised by the sign-in and by the bell, and both have to be able to
     open it without displacing a dialog the operator already has open. */
  const [notifOpen, setNotifOpen] = useState(false)
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')
  const [toasts, setToasts] = useState([])
  const [drawer, setDrawer] = useState(null)
  const [modal, setModal] = useState(null)
  const seq = useRef(0)

  /* The address bar follows the gate: a visitor who has not signed in sits on
     /iam/login whatever they typed, and the route they asked for is held in
     `intended` until they do. */
  useEffect(() => {
    const path = signedIn ? initial.path : `${BASE}/login`
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path + (signedIn ? window.location.search : ''))
    }
    // Only on mount: afterwards `navigate`, `signIn` and `signOut` own the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('tf-theme', theme) } catch { /* storage unavailable */ }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

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
    /* Back and forward cannot walk around the gate: a history entry from before
       the sign-out resolves to the login screen, and the route it named is
       remembered for the next successful sign-in. */
    const onPop = () => {
      const next = resolve(window.location)
      if (!signedIn) {
        setIntended(next.id === 'login' ? null : next)
        setRoute('login')
        setSegments([])
        return
      }
      setRoute(next.id)
      setSegments(next.segments || [])
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [signedIn])

  const signIn = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, 'in') } catch { /* storage unavailable */ }
    setSignedIn(true)
    setGreeted(true)
    const target = intended && intended.id !== 'login' ? intended : null
    setRoute(target ? target.id : 'myapps')
    setSegments(target ? (target.segments || []) : [])
    const path = target ? target.path : `${BASE}/myapps`
    if (window.location.pathname !== path) window.history.replaceState(null, '', path)
    setIntended(null)
  }, [intended])

  const signOut = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* storage unavailable */ }
    setSignedIn(false)
    setGreeted(false)
    setIntended(null)
    setDrawer(null)
    setModal(null)
    setNavOpen(false)
    setPaletteOpen(false)
    setNotifOpen(false)
    setRoute('login')
    setSegments([])
    if (window.location.pathname !== `${BASE}/login`) {
      window.history.pushState(null, '', `${BASE}/login`)
    }
  }, [])

  /** Consumed by the shell once the sign-in greeting has been shown. */
  const clearGreeting = useCallback(() => setGreeted(false), [])

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback((tone, title, body) => {
    seq.current += 1
    const id = seq.current
    setToasts((t) => [...t, { id, tone, title, body }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4600)
    return id
  }, [])

  const grants = useMemo(() => grantsFor(roleId), [roleId])
  const role = useMemo(() => roleFor(roleId), [roleId])
  const can = useCallback((module, perm) => canWith(grants, module, perm), [grants])

  const confirm = useCallback((cfg) => setModal({ kind: 'confirm', tone: 'bad', ...cfg }), [])
  const closeOverlays = useCallback(() => {
    setDrawer(null)
    setModal(null)
    setNotifOpen(false)
  }, [])

  const value = useMemo(() => ({
    route, segments, navigate,
    signedIn, signIn, signOut, greeted, clearGreeting,
    notifOpen, setNotifOpen,
    density, setDensity,
    roleId, setRoleId, role, grants, can,
    navMin, setNavMin, navOpen, setNavOpen,
    paletteOpen, setPaletteOpen,
    theme, toggleTheme,
    toasts, toast, dismissToast,
    drawer, setDrawer, modal, setModal, confirm,
    closeOverlays,
  }), [route, segments, navigate, signedIn, signIn, signOut, greeted, clearGreeting, notifOpen,
    density, setDensity, roleId, setRoleId, role, grants, can, navMin, setNavMin,
    navOpen, paletteOpen, theme, toggleTheme,
    toasts, toast, dismissToast, drawer, modal, confirm, closeOverlays])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
