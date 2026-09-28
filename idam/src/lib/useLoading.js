import { useEffect, useState } from 'react'

/**
 * The settling period a screen holds its skeleton for.
 *
 * The console has no backend: the seed is a module the bundle already carries,
 * so a register resolves in the same tick it mounts and a skeleton drawn
 * against it would never be seen. This is the one honest lie in the build — a
 * deliberate pause that puts the loading state on screen where a real API would
 * have put it.
 *
 * The number is the whole argument for the file existing. Below about 250ms the
 * skeleton flashes and reads as a rendering fault; above about 700ms it stops
 * reading as loading and starts reading as a slow product. It lives here, once,
 * so the whole console settles at the same rate and the rate is one edit away
 * from being changed or removed.
 */
export const SETTLE_MS = 420

/**
 * Reports `true` for the settling period on mount, and again whenever `key`
 * changes — a record id, a tab, a filter that a real deployment would have
 * gone back to the server for.
 *
 * `key` should be a primitive. An object or array rebuilt on every render is a
 * new value each time and would restart the wait forever.
 */
export function useLoading(key = null, ms = SETTLE_MS) {
  const [loading, setLoading] = useState(ms > 0)

  useEffect(() => {
    if (ms <= 0) {
      setLoading(false)
      return undefined
    }
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(timer)
  }, [key, ms])

  return loading
}
