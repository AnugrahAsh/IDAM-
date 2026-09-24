import { useCallback, useEffect, useRef } from 'react'
import { useApp } from '../store/AppContext'

/**
 * A download the operator can watch.
 *
 * A file the browser writes in a single tick still leaves the person who asked
 * for it with nothing to look at, and on a large report that reads as a stall.
 * The notice that announces the download carries a determinate bar and then
 * becomes the notice that reports the file — one line about one file, rather
 * than a second notice arriving beside the first.
 *
 * The file is written when the bar completes, so what is on screen and what is
 * on disk never disagree: a download that is still running has not written
 * anything yet, and one that reports a file has.
 */
export function useDownload() {
  const { toast, updateToast } = useApp()
  const live = useRef([])

  // A download outlives a click but not the page that started it.
  useEffect(() => () => {
    live.current.forEach(({ tick, end }) => { clearInterval(tick); clearTimeout(end) })
    live.current = []
  }, [])

  return useCallback(({ title = 'Preparing download', body, ms = 1500, write }) => {
    const id = toast('info', title, body, { progress: 3, sticky: true, icon: 'download' })
    const startedAt = Date.now()

    /* The bar stops just short of the end while the file is still being
       written: reaching 100% and then waiting is worse than not arriving. */
    const tick = setInterval(() => {
      updateToast(id, { progress: Math.min(95, Math.round(((Date.now() - startedAt) / ms) * 100)) })
    }, 110)

    const end = setTimeout(() => {
      clearInterval(tick)
      let done
      try {
        done = write ? write() : undefined
      } catch (e) {
        updateToast(id, {
          tone: 'bad',
          icon: 'warn',
          title: 'Download failed',
          body: e.message || 'The file could not be written.',
          progress: null,
          sticky: false,
        })
        return
      }
      updateToast(id, {
        tone: 'ok',
        icon: 'checkC',
        progress: 100,
        title: (done && done.title) || 'Download ready',
        body: (done && done.body) || body,
        sticky: false,
      })
    }, ms)

    live.current.push({ tick, end })
    return id
  }, [toast, updateToast])
}
