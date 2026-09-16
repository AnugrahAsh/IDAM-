import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Menu from '../../components/primitives/Menu'
import { useApp } from '../../store/AppContext'
import { policyPath, ruleSummary } from './signOnPolicyData'
import { usePolicyActions } from './usePolicyActions'
import { deniedTitle, usePolicyAccess } from './signOnPolicyAccess'
import { ActionPill, ConditionChips, ExcludedSummary, MfaSummary } from './RuleParts'

/**
 * The rule ladder.
 *
 * Priority is the row's position, so it is changed by moving the row: drag it
 * by its handle, or focus the handle and use the arrow keys. A new order is a
 * draft until it is saved — the contract the previous console had — but the
 * handle is always on screen, and there is a keyboard path beside the pointer.
 */
export default function RulesTab({ policy }) {
  const { navigate } = useApp()
  const access = usePolicyAccess()
  const { removeRule, saveOrder } = usePolicyActions()
  const [pending, setPending] = useState(null)
  const [armed, setArmed] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [drop, setDrop] = useState(null)
  const [menu, setMenu] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [announce, setAnnounce] = useState('')
  const handles = useRef(new Map())

  const byId = useMemo(() => new Map(policy.rules.map((r) => [r.id, r])), [policy.rules])
  const saved = policy.rules.map((r) => r.id)
  // A rule deleted or added while an order is drafted is folded into the draft
  // rather than throwing the draft away.
  const order = pending
    ? [...pending.filter((id) => byId.has(id)), ...saved.filter((id) => !pending.includes(id))]
    : saved
  const orderKey = order.join()
  const dirty = orderKey !== saved.join()
  const rules = order.map((id) => byId.get(id))
  const canMove = access.reorder && rules.length > 1

  // Moving a row re-inserts its element, which drops keyboard focus; the handle
  // that was moved takes it back so arrow presses can continue.
  useEffect(() => {
    if (focusId != null) handles.current.get(focusId)?.focus()
  }, [focusId, orderKey])

  const place = (id, index) => {
    const next = order.filter((x) => x !== id)
    next.splice(index, 0, id)
    setPending(next)
    setAnnounce(`${byId.get(id).name} moved to priority ${index + 1} of ${order.length}.`)
  }

  const nudge = (id, delta, keepFocus) => {
    const index = order.indexOf(id) + delta
    if (index < 0 || index >= order.length) return
    place(id, index)
    if (keepFocus) setFocusId(id)
  }

  const endDrag = () => {
    setDragId(null)
    setDrop(null)
    setArmed(null)
  }

  const dropHere = () => {
    if (dragId != null && drop && drop.id !== dragId) {
      const rest = order.filter((x) => x !== dragId)
      place(dragId, rest.indexOf(drop.id) + (drop.after ? 1 : 0))
    }
    endDrag()
  }

  const editPath = (r) => policyPath(policy.id, `rules/${r.id}/edit`)
  const addRule = () => navigate(policyPath(policy.id, 'rules/add'))
  const why = (key) => (access[key] ? undefined : deniedTitle(key))

  const openMenu = (e, rule, index) => {
    e.stopPropagation()
    setMenu({
      anchor: e.currentTarget,
      ruleId: rule.id,
      items: [
        { label: rule.name, header: true },
        { id: 'edit', label: 'Edit rule', icon: 'edit', disabled: !access.editRule, title: why('editRule'), onSelect: () => navigate(editPath(rule)) },
        { id: 'up', label: 'Move up', icon: 'chevU', disabled: !canMove || index === 0, title: why('reorder'), onSelect: () => nudge(rule.id, -1) },
        { id: 'down', label: 'Move down', icon: 'chevD', disabled: !canMove || index === rules.length - 1, title: why('reorder'), onSelect: () => nudge(rule.id, 1) },
        { divider: true },
        { id: 'del', label: 'Delete rule', icon: 'trash', danger: true, disabled: !access.removeRule, title: why('removeRule'), onSelect: () => removeRule(policy, rule) },
      ],
    })
  }

  const addButton = access.addRule
    ? <Button size="sm" variant="pri" icon="plus" onClick={addRule}>Add rule</Button>
    : undefined

  return (
    <>
      <Card
        title="Rules"
        sub="Evaluated top-to-bottom by priority; first match wins"
        flush
        actions={addButton}
        footer={rules.length > 1 ? (
          <>
            <Icon name="info" size={12} />
            <span>
              {canMove
                ? 'Drag a rule by its handle — or focus the handle and use the arrow keys — to change its priority.'
                : 'Your role does not hold the Reorder Rules permission, so priorities are read-only.'}
            </span>
          </>
        ) : undefined}
      >
        {rules.length === 0 ? (
          <EmptyState
            icon="layers"
            title="No rules configured yet"
            body="Add one to get started. A rule matches sign-ins on IP address, browser, operating system or device, then allows or denies them — and can require MFA."
            actions={access.addRule ? <Button variant="pri" icon="plus" onClick={addRule}>Add rule</Button> : undefined}
          />
        ) : (
          <>
            {dirty && (
              <div className="sop-reorder" role="status">
                <Icon name="sort" size={14} />
                <span><b>Order changed</b> — priorities update on save.</span>
                <span className="spacer" />
                <Button size="sm" onClick={() => setPending(null)}>Reset</Button>
                <Button size="sm" variant="pri" icon="save" onClick={() => { saveOrder(policy, order); setPending(null) }}>Save order</Button>
              </div>
            )}
            <div className="sop-ladder-wrap">
              <table className="tbl sop-ladder">
                <thead>
                  <tr>
                    <th className="sop-grip-cell"><span className="vis-hidden">Reorder</span></th>
                    <th className="sop-prio-col">Priority</th>
                    <th>Rule</th>
                    <th>Conditions</th>
                    <th>MFA</th>
                    <th>Excluded</th>
                    <th>Action</th>
                    <th className="td-act">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r, i) => {
                    const was = saved.indexOf(r.id)
                    const moved = dirty && was !== i
                    return (
                      <tr
                        key={r.id}
                        draggable={armed === r.id}
                        data-dragging={dragId === r.id || undefined}
                        data-drop={drop && drop.id === r.id && dragId !== r.id ? (drop.after ? 'after' : 'before') : undefined}
                        data-moved={moved || undefined}
                        style={access.editRule ? { cursor: 'pointer' } : undefined}
                        onClick={access.editRule ? () => navigate(editPath(r)) : undefined}
                        onMouseUp={() => setArmed(null)}
                        onDragStart={(e) => {
                          setDragId(r.id)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', String(r.id))
                        }}
                        onDragOver={(e) => {
                          if (dragId == null) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          const box = e.currentTarget.getBoundingClientRect()
                          const after = e.clientY > box.top + box.height / 2
                          if (!drop || drop.id !== r.id || drop.after !== after) setDrop({ id: r.id, after })
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          dropHere()
                        }}
                        onDragEnd={endDrag}
                      >
                        <td className="sop-grip-cell">
                          {canMove ? (
                            <button
                              type="button"
                              className="sop-grip"
                              ref={(el) => { if (el) handles.current.set(r.id, el); else handles.current.delete(r.id) }}
                              title="Drag to change priority"
                              aria-label={`Reorder ${r.name}, priority ${i + 1} of ${rules.length}. Use the arrow keys to move it.`}
                              onMouseDown={() => setArmed(r.id)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') { e.preventDefault(); nudge(r.id, -1, true) }
                                if (e.key === 'ArrowDown') { e.preventDefault(); nudge(r.id, 1, true) }
                              }}
                            >
                              <Icon name="grip" size={14} />
                            </button>
                          ) : (
                            <span className="sop-grip" data-off aria-hidden="true"><Icon name="grip" size={14} /></span>
                          )}
                        </td>
                        <td className="sop-prio-col">
                          <span className="sop-prio-cell">
                            <span className="sop-prio" data-moved={moved || undefined}>{i + 1}</span>
                            {moved && <span className="sop-was">was {was + 1}</span>}
                          </span>
                        </td>
                        {/* The conditions and action have columns of their own, so the
                            one-line reading of the rule is the cell's tooltip, not a
                            second line that pushed the table past its card. */}
                        <td className="td-main" title={ruleSummary(r)}>
                          <span className="sop-rule-name">{r.name}</span>
                        </td>
                        <td className="sop-conds"><ConditionChips rule={r} /></td>
                        <td><MfaSummary rule={r} /></td>
                        <td><ExcludedSummary rule={r} /></td>
                        <td><ActionPill action={r.action} /></td>
                        <td className="td-act">
                          <span className="row-act" data-open={menu && menu.ruleId === r.id ? true : undefined}>
                            <IconButton icon="kebab" size="sm" label={`Actions for ${r.name}`} onClick={(e) => openMenu(e, r, i)} />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <div className="vis-hidden" aria-live="polite">{announce}</div>
      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
