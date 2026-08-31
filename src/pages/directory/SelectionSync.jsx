import { useEffect } from 'react'

export default function SelectionSync({ ids, onSync }) {
  const key = ids.join(',')
  useEffect(() => {
    onSync(key === '' ? [] : key.split(','))
    return () => onSync([])
  }, [key, onSync])
  return null
}

