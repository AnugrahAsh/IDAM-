import { useMemo, useState } from 'react'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import Meter from '../../components/primitives/Meter'
import Tag from '../../components/primitives/Tag'
import Modal from '../../components/primitives/Modal'
import EmptyState from '../../components/primitives/EmptyState'
import { num } from '../../lib/format'
import { WRITE_PERMS, permBands } from '../../lib/permissions'

/* Groups one module's own permission list into its verb bands. */
const groupPerms = (perms) => permBands(perms)

const heldFor = (m, granted) => (granted[m.name] || []).filter((p) => m.perms.includes(p))

/**
 * Enterprise permission picker: a searchable module list, the selected module's
 * own permission checklist, and a running summary of everything granted so far.
 * Three panes at desktop width; the same three stacked once a pane can no
 * longer hold a permission name.
 */
export default function PermissionPicker({
  catalog = [],
  granted = {},
  readOnly = false,
  onToggle,
  onSetModule,
  note,
  maxHeight = 520,
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(() => (catalog[0] ? catalog[0].name : null))
  const needle = q.trim().toLowerCase()

  const visible = useMemo(() => catalog.filter((m) => !needle
    || m.name.toLowerCase().includes(needle)
    || m.perms.some((p) => p.toLowerCase().includes(needle))), [catalog, needle])

  const activeModule = visible.find((m) => m.name === active) || visible[0] || null

  const totals = useMemo(() => {
    let all = 0
    let held = 0
    let write = 0
    let touched = 0
    catalog.forEach((m) => {
      all += m.perms.length
      const valid = heldFor(m, granted)
      held += valid.length
      if (valid.length) touched += 1
      if (valid.some((p) => WRITE_PERMS.has(p))) write += 1
    })
    return { all, held, write, touched, pct: all ? Math.round((held / all) * 100) : 0 }
  }, [catalog, granted])

  const grantedModules = catalog.filter((m) => heldFor(m, granted).length > 0)

  const held = activeModule ? heldFor(activeModule, granted) : []
  const allOn = activeModule ? held.length === activeModule.perms.length : false
  const groups = activeModule ? groupPerms(activeModule.perms) : []

  const jump = (name) => { setActive(name); setQ('') }

  return (
    <div className="pp" data-readonly={readOnly || undefined}>
      <aside className="pp-mods">
        <div className="wb-search pp-search">
          <Icon name="search" size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search modules or permissions…"
            aria-label="Search modules or permissions"
          />
          {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
        </div>

        <div className="pp-mod-list" style={{ maxHeight }} role="listbox" aria-label="Modules">
          {visible.length === 0 && (
            <div className="t-sm t-mut" style={{ padding: '10px 12px' }}>No module or permission matches.</div>
          )}
          {visible.map((m) => {
            const mh = heldFor(m, granted)
            const mAll = mh.length === m.perms.length
            const mSome = mh.length > 0
            const mWrite = mh.some((p) => WRITE_PERMS.has(p))
            return (
              <div
                key={m.id}
                className="pp-mod"
                data-active={activeModule && activeModule.name === m.name ? 'true' : undefined}
                role="option"
                aria-selected={activeModule ? activeModule.name === m.name : false}
                tabIndex={0}
                onClick={() => setActive(m.name)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActive(m.name)}
              >
                <Check
                  checked={mAll}
                  mixed={mSome && !mAll}
                  disabled={readOnly}
                  label={`Select all permissions in ${m.name}`}
                  onChange={() => onSetModule && onSetModule(m.name, !mAll)}
                />
                <span className="pp-mod-name trunc" title={m.name}>{m.name}</span>
                {mWrite && <Icon name="bolt" size={11} style={{ color: 'var(--warn-core)', flex: 'none' }} />}
                <span className="pp-mod-count num" data-on={mSome || undefined}>{mh.length}/{m.perms.length}</span>
              </div>
            )
          })}
        </div>

        <div className="pp-mods-foot t-xs t-faint">
          <span className="num">{num(visible.length)}</span> of {num(catalog.length)} modules shown
        </div>
      </aside>

      <section className="pp-main" style={{ maxHeight: maxHeight + 76 }}>
        {!activeModule ? (
          <EmptyState
            size="sm"
            icon="search"
            title="No module selected"
            body="Clear the search to see the permission catalog again."
          />
        ) : (
          <>
            <div className="pp-head">
              <div className="pp-head-m">
                <div className="pp-head-t">
                  {activeModule.name}
                  <Tag tone="acc">{num(activeModule.perms.length)} permissions</Tag>
                </div>
                {activeModule.desc && <div className="pp-head-d t-xs t-mut">{activeModule.desc}</div>}
                <div className="pp-head-s">
                  <b className="num">{num(held.length)}</b> of {num(activeModule.perms.length)} permissions granted in this module
                </div>
              </div>
              {!readOnly && (
                <div className="pp-head-a">
                  <Button
                    size="sm"
                    icon="checkC"
                    disabled={allOn}
                    onClick={() => onSetModule && onSetModule(activeModule.name, true)}
                  >
                    Select all
                  </Button>
                  <Button
                    size="sm"
                    icon="minus"
                    disabled={held.length === 0}
                    onClick={() => onSetModule && onSetModule(activeModule.name, false)}
                  >
                    Clear module
                  </Button>
                </div>
              )}
            </div>

            <div className="pp-perm-scroll">
              {groups.map((g) => (
                <div className="pp-group" key={g.id}>
                  <div className="pp-group-t">{g.label}</div>
                  <div className="pp-perms">
                    {g.perms.map((p) => {
                      const on = held.includes(p)
                      const hit = !!needle && p.toLowerCase().includes(needle)
                      return (
                        <div
                          key={p}
                          className="pp-perm"
                          data-on={on || undefined}
                          data-hit={hit || undefined}
                          role="checkbox"
                          aria-checked={on}
                          aria-label={`${p} on ${activeModule.name}`}
                          tabIndex={readOnly ? -1 : 0}
                          onClick={() => !readOnly && onToggle && onToggle(activeModule.name, p)}
                          onKeyDown={(e) => {
                            if (readOnly) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onToggle && onToggle(activeModule.name, p)
                            }
                          }}
                        >
                          <Check checked={on} disabled={readOnly} label={`${p} on ${activeModule.name}`} onChange={() => onToggle && onToggle(activeModule.name, p)} />
                          <span className="pp-perm-t">{p}</span>
                          {WRITE_PERMS.has(p) && <span className="pp-perm-w">write</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="pp-sum">
        <div className="pp-sum-h">Granted so far</div>
        <div className="pp-sum-total">
          <span><b className="num">{num(totals.held)}</b> <span className="t-mut">of {num(totals.all)} permissions</span></span>
          <span className="t-faint num">{totals.pct}%</span>
        </div>
        <Meter value={totals.pct} tone={totals.pct > 66 ? 'bad' : totals.pct > 33 ? 'warn' : 'ok'} />
        <div className="pp-sum-facts">
          <span><Icon name="layers" size={11} /> <b className="num">{num(totals.touched)}</b> of {num(catalog.length)} modules</span>
          <span><Icon name="bolt" size={11} style={{ color: 'var(--warn-core)' }} /> <b className="num">{num(totals.write)}</b> write-capable</span>
        </div>

        <div className="pp-sum-list" style={{ maxHeight: Math.max(160, maxHeight - 150) }}>
          {grantedModules.length === 0 ? (
            <div className="t-sm t-mut" style={{ padding: '8px 2px' }}>
              Nothing granted yet. Pick a module and tick the permissions it should carry.
            </div>
          ) : grantedModules.map((m) => {
            const mh = heldFor(m, granted)
            return (
              <button key={m.id} type="button" className="pp-sum-mod" onClick={() => jump(m.name)} title={mh.join(', ')}>
                <span className="trunc">{m.name}</span>
                <span className="num t-faint">{mh.length}/{m.perms.length}</span>
              </button>
            )
          })}
        </div>

        {note && <div className="pp-sum-note t-xs t-faint">{note}</div>}
      </aside>
    </div>
  )
}

/**
 * Review-before-save dialog: everything the role will grant, per module,
 * shown for a final check before the change is committed.
 */
export function PermissionReview({ catalog = [], granted = {}, title, body, confirmLabel, onConfirm, onClose }) {
  const rows = catalog
    .map((m) => ({ m, held: heldFor(m, granted) }))
    .filter((r) => r.held.length > 0)
  const total = rows.reduce((a, r) => a + r.held.length, 0)
  const write = rows.filter((r) => r.held.some((p) => WRITE_PERMS.has(p))).length

  return (
    <Modal
      title={title || 'Review permissions before saving'}
      icon="key"
      size="lg"
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <div className="pp-review">
        <div className="pp-review-sum">
          <span><b className="num">{num(total)}</b> permissions across <b className="num">{num(rows.length)}</b> modules</span>
          <span className="t-mut"><Icon name="bolt" size={11} style={{ color: 'var(--warn-core)' }} /> {num(write)} write-capable modules</span>
        </div>
        {body && <div className="t-sm t-mut">{body}</div>}
        {rows.length === 0 ? (
          <div className="banner" data-tone="warn">
            <Icon name="warn" size={15} />
            <div>This role grants no permissions. It can still be assigned, but holders gain no access from it.</div>
          </div>
        ) : (
          <div className="pp-review-list">
            {rows.map(({ m, held }) => (
              <div className="pp-review-row" key={m.id}>
                <div className="pp-review-mod">
                  <span className="trunc">{m.name}</span>
                  <span className="num t-faint">{held.length}/{m.perms.length}</span>
                </div>
                <div className="pp-review-perms">
                  {held.map((p) => <Tag key={p} tone={WRITE_PERMS.has(p) ? 'warn' : undefined}>{p}</Tag>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
