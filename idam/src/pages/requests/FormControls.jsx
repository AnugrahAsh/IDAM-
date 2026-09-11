import { useMemo, useState } from 'react'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import Check from '../../components/primitives/Check'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import { GROUPS } from '../../data/seed'
import { entitlementsFor } from '../directory/identityData'
import { ATTR_SECTIONS, USER_ATTRS, attrOptions, factorsFor, sensitivityOf } from './data'

const matches = (g, q) => `${g.name} ${g.description} ${g.kind} ${g.application}`.toLowerCase().includes(q)

function GroupSearch({ q, setQ, placeholder }) {
  return (
    <div className="gp-search">
      <Icon name="search" size={13} />
      <input
        className="gp-q"
        value={q}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setQ(e.target.value)}
      />
      {q && (
        <button type="button" className="gp-x" aria-label="Clear search" onClick={() => setQ('')}>
          <Icon name="x" size={11} />
        </button>
      )}
    </div>
  )
}

/* The group catalogue, laid out under the application that owns it.

   It was a flat list of every group in the estate, so the entitlements step of
   a joiner request opened on a wall of names with no indication of which target
   any of them belonged to. This is the picker the Add User page uses:
   applications are collapsed until opened, each carries a select-all and a
   picked count, and a search expands every application that has a match so
   nothing hides behind a closed row. */
const APP_BLOCKS = [...new Set(GROUPS.map((g) => g.application))].sort().map((application) => ({
  application,
  groups: GROUPS.filter((g) => g.application === application),
}))

