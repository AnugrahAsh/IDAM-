import { useEffect, useRef, useState } from 'react'

// The bar pins to the bottom of the canvas. While there is still content
// underneath it, it is floating over that content and needs an edge to read
// against; once the page is scrolled to the end it is simply the last row and
// the lift would be noise. Same data-stuck convention as .pagebar.
export default function StickyActions({ dirty, message, children }) {
  const ref = useRef(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const scroller = el.closest('.canvas')
    if (!scroller) return undefined
    const sync = () => {
      const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
      setStuck(!atEnd)
    }
    sync()
    scroller.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(scroller)
    return () => {
      scroller.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="sticky-actions" ref={ref} data-dirty={dirty || undefined} data-stuck={stuck || undefined}>
      <span className="sticky-msg">
        <span className="sticky-dot" aria-hidden="true" />
        {message}
      </span>
      <span className="spacer" />
      {children}
    </div>
  )
}
