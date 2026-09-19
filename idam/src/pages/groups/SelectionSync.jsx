import { useEffect, useRef } from 'react'

export default function SelectionSync({ ids, clear, onSync }) {
  const key = ids.join(',')
  const latest = useRef({ ids, clear })
  latest.current = { ids, clear }
  useEffect(() => {
    onSync(latest.current.ids, latest.current.clear)
    return () => onSync([], null)
  }, [key, onSync])
  return null
}

