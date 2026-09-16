import { useEffect, useMemo, useRef, useState } from 'react'
import Field from '../../components/primitives/Field'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import {
  SEQ_SEPARATORS, attributeSettingError, attributeSettingSummary, followsShared, moveInSequence,
  normaliseSequence, reconcileSequence, separatorLabel, sequenceIds,
} from './rules'

/*
 * The Attributes control of a Combination rule, shared by the Username and
 * Email screens.
 *
 * The multi-select chooses and orders the attributes exactly as before. Under
 * it, one row per selected attribute states how that attribute is treated —
 * whole value, following the shared separator — and opens on demand to the
 * per-attribute overrides the previous screen offered: take only the first or
 * last n characters, and follow the value with a different literal. An
 * administrator who never opens Adjust gets exactly the un-adjusted output.
 *
 * Rows reorder by dragging the handle, by the arrow keys on a focused handle,
 * or by the up/down buttons; every path writes the same sequence, so the
 * multi-select's chips and the rows can never disagree about the order.
 *
 * Reports the full sequence (setting objects, see rules.js) through onChange.
 */
export default function AttributeSequenceEditor({
  id, label = 'Attributes', hint = 'Joined in the order selected.', required,
  value, options = [], separator = '_', withSequence = true, onChange,
}) {
  const opts = useMemo(() => ({ withSequence }), [withSequence])
  const list = useMemo(() => normaliseSequence(value, separator, opts), [value, separator, opts])
  const ids = useMemo(() => sequenceIds(list), [list])
  const orderKey = ids.join()
  const labelOf = (attr) => (options.find((o) => o.value === attr) || {}).label || attr

  const [open, setOpen] = useState(() => new Set())
  const [armed, setArmed] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [drop, setDrop] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [announce, setAnnounce] = useState('')
  const handles = useRef(new Map())

  // Moving a row re-inserts its element, which drops keyboard focus; the handle
  // that was moved takes it back so arrow presses can continue.
  useEffect(() => {
    if (focusId != null) handles.current.get(focusId)?.focus()
  }, [focusId, orderKey])

  const emit = (next) => onChange && onChange(next)
  const update = (attr, patch) => emit(list.map((a) => (a.attribute === attr ? { ...a, ...patch } : a)))

  const place = (attr, index) => {
    emit(moveInSequence(list, attr, index))
    setAnnounce(`${labelOf(attr)} moved to position ${index + 1} of ${list.length}.`)
  }
  const nudge = (attr, delta, keepFocus) => {
    const index = ids.indexOf(attr) + delta
    if (index < 0 || index >= ids.length) return
    place(attr, index)
    if (keepFocus) setFocusId(attr)
  }
  const endDrag = () => { setDragId(null); setDrop(null); setArmed(null) }
  const dropHere = () => {
    if (dragId != null && drop && drop.id !== dragId) {
      const rest = ids.filter((x) => x !== dragId)
      place(dragId, rest.indexOf(drop.id) + (drop.after ? 1 : 0))
    }
    endDrag()
  }

  const toggleOpen = (attr) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(attr)) n.delete(attr); else n.add(attr)
    return n
  })

  // The override select offers every separator except the shared one, which
  // is what "Default" already means: picking it there would silently turn the
  // override back into the default and move the radio under the pointer.
  const overrideOptions = SEQ_SEPARATORS.filter((o) => o.value !== (separator == null ? '' : String(separator)))
  const canMove = ids.length > 1

  return (
    <div className="field" style={{ gridColumn: 'span 2' }}>
      <Field label={label} required={required} hint={hint} htmlFor={id}>
        <SearchSelect
          id={id}
          multiple
          value={ids}
          options={options}
          placeholder="Select attributes…"
          searchPlaceholder="Search attributes…"
          onChange={(e) => emit(reconcileSequence(e.target.value, list, separator, opts))}
        />
      </Field>

      {ids.length > 0 && (
        <div className="cfg-seq" role="list" aria-label={`${label}, in order`}>
          <span className="cfg-seq-live" role="status" aria-live="polite">{announce}</span>
          {list.map((a, i) => {
            const attr = a.attribute
            const isOpen = open.has(attr)
            const last = i === list.length - 1
            const err = attributeSettingError(a)
            const custom = a.is_var_length || !followsShared(a, separator)
            const useMode = !a.is_var_length ? 'whole' : (a.end ? 'last' : 'first')
            const name = labelOf(attr)
            const bodyId = `${id}-${attr}-adjust`
            return (
              <div
                key={attr}
                role="listitem"
                className="cfg-seq-row"
                draggable={armed === attr}
                data-dragging={dragId === attr || undefined}
                data-drop={drop && drop.id === attr && dragId !== attr ? (drop.after ? 'after' : 'before') : undefined}
                data-open={isOpen || undefined}
                onMouseUp={() => setArmed(null)}
                onDragStart={(e) => {
                  setDragId(attr)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', attr)
                }}
                onDragOver={(e) => {
                  if (dragId == null) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  const box = e.currentTarget.getBoundingClientRect()
                  const after = e.clientY > box.top + box.height / 2
                  if (!drop || drop.id !== attr || drop.after !== after) setDrop({ id: attr, after })
                }}
                onDrop={(e) => { e.preventDefault(); dropHere() }}
                onDragEnd={endDrag}
              >
                <div className="cfg-seq-head">
                  {canMove ? (
                    <button
                      type="button"
                      className="cfg-grip"
                      ref={(el) => { if (el) handles.current.set(attr, el); else handles.current.delete(attr) }}
                      title="Drag to reorder"
                      aria-label={`Reorder ${name}, position ${i + 1} of ${list.length}. Use the arrow keys to move it.`}
                      onMouseDown={() => setArmed(attr)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') { e.preventDefault(); nudge(attr, -1, true) }
                        if (e.key === 'ArrowDown') { e.preventDefault(); nudge(attr, 1, true) }
                      }}
                    >
                      <Icon name="grip" size={14} />
                    </button>
                  ) : (
                    <span className="cfg-grip" data-off aria-hidden="true"><Icon name="grip" size={14} /></span>
                  )}
                  <span className="cfg-seq-name" title={name}>{name}</span>
                  <span className="cfg-seq-sum" data-custom={custom || undefined} title={attributeSettingSummary(a, { last })}>
                    {err && <Icon name="warn" size={11} style={{ verticalAlign: '-1px', marginRight: 4, color: 'var(--bad)' }} />}
                    {attributeSettingSummary(a, { last })}
                  </span>
                  {canMove && (
                    <span className="cfg-seq-nudge">
                      <IconButton icon="chevU" size="sm" label={`Move ${name} up`} disabled={i === 0} onClick={() => nudge(attr, -1)} />
                      <IconButton icon="chevD" size="sm" label={`Move ${name} down`} disabled={last} onClick={() => nudge(attr, 1)} />
                    </span>
                  )}
                  <button
                    type="button"
                    className="cfg-seq-adjust"
                    aria-expanded={isOpen}
                    aria-controls={bodyId}
                    onClick={() => toggleOpen(attr)}
                  >
                    Adjust <Icon name="chevD" size={12} />
                  </button>
                </div>

                {isOpen && (
                  <div className="cfg-seq-body" id={bodyId}>
                    <span className="cfg-seq-k" id={`${bodyId}-use`}>Use</span>
                    <div className="cfg-choices" role="radiogroup" aria-labelledby={`${bodyId}-use`}>
                      <label className="cfg-choice" data-on={useMode === 'whole' || undefined}>
                        <input
                          type="radio"
                          name={`${bodyId}-use`}
                          checked={useMode === 'whole'}
                          onChange={() => update(attr, { is_var_length: false, length: null, end: false })}
                        />
                        Whole value
                      </label>
                      {[['first', 'First'], ['last', 'Last']].map(([mode, word]) => (
                        <label key={mode} className="cfg-choice" data-on={useMode === mode || undefined}>
                          <input
                            type="radio"
                            name={`${bodyId}-use`}
                            checked={useMode === mode}
                            onChange={() => update(attr, { is_var_length: true, end: mode === 'last' })}
                          />
                          {word}
                          {/* Clicking into the box, or typing in it, chooses this option:
                              a disabled box would swallow the click instead. Tab focus
                              alone changes nothing. */}
                          <TextInput
                            type="number"
                            min="1"
                            className="cfg-choice-n mono"
                            aria-label={`${word} how many characters of ${name}`}
                            aria-invalid={useMode === mode && !!err ? true : undefined}
                            value={useMode === mode && a.length != null ? a.length : ''}
                            onClick={() => { if (useMode !== mode) update(attr, { is_var_length: true, end: mode === 'last' }) }}
                            onChange={(e) => update(attr, {
                              is_var_length: true,
                              end: mode === 'last',
                              length: e.target.value === '' ? null : Number(e.target.value),
                            })}
                          />
                          characters
                        </label>
                      ))}
                      {err && <span className="cfg-choice-err" role="alert"><Icon name="warn" size={11} />{err}</span>}
                    </div>

                    <span className="cfg-seq-k" id={`${bodyId}-follow`}>Follow with</span>
                    <div className="cfg-choices" role="radiogroup" aria-labelledby={`${bodyId}-follow`}>
                      <label className="cfg-choice" data-on={followsShared(a, separator) || undefined}>
                        <input
                          type="radio"
                          name={`${bodyId}-follow`}
                          checked={followsShared(a, separator)}
                          onChange={() => update(attr, { input: separator == null ? '' : String(separator) })}
                        />
                        Default separator <b className="mono">{separatorLabel(separator)}</b>
                      </label>
                      <label className="cfg-choice" data-on={!followsShared(a, separator) || undefined}>
                        <input
                          type="radio"
                          name={`${bodyId}-follow`}
                          checked={!followsShared(a, separator)}
                          onChange={() => update(attr, { input: overrideOptions[0] ? overrideOptions[0].value : '' })}
                        />
                        <Select
                          className="cfg-choice-sel mono"
                          aria-label={`Text placed after ${name}`}
                          value={followsShared(a, separator) ? (overrideOptions[0] ? overrideOptions[0].value : '') : a.input}
                          options={overrideOptions}
                          onClick={() => { if (followsShared(a, separator) && overrideOptions[0]) update(attr, { input: overrideOptions[0].value }) }}
                          onChange={(e) => update(attr, { input: e.target.value })}
                        />
                        {last && <span className="cfg-choice-note">Not emitted after the last attribute.</span>}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