export function GroupMultiSelect({ value = [], onChange }) {
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())
  const picked = new Set(value)

  const blocks = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return APP_BLOCKS
    return APP_BLOCKS
      .map((b) => (b.application.toLowerCase().includes(needle)
        ? b
        : { ...b, groups: b.groups.filter((g) => matches(g, needle)) }))
      .filter((b) => b.groups.length > 0)
  }, [q])

  const searching = !!q.trim()
  const allExpanded = blocks.length > 0 && blocks.every((b) => expanded.has(b.application))
  const toggleAll = () => setExpanded(allExpanded ? new Set() : new Set(blocks.map((b) => b.application)))
  const toggle = (name) => onChange(picked.has(name) ? value.filter((n) => n !== name) : [...value, name])

  return (
    <div className="gp">
      <div className="gp-bar">
        <GroupSearch q={q} setQ={setQ} placeholder="Search groups by name, application or description…" />
        <Tag tone={value.length ? 'acc' : undefined}>{value.length} of {GROUPS.length} selected</Tag>
        <button type="button" className="gp-mini" onClick={toggleAll}>
          <Icon name={allExpanded ? 'chevU' : 'chevD'} size={12} />
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
        {value.length > 0 && (
          <button type="button" className="gp-mini" onClick={() => onChange([])}>
            <Icon name="x" size={12} />Clear
          </button>
        )}
      </div>

      <div className="gp-panel" role="group" aria-label="Available groups by application">
        {blocks.length === 0 && <div className="gp-empty t-xs t-mut">No group matches “{q.trim()}”.</div>}
        {blocks.map((block) => {
          const count = block.groups.filter((g) => picked.has(g.name)).length
          const all = count === block.groups.length
          // A search opens every block that matched it, so a hit is never left
          // behind a collapsed header.
          const isOpen = expanded.has(block.application) || searching
          return (
            <div key={block.application} className="gp-app">
              <div className="gp-app-h">
                <Check
                  checked={all}
                  mixed={!all && count > 0}
                  label={`Select every group in ${block.application}`}
                  onChange={() => {
                    const names = block.groups.map((g) => g.name)
                    onChange(all
                      ? value.filter((n) => !names.includes(n))
                      : [...value, ...names.filter((n) => !picked.has(n))])
                  }}
                />
                <button
                  type="button"
                  className="gp-app-btn"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded((set) => {
                    const next = new Set(set)
                    if (next.has(block.application)) next.delete(block.application)
                    else next.add(block.application)
                    return next
                  })}
                >
                  <Icon name={isOpen ? 'chevU' : 'chevD'} size={13} />
                  <span className="gp-app-name">{block.application}</span>
                </button>
                <Tag tone={count ? 'acc' : undefined}>{count}/{block.groups.length}</Tag>
              </div>
              {isOpen && (
                <div className="gp-groups">
                  {block.groups.map((g) => (
                    <div
                      key={g.name}
                      className="gp-row"
                      role="option"
                      aria-selected={picked.has(g.name)}
                      data-on={picked.has(g.name)}
                      title={g.description}
                      onClick={() => toggle(g.name)}
                    >
                      <Check checked={picked.has(g.name)} label={`Select ${g.name}`} onChange={() => toggle(g.name)} />
                      <span className="gp-row-name">{g.name}</span>
                      <span className="gp-row-meta">
                        {g.sodFlags > 0 && <span className="gp-flag" title={`${g.sodFlags} segregation-of-duties rules`}><Icon name="sod" size={11} /></span>}
                        <Tag>{g.kind}</Tag>
                        <SeverityBadge level={sensitivityOf(g.name)}>{sensitivityOf(g.name)}</SeverityBadge>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {value.length > 0 && (
        <div className="gp-chips">
          <span className="gp-chips-k t-micro t-mut">Selected ({value.length})</span>
          {value.map((n) => (
            <span className="gp-chip" data-tone="add" key={n}>
              <Icon name="group" size={11} />{n}
              <button type="button" aria-label={`Deselect ${n}`} onClick={() => toggle(n)}><Icon name="x" size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}


/* Which enrolled factors a reset clears.

   It was a single select whose first option was "All factors", so clearing two
   of an identity's three was not expressible — the requester either cleared
   everything or raised two requests. Each factor is its own choice now, and the
   list is what this identity actually holds rather than the platform catalogue,
   so nobody asks to clear a factor that was never enrolled. */
export function FactorMultiSelect({ user, value = [], onChange }) {
  const enrolled = useMemo(() => (user ? factorsFor(user) : []), [user])
  const picked = new Set(value)
  const toggle = (name) => onChange(picked.has(name) ? value.filter((n) => n !== name) : [...value, name])
  const all = enrolled.length > 0 && enrolled.every((m) => picked.has(m.name))

  if (!user) {
    return (
      <div className="fx-empty t-xs t-mut">
        Choose an identity above and the factors they have enrolled are listed here.
      </div>
    )
  }

  if (enrolled.length === 0) {
    return (
      <div className="fx-empty t-xs t-mut">
        This identity has no enrolled factors. There is nothing to clear — they are already prompted to enrol at the
        next sign-in.
      </div>
    )
  }

  return (
    <div className="fx">
      <div className="fx-bar">
        <Check
          checked={all}
          mixed={!all && picked.size > 0}
          label="Select every enrolled factor"
          onChange={() => onChange(all ? [] : enrolled.map((m) => m.name))}
        />
        <span className="t-xs t-mut">
          {picked.size} of {enrolled.length} enrolled {enrolled.length === 1 ? 'factor' : 'factors'} selected
        </span>
      </div>
      <div className="fx-list" role="group" aria-label="Enrolled factors">
        {enrolled.map((m) => (
          <div
            key={m.id}
            className="fx-row"
            data-on={picked.has(m.name)}
            onClick={() => toggle(m.name)}
          >
            <Check checked={picked.has(m.name)} label={`Clear ${m.name}`} onChange={() => toggle(m.name)} />
            <Icon name={m.icon} size={15} />
            <span className="fx-m">
              <span className="fx-t">{m.name}</span>
              <span className="fx-s t-xs t-mut">{m.sub}</span>
            </span>
            <SeverityBadge level={m.strength === 'strongest' ? 'low' : m.strength === 'strong' ? 'medium' : 'high'}>
              {m.strength}
            </SeverityBadge>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Add/remove dual picker. value is { add: [names], remove: [names] }. */
export function GroupDualPicker({ user, value = { add: [], remove: [] }, onChange }) {
  const [q, setQ] = useState('')
  const [scope, setScope] = useState('all')
  const add = value.add || []
  const remove = value.remove || []

  /* What the identity already holds. Without it the picker offered Add on a
     group the user was already in and Remove on one they had never held. */
  const held = useMemo(() => new Set(user ? entitlementsFor(user).map((e) => e.group) : []), [user])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = needle ? GROUPS.filter((g) => matches(g, needle)) : GROUPS
    if (scope === 'held') out = out.filter((g) => held.has(g.name))
    if (scope === 'available') out = out.filter((g) => !held.has(g.name))
    return out
  }, [q, scope, held])

  const toggleAdd = (n) => onChange({
    add: add.includes(n) ? add.filter((x) => x !== n) : [...add, n],
    remove: remove.filter((x) => x !== n),
  })
  const toggleRemove = (n) => onChange({
    add: add.filter((x) => x !== n),
    remove: remove.includes(n) ? remove.filter((x) => x !== n) : [...remove, n],
  })

  const staged = add.length + remove.length
  const SCOPES = [
    ['all', 'All', GROUPS.length],
    ['held', 'Held', held.size],
    ['available', 'Available', GROUPS.length - held.size],
  ]

  return (
    <div className="gp">
      {/* One row, and it wraps: the counted labels ran past the right edge of
          the panel and the last filter was unreadable. */}
      <div className="gp-bar">
        <GroupSearch q={q} setQ={setQ} placeholder="Search groups…" />
        <div className="seg gp-scope" role="group" aria-label="Filter by current membership">
          {SCOPES.map(([id, label, n]) => (
            <button key={id} type="button" data-on={scope === id || undefined} onClick={() => setScope(id)}>
              {label}<span className="gp-n">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {!user && (
        <div className="gp-empty t-xs t-mut">
          Choose an identity above to see which of these groups they already hold.
        </div>
      )}

      <div className="gp-list" aria-label="Membership changes">
        {list.length === 0 && (
          <div className="gp-empty t-xs t-mut">
            {q.trim() ? `No group matches “${q.trim()}”.` : 'No group in this view.'}
          </div>
        )}
        {list.map((g) => {
          const isHeld = held.has(g.name)
          const adding = add.includes(g.name)
          const removing = remove.includes(g.name)
          /* One action per row, decided by what the identity holds. The row
             used to carry a Held tag, a disabled Add and an active Remove —
             three controls stating one fact — beside a severity badge, a
             conflict mark and a description, all competing on one line. */
          const state = adding ? 'adding' : removing ? 'removing' : isHeld ? 'held' : 'none'
          return (
            <div key={g.name} className="gp-row" data-state={state}>
              <span className="gp-m">
                <span className="gp-t">
                  <span className="mono">{g.name}</span>
                  {g.sodFlags > 0 && (
                    <Icon name="sod" size={11} title={`${g.sodFlags} segregation-of-duties rules`} />
                  )}
                </span>
                <span className="gp-s t-xs t-mut trunc">{g.application} · {g.description}</span>
              </span>

              {/* Severity is stated only where it changes the decision. */}
              {sensitivityOf(g.name) === 'critical' && <Tag tone="bad">Critical</Tag>}

              {state === 'adding' && <Tag tone="ok">Adding</Tag>}
              {state === 'removing' && <Tag tone="bad">Removing</Tag>}

              {adding || removing ? (
                <button
                  type="button"
                  className="gp-act"
                  onClick={() => (adding ? toggleAdd(g.name) : toggleRemove(g.name))}
                >
                  Undo
                </button>
              ) : isHeld ? (
                <button type="button" className="gp-act" data-kind="remove" onClick={() => toggleRemove(g.name)}>
                  <Icon name="minus" size={11} />Remove
                </button>
              ) : (
                <button type="button" className="gp-act" data-kind="add" onClick={() => toggleAdd(g.name)}>
                  <Icon name="plus" size={11} />Add
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* The staged set, stated once at the foot rather than as two half-empty
          columns that were there whether anything was staged or not. */}
      {staged > 0 && (
        <div className="gp-staged">
          {add.map((n) => (
            <span className="gp-chip" data-tone="add" key={`a-${n}`}>
              <Icon name="plus" size={10} />{n}
              <button type="button" aria-label={`Undo add ${n}`} onClick={() => toggleAdd(n)}><Icon name="x" size={10} /></button>
            </span>
          ))}
          {remove.map((n) => (
            <span className="gp-chip" data-tone="remove" key={`r-${n}`}>
              <Icon name="minus" size={10} />{n}
              <button type="button" aria-label={`Undo remove ${n}`} onClick={() => toggleRemove(n)}><Icon name="x" size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* Full attribute grid for Modify user. value is { attrId: stagedValue }. */
export function AttributeChangeEditor({ user, value = {}, onChange }) {
  if (!user) {
    return (
      <div className="banner" data-tone="info">
        <Icon name="info" size={15} />
        <div>Select an identity above to load its current attribute values. Every governed attribute can then be edited in place.</div>
      </div>
    )
  }
  const set = (id, val) => {
    const next = { ...value }
    if (val === undefined || val === '') delete next[id]
    else next[id] = val
    onChange(next)
  }
  return (
    <div className="attr-ed">
      <div className="attr-row attr-head">
        <span>Attribute</span>
        <span>Current value</span>
        <span>New value</span>
        <span />
      </div>
      {ATTR_SECTIONS.map((sec) => {
        const attrs = USER_ATTRS.filter((a) => a.section === sec.id)
        if (attrs.length === 0) return null
        return (
          <div key={sec.id} className="attr-sec">
            <div className="attr-sec-t t-micro t-mut">{sec.label}</div>
            {attrs.map((a) => {
              const cur = String(user[a.id] ?? '')
              const staged = value[a.id]
              const changed = staged !== undefined && String(staged).trim() !== '' && String(staged) !== cur
              const opts = attrOptions(a)
              const locked = a.id === 'username'
              return (
                <div className="attr-row" key={a.id} data-changed={changed}>
                  <span className="attr-k">
                    {a.label}
                    {a.core && <Tag>core</Tag>}
                  </span>
                  <span className="attr-cur mono" title={cur}>{cur || <span className="t-faint">not set</span>}</span>
                  <span className="attr-new">
                    {locked ? (
                      <span className="t-xs t-faint">Immutable — usernames never change</span>
                    ) : opts ? (
                      <Select
                        value={staged ?? ''}
                        options={opts}
                        placeholder="Keep current value"
                        aria-label={`New ${a.label}`}
                        onChange={(e) => set(a.id, e.target.value)}
                      />
                    ) : (
                      <TextInput
                        type={a.type === 'date' ? 'date' : 'text'}
                        value={staged ?? ''}
                        placeholder="Keep current value"
                        aria-label={`New ${a.label}`}
                        onChange={(e) => set(a.id, e.target.value)}
                      />
                    )}
                  </span>
                  <span className="attr-tail">
                    {changed && (
                      <button
                        type="button"
                        className="attr-undo"
                        title={`Discard the ${a.label} change`}
                        aria-label={`Discard the ${a.label} change`}
                        onClick={() => set(a.id, undefined)}
                      >
                        <Icon name="refresh" size={11} />
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* Old → new diff rows used by the change-summary card and the context rail. */
export function DiffList({ changes, empty = 'No changes staged yet.' }) {
  if (!changes || changes.length === 0) return <div className="t-sm t-mut">{empty}</div>
  return (
    <div className="diff-list">
      {changes.map((c) => (
        <div className="diff-row" key={c.id} data-kind={c.kind || 'modify'}>
          <span className="diff-kind" data-kind={c.kind || 'modify'}>
            <Icon name={c.kind === 'add' ? 'plus' : c.kind === 'remove' ? 'minus' : 'edit'} size={11} />
          </span>
          <span className="diff-field">{c.field}</span>
          <span className="diff-old mono">{c.from || 'not set'}</span>
          <span className="diff-arr"><Icon name="arrowRight" size={11} /></span>
          <span className="diff-new mono">{c.to}</span>
        </div>
      ))}
    </div>
  )
}
