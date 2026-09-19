import { useEffect, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Tag from '../../components/primitives/Tag'
import PageBar from '../../components/shell/PageBar'
import { useApp } from '../../store/AppContext'

/**
 * One end-user surface (sign-in, MFA, error pages…) as a set of screens.
 *
 * The list on the left is every screen the surface has; the stage on the right
 * renders the selected one live, in the sign-in theme. Screens are wired to
 * each other through `go`, so the stage walks the real flow, and each screen
 * also has its own address so a state can be linked to directly.
 */
export default function ScreenGallery({
  base, title, sub, screens, segments = [], stage = 'auth', renderFrame,
}) {
  const { navigate, toast } = useApp()
  const [full, setFull] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const current = screens.find((s) => s.id === segments[0]) || screens[0]

  const go = (id) => navigate(`${base}/${id}`, { replace: true })

  useEffect(() => {
    if (!full) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setFull(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [full])

  const groups = []
  screens.forEach((s) => {
    const g = s.group || 'Screens'
    let entry = groups.find((x) => x.name === g)
    if (!entry) { entry = { name: g, items: [] }; groups.push(entry) }
    entry.items.push(s)
  })

  const ctx = { go, toast, restart: () => setRunKey((k) => k + 1) }
  const body = current.render(ctx)
  const stageEl = (
    <div className={`xp-stage xp-stage-${current.stage || stage}`} key={`${current.id}-${runKey}`}>
      {renderFrame ? renderFrame(current, body) : body}
    </div>
  )
  const index = screens.indexOf(current)

  return (
    <>
      <PageBar
        title={title}
        sub={sub}
        crumbs={[{ label: 'Additional Pages' }, { label: title }]}
        actions={(
          <>
            <Button icon="chevL" disabled={index <= 0} onClick={() => go(screens[index - 1].id)}>Previous</Button>
            <Button iconRight="chevR" disabled={index >= screens.length - 1} onClick={() => go(screens[index + 1].id)}>Next</Button>
            <Button variant="pri" icon="monitor" onClick={() => setFull(true)}>Full screen</Button>
          </>
        )}
      />

      <div className="xp-layout">
        <Card title="Screens" sub={`${screens.length} in this set`} flush className="xp-list-card">
          <nav className="xp-list" aria-label={`${title} screens`}>
            {groups.map((g) => (
              <div key={g.name} className="xp-list-group">
                <div className="xp-list-h">{g.name}</div>
                {g.items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="xp-list-it"
                    data-on={s.id === current.id || undefined}
                    aria-current={s.id === current.id ? 'page' : undefined}
                    onClick={() => go(s.id)}
                  >
                    <span className="xp-list-n">{screens.indexOf(s) + 1}</span>
                    <span className="xp-list-m">
                      <span className="xp-list-t">{s.label}</span>
                      {s.state && <span className="xp-list-s">{s.state}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </Card>

        <Card
          flush
          className="xp-preview"
          title={current.label}
          sub={current.note}
          actions={(
            <>
              {current.path && <Tag><span className="mono">{current.path}</span></Tag>}
              <IconButton icon="refresh" size="sm" label="Reset this screen" onClick={ctx.restart} />
            </>
          )}
        >
          {full ? <div className="xp-stage xp-stage-idle"><span className="t-sm">Showing full screen</span></div> : stageEl}
        </Card>
      </div>

      {full && (
        <div className="xp-full" role="dialog" aria-modal="true" aria-label={`${current.label} — full screen`}>
          <div className="xp-full-bar">
            <span className="xp-full-t"><Icon name="monitor" size={14} />{title} · {current.label}</span>
            <span className="spacer" />
            <Button size="sm" icon="chevL" disabled={index <= 0} onClick={() => go(screens[index - 1].id)}>Previous</Button>
            <Button size="sm" iconRight="chevR" disabled={index >= screens.length - 1} onClick={() => go(screens[index + 1].id)}>Next</Button>
            <IconButton icon="x" label="Close full screen" onClick={() => setFull(false)} />
          </div>
          {stageEl}
        </div>
      )}
    </>
  )
}
