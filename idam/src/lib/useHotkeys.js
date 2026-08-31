import { useEffect } from 'react'

const isTyping = () => {
  const el = document.activeElement
  return !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
}

export function useHotkeys(handlers) {
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && handlers[`mod+${key}`]) {
        e.preventDefault()
        handlers[`mod+${key}`](e)
        return
      }
      if (key === 'escape' && handlers.escape) {
        handlers.escape(e)
        return
      }
      if (isTyping()) return
      if (handlers[key]) {
        e.preventDefault()
        handlers[key](e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
