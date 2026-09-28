import { useEffect } from 'react'
import wordmarkDark from '../../assets/tanflow-wordmark-dark.png'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'

/**
 * The boot screen.
 *
 * A boot panel that is rendered *by* the tree it is supposed to be covering can
 * never do its job: React commits the shell and the panel together at best, and
 * — if the panel waits on an effect to decide whether to appear — it drops onto
 * a console that has already been painted, which is a worse thing to look at
 * than no panel at all. So the panel is not part of the React tree. It is built
 * and put into the document while this module is being evaluated, which happens
 * while `main.jsx` is still working its way down to `createRoot(...).render()`,
 * before a single element of the console exists. The component exported below
 * renders nothing; its only job is to take the panel away, because the frame on
 * which it mounts *is* the frame the console arrived on.
 *
 * The one thing this cannot cover is the bundle download itself — nothing
 * written in JavaScript can, because it has to arrive before it can run. The
 * only complete fix is a small block of markup and critical CSS inside
 * `index.html`, painted on the first HTML parse and removed by `dismiss()`
 * here; that file is outside this module's ownership, so the panel is built as
 * early as JavaScript allows instead, and the decision about whether to show it
 * at all is made below so that the gap it cannot cover is not billed to the
 * reader twice.
 *
 * Two rules keep it from ever being a flicker or a tax:
 *
 *  - It is revealed only from an animation frame that was painted while `#root`
 *    was still empty, and only once DELAY has passed since it was built. A
 *    console that comes up quickly, and a console whose first render blocks the
 *    main thread so hard that no frame is produced until the shell is ready,
 *    both take the panel down again without it ever having been drawn.
 *  - There is no minimum visible time. Once the shell has painted, the panel
 *    starts leaving on that frame. The fade that follows is `pointer-events:
 *    none` and the console beneath it is already live, so the dissolve costs
 *    the reader nothing — unlike a hold, which is latency over a working app.
 */

/* Measured from the moment the panel is built, not from the navigation: the
   time already spent fetching the bundle is spent whatever this file does, and
   counting it would make the panel certain to appear on exactly the loads where
   it has the least left to cover. */
const DELAY = 200
const FADE = 260
/* If `App` returns before it reaches <BootLoader /> — the recertification link
   and self-enrolment routes both do — nothing else would clear the panel. It is
   `visibility:hidden` until revealed, so this is tidying, not a rescue. */
const FAILSAFE = 6000

let panel = null
let born = 0
let revealed = false
let finished = false

function add(tag, cls, parent) {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (parent) parent.appendChild(node)
  return node
}

/* A cold document is one the console has never been painted into. Vite
   re-evaluates this module on every hot update, and a second panel dropped over
   a running console is precisely the failure this file exists to avoid. */
function cold() {
  if (typeof document === 'undefined' || !document.body) return false
  if (document.querySelector('.boot')) return false
  const root = document.getElementById('root')
  return !root || !root.firstChild
}

function build() {
  /* The theme is read off the document rather than the store: index.html
     applies the stored theme before the first paint, and this panel is built
     before the provider that would answer the question exists. */
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  const el = add('div', 'boot')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  const card = add('div', 'boot-card', el)
  const mark = add('img', 'boot-mark', card)
  mark.src = dark ? wordmarkWhite : wordmarkDark
  mark.alt = 'Tanflow'
  add('p', 'boot-sub', card).textContent = 'Identity & Access Management'
  /* The bar is a sense of progress rather than a measurement of one, so it is
     drawn for the eye and hidden from the reader the console is being read
     aloud to, who is told what is happening by the line below it. It is also
     driven entirely from CSS, on a transform: a width stepped from a timer
     would freeze for exactly as long as the first React render blocks the main
     thread, which is the part of the boot it is there to sit through. */
  const bar = add('div', 'boot-bar', card)
  bar.setAttribute('aria-hidden', 'true')
  add('span', 'boot-fill', bar)
  add('p', 'boot-note', card).textContent = 'Starting the console'
  document.body.appendChild(el)
  return el
}

/* Reveal is a question about frames, not about the clock. If an animation frame
   is produced while `#root` is still empty, the reader is genuinely looking at
   nothing and the panel has something to do; if the first frame of the load is
   also the frame that paints the console, it has not, and it stays hidden. */
function watch() {
  if (finished || revealed || !panel) return
  const root = document.getElementById('root')
  if (root && root.firstChild) return
  if (performance.now() - born >= DELAY) {
    revealed = true
    panel.setAttribute('data-visible', 'true')
    return
  }
  requestAnimationFrame(watch)
}

function dismiss() {
  if (finished) return
  finished = true
  const node = panel
  panel = null
  if (!node) return
  // Never drawn, so there is nothing to dissolve and nothing was seen.
  if (!revealed) { node.remove(); return }
  node.setAttribute('data-hiding', 'true')
  setTimeout(() => node.remove(), FADE + 80)
}

if (typeof document !== 'undefined' && cold()) {
  born = performance.now()
  panel = build()
  requestAnimationFrame(watch)
  setTimeout(dismiss, FAILSAFE)
}

export default function BootLoader() {
  /* "Booted" is the shell being on the glass. This effect runs after the commit
     that put it there, and one more frame passes before the browser has painted
     it — that is the whole of the wait. There is no font to settle for:
     `@font-face` appears nowhere in this project, so `document.fonts.ready`
     resolves immediately and waiting on it only bought a promise tick and two
     timeouts to bound it. */
  useEffect(() => {
    let outer = 0
    let inner = 0
    outer = requestAnimationFrame(() => { inner = requestAnimationFrame(dismiss) })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [])
  return null
}
