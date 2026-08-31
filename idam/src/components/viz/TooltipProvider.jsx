import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'

const TipCtx = createContext({ showTip: () => {}, hideTip: () => {} })
export const useTip = () => useContext(TipCtx)

// Exactly one tooltip node for the whole app. Charts call showTip/hideTip;
// the node flips to the opposite side of the cursor near a viewport edge.
export default function TooltipProvider({ children }) {
  const [tip, setTip] = useState(null)
  const ref = useRef(null)

  const showTip = useCallback((x, y, content) => setTip({ x, y, content }), [])
  const hideTip = useCallback(() => setTip(null), [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !tip) return
    const pad = 12
    const r = el.getBoundingClientRect()
    let left = tip.x + 14
    let top = tip.y + 14
    if (left + r.width > window.innerWidth - pad) left = tip.x - r.width - 14
    if (top + r.height > window.innerHeight - pad) top = tip.y - r.height - 14
    el.style.left = `${Math.max(pad, left)}px`
    el.style.top = `${Math.max(pad, top)}px`
  }, [tip])

  return (
    <TipCtx.Provider value={{ showTip, hideTip }}>
      {children}
      <div ref={ref} className={`viz-tip${tip ? ' show' : ''}`} role="tooltip" aria-hidden={!tip}>
        {tip ? tip.content : null}
      </div>
    </TipCtx.Provider>
  )
}
