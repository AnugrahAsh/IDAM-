import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import { num } from '../../lib/format'

// Node keys are built by encoding, not concatenation: an option of "New Delhi"
// with an empty value must not collide with "New" and "Delhi".
const nodeKey = (option, value) => JSON.stringify([option, value])

/**
 * The stored rows are complete paths — India/Maharashtra/Mumbai, then
 * India/Maharashtra/Pune — because that is the shape the cascade is filtered
 * from. Folding the repeated prefixes back up is what turns the six-column
 * table into the hierarchy an operator actually has in mind, and it is the only
 * view in which "India has seven cities across five states" is readable.
 */
export function buildTree(rows, levels) {
  const root = { children: new Map(), paths: 0 }
  rows.forEach((cells) => {
    let node = root
    levels.forEach((_, depth) => {
      const option = String(cells[depth * 2] || '').trim()
      const value = String(cells[depth * 2 + 1] || '').trim()
      const key = nodeKey(option, value)
      if (!node.children.has(key)) {
        node.children.set(key, { option, value, depth, children: new Map(), paths: 0 })
      }
      node = node.children.get(key)
      node.paths += 1
    })
    root.paths += 1
  })

  const toArray = (map, prefix) => [...map.values()].map((n) => {
    const id = `${prefix}/${nodeKey(n.option, n.value)}`
    return { ...n, id, children: toArray(n.children, id) }
  })
  return toArray(root.children, '')
}

const matches = (node, needle) => node.option.toLowerCase().includes(needle)
  || node.value.toLowerCase().includes(needle)

/** Keep a node when it matches, or when anything beneath it does. */
function filterTree(nodes, needle) {
  const out = []
  nodes.forEach((n) => {
    const kids = filterTree(n.children, needle)
    if (kids.length > 0 || matches(n, needle)) out.push({ ...n, children: kids.length ? kids : n.children, hit: matches(n, needle) })
  })
  return out
}

const collectIds = (nodes, acc = []) => {
  nodes.forEach((n) => { acc.push(n.id); collectIds(n.children, acc) })
  return acc
}

export default function MultiLookupTree({ rows, levels, query, onQuery }) {
  const tree = useMemo(() => buildTree(rows, levels), [rows, levels])
  // Level 1 open by default: the shape is legible immediately, and a hierarchy
  // of several hundred leaves is not dumped on the operator at once.
  const [open, setOpen] = useState(() => new Set(tree.map((n) => n.id)))

  const needle = String(query || '').trim().toLowerCase()
  const shown = useMemo(() => (needle ? filterTree(tree, needle) : tree), [tree, needle])
  // A search is useless if the branch holding the hit is collapsed.
  const forced = useMemo(() => (needle ? new Set(collectIds(shown)) : null), [shown, needle])

  const isOpen = (id) => (forced ? forced.has(id) : open.has(id))
  const toggle = (id) => setOpen((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const allIds = useMemo(() => collectIds(tree), [tree])
  const totalNodes = allIds.length

  const render = (nodes) => nodes.map((n) => {
    const hasKids = n.children.length > 0
    const expanded = hasKids && isOpen(n.id)
    return (
      <div key={n.id} className="mll-branch">
        <div className="mll-node" data-depth={n.depth} data-hit={n.hit || undefined}>
          {hasKids ? (
            <button
              type="button"
              className="mll-toggle"
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${n.option}`}
              onClick={() => toggle(n.id)}
            >
              <Icon name="chevR" size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} />
            </button>
          ) : <span className="mll-toggle is-leaf"><Icon name="minus" size={10} /></span>}

          <span className="mll-lvl">{levels[n.depth]}</span>
          <span className="mll-opt trunc">{n.option || <span className="t-faint">(blank)</span>}</span>
          <span className="mll-val mono">{n.value || '—'}</span>
          <span className="mll-count">
            {/* The level name is operator-typed, so it is never pluralised —
                "city" would become "citys". The count leads instead. */}
            {hasKids
              ? <Pill tone="mut">{levels[n.depth + 1]} · {num(n.children.length)}</Pill>
              : <Pill tone="ok" dot>leaf</Pill>}
            {/* Suppressed while filtering: the path total is for the whole
                branch and would contradict the filtered child count. */}
            {hasKids && !needle && n.depth < levels.length - 2 && (
              <span className="t-xs t-mut">{num(n.paths)} path{n.paths === 1 ? '' : 's'}</span>
            )}
          </span>
        </div>
        {expanded && <div className="mll-kids">{render(n.children)}</div>}
      </div>
    )
  })

  if (rows.length === 0) {
    return <EmptyState size="sm" icon="hierarchy" title="No data rows" body="Upload a CSV of complete paths from the Edit panel to build the hierarchy." />
  }

  return (
    <>
      <div className="mll-bar">
        {/* The search belongs on the bar that already carries the level chain
            and the counts; on its own strip above it, it was a full-width bar
            holding one field. */}
        <label className="wb-search mll-search">
          <Icon name="search" size={14} />
          <input
            value={query || ''}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search every option and value column…"
            aria-label="Search the hierarchy"
          />
          {query && <IconButton icon="x" size="sm" label="Clear search" onClick={() => onQuery('')} />}
        </label>
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {levels.map((l, i) => (
            <span key={l} className="row" style={{ gap: 5 }}>
              {i > 0 && <Icon name="chevR" size={10} style={{ color: 'var(--faint)' }} />}
              <span className="mll-lvl">{`level-${i + 1} · ${l}`}</span>
            </span>
          ))}
        </span>
        <span className="row" style={{ gap: 6, marginLeft: 'auto' }}>
          <span className="t-xs t-mut">{num(rows.length)} paths · {num(totalNodes)} nodes</span>
          <Button size="sm" icon="chevExpand" onClick={() => setOpen(new Set(allIds))}>Expand all</Button>
          <Button size="sm" icon="minus" onClick={() => setOpen(new Set())}>Collapse all</Button>
        </span>
      </div>
      <div className="mll-tree">
        {shown.length === 0
          ? <div className="mll-none">No branch matches “{query}”.</div>
          : render(shown)}
      </div>
    </>
  )
}
