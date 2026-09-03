import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import { num } from '../../lib/format'

/**
 * One node of the organization structure.
 *
 * The row carries what tells you the shape — where the unit sits, how many
 * identities roll up to it, and how large it is against the tenant — plus the
 * three actions an operator performs on a unit. Those are revealed on hover,
 * focus or selection rather than drawn on every row, so a forty-unit tree still
 * reads as a tree and a destructive control is never sitting under the pointer
 * that was only navigating.
 *
 * Depth is drawn with connector rails on the child group rather than computed
 * left padding, so the guides line up at every level and stay put when a
 * filtered view changes which levels are shown.
 */
export default function TreeNode({
  node, depth, open, forceOpen, selected, counts, total, lineage,
  onToggle, onSelect, onUsers, onAdd, onEdit, onDelete, isRoot = false,
}) {
  const expandable = node.children.length > 0
  const isOpen = forceOpen || open.has(node.id)
  const isSel = selected === node.id
  // An ancestor of the selection. Marking the chain is what makes a deep unit
  // legible — without it a selected row six levels down has no visible
  // relationship to anything above it.
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
        data-lineage={inLineage || undefined}
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
          {/* Which level of the lookup produced this node, so a unit says what
              it is and not only what it is called. */}
          <span className="ot-sub trunc">
            {node.levelLabel ? `${node.levelLabel} · ` : ''}
            {node.children.length
              ? `${node.children.length} ${node.children.length === 1 ? 'child unit' : 'child units'}`
              : `${num(node.members.length)} direct`}
          </span>
        </span>

        {node.derived === false && <Pill tone="acc">Added</Pill>}
        {node.status === 'Disabled' && <Pill tone="mut">Disabled</Pill>}

        {/* How much of the tenant sits under this unit, read at a glance. */}
        <span className="ot-share" aria-hidden="true">
          <span className="ot-share-fill" style={{ width: `${share}%` }} />
        </span>

        {(onAdd || onEdit || onDelete) && (
          <span className="hier-row-act" onClick={(e) => e.stopPropagation()} role="none">
            {onAdd && <IconButton icon="plus" size="sm" label={`Add a unit under ${node.name}`} onClick={() => onAdd(node)} />}
            {onEdit && <IconButton icon="edit" size="sm" label={`Edit ${node.name}`} onClick={() => onEdit(node)} />}
            {onDelete && !isRoot && <IconButton icon="trash" size="sm" label={`Delete ${node.name}`} onClick={() => onDelete(node)} />}
          </span>
        )}

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
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
