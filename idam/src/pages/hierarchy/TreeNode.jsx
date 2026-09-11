import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import { num } from '../../lib/format'

/**
 * One node of the organization structure.
 *
 * The tree is a place to read the shape of the organization, so the row carries
 * what tells you that shape — where the unit sits, how many identities roll up
 * to it, and how large it is against the tenant — and nothing that edits it.
 * Structural changes belong to Organizations and to the hierarchy source, both
 * of which own the lookup this tree is built from; inline add/edit/delete
 * buttons on every row invited changes to a projection rather than to its
 * source, and put a destructive control one mis-click from a navigation one.
 *
 * Depth is drawn with connector rails on the child group rather than computed
 * left padding, so the guides line up at every level and stay put when a
 * filtered view changes which levels are shown.
 */
export default function TreeNode({
  node, depth, open, forceOpen, selected, counts, total, lineage,
  onToggle, onSelect, onUsers, isRoot = false,
}) {
  const expandable = node.children.length > 0
  const isOpen = forceOpen || open.has(node.id)
  const isSel = selected === node.id
  // An ancestor of the selection. Marking the chain is what makes a deep unit
  // legible — without it a selected row six levels down has no visible
  // relationship to anything above it.
  // Ancestor of the selection. It marks the indent guide only — tinting the row
  // as well made every unit above the selected one look selected too.
  const inLineage = !!lineage && lineage.has(node.id) && !isSel
  const count = counts[node.id] || 0
  // Share of the tenant, so a row says how much of the organization it holds
  // and not only its own headcount.
  const share = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0

  return (
    <div className="otree-node" role="none" data-root={isRoot || undefined}>
      <div
        className="otree-row"
        data-on={isSel || undefined}
        data-kind={node.kind}
        data-depth={depth}
        role="treeitem"
        aria-expanded={expandable ? isOpen : undefined}
        aria-selected={isSel}
        tabIndex={0}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.id) }
          if (e.key === 'ArrowRight' && expandable && !isOpen) onToggle(node.id)
          if (e.key === 'ArrowLeft' && expandable && isOpen) onToggle(node.id)
        }}
      >
        <button
          className="ot-chev"
          aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
          disabled={!expandable}
          onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
        >
          {expandable && <Icon name={isOpen ? 'chevD' : 'chevR'} size={12} />}
        </button>
        <span className="ot-ic">
          <Icon name={node.kind === 'organization' ? 'building' : 'group'} size={13} />
        </span>

        <span className="ot-id">
          <span className="ot-n trunc">{node.name}</span>
          <span className="ot-sub">
            {node.kind === 'organization'
              ? `${node.children.length} ${node.children.length === 1 ? 'unit' : 'units'}`
              : `${num(node.members.length)} direct`}
          </span>
        </span>

        {node.status === 'Disabled' && <Pill tone="mut">Disabled</Pill>}

        {/* How much of the tenant sits under this unit, read at a glance. */}
        <span className="ot-share" aria-hidden="true">
          <span className="ot-share-fill" style={{ width: `${share}%` }} />
        </span>

        <button
          type="button"
          className="ot-c num hier-count"
          title={`Open the ${num(count)} users under ${node.name}`}
          aria-label={`${num(count)} users under ${node.name} — open list`}
          onClick={(e) => { e.stopPropagation(); onUsers(node.id) }}
        >
          <Icon name="users" size={10} />
          {num(count)}
        </button>
      </div>

      {expandable && isOpen && (
        <div className="otree-kids" role="group" data-lineage={(inLineage || isSel) || undefined}>
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              open={open}
              forceOpen={forceOpen}
              selected={selected}
              counts={counts}
              total={total}
              lineage={lineage}
              onToggle={onToggle}
              onSelect={onSelect}
              onUsers={onUsers}
            />
          ))}
        </div>
      )}
    </div>
  )
}
