import { useMemo, useState } from 'react'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import { useApp } from '../../store/AppContext'
import { OPEN } from '../accessRequests/data'
import {
  ADDABLE, CHANGE_ICON, CHANGE_LABEL, CHANGE_TONE, approvalView, draftCounts, nextChangeId, resolveChanges,
} from './data'

const OP_VERB = { add: 'added', remove: 'removed', modify: 'changed' }

/* The requested changes, as the levels so far have left them, with everything
   the current approver may do to them before deciding: change a value, strike
   a change out, or add one the requester did not ask for. Every intervention
   is a draft operation until Approve commits it as this level's revision. */
export default function ChangesPanel({ row, draft, setDraft }) {
  const { toast } = useApp()
  const open = OPEN.has(row.status)
  const view = useMemo(() => approvalView(row), [row])
  const resolved = resolveChanges(row, draft)
  const counts = draftCounts(draft)

  const [editing, setEditing] = useState(null)
  const [value, setValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [addKind, setAddKind] = useState(ADDABLE[0].id)
  const [addField, setAddField] = useState('')
  const [addValue, setAddValue] = useState('')

  const spec = ADDABLE.find((a) => a.id === addKind) || ADDABLE[0]

  const push = (op) => setDraft((d) => ({ ops: [...d.ops, op] }))
  const drop = (pred) => setDraft((d) => ({ ops: d.ops.filter((o) => !pred(o)) }))

  /* --- change a value ------------------------------------------------------- */
  const beginEdit = (c) => { setEditing(c.id); setValue(c.current) }
  const commitEdit = (c) => {
    const next = String(value).trim()
    setEditing(null)
    if (!next) return
    drop((o) => o.op === 'modify' && o.changeId === c.id)
    if (next === c.to) {
      if (c.editedByYou) toast('info', 'Edit discarded', `${c.field} is back to the value handed to you.`)
      return
    }
    push({ op: 'modify', changeId: c.id, field: c.field, from: c.to, to: next })
    toast('ok', 'Change edited', `${c.field} will be provisioned as “${next}” if you approve.`)
  }
  const revertEdit = (c) => {
    drop((o) => o.op === 'modify' && o.changeId === c.id)
    toast('info', 'Edit discarded', `${c.field} is back to “${c.to}”.`)
  }

  /* --- strike a change out --------------------------------------------------- */
  const remove = (c) => {
    // A change you added is simply withdrawn; one the request carried is
    // recorded as removed at this level.
    if (c.addedByYou) { drop((o) => o.op === 'add' && o.changeId === c.id); return }
    drop((o) => o.op === 'modify' && o.changeId === c.id)
    push({ op: 'remove', changeId: c.id, field: c.field, from: c.from, to: c.to })
    toast('warn', 'Change struck out', `${c.field} → ${c.to} will not be provisioned if you approve. Undo from the row or the strip below.`)
  }
  const restore = (c) => drop((o) => o.op === 'remove' && o.changeId === c.id)

  /* --- add a change ---------------------------------------------------------- */
  const openAdd = () => { setAdding(true); setAddKind(ADDABLE[0].id); setAddField(''); setAddValue(ADDABLE[0].options[0]) }
  const chooseKind = (id) => {
    const next = ADDABLE.find((a) => a.id === id)
    setAddKind(id)
    setAddValue(next.free ? '' : next.options[0])
  }
  const commitAdd = () => {
    const to = String(addValue).trim()
    const field = spec.free ? String(addField).trim() : spec.field
    if (!field || !to) { toast('warn', 'Incomplete', 'Name the field and the value before adding the change.'); return }
    if (resolved.some((c) => !c.removedByYou && c.field === field && (spec.kind === 'remove' ? c.from : c.to) === to)) {
      toast('warn', 'Already in the request', `${field} → ${to} is already part of this request.`)
      return
    }
    push({
      op: 'add',
      changeId: nextChangeId(row.level),
      field,
      kind: spec.kind,
      from: spec.kind === 'remove' ? to : (spec.from ?? '—'),
      to: spec.kind === 'remove' ? 'Removed' : to,
    })
    setAdding(false)
    toast('ok', 'Change added', `${field}: ${spec.kind === 'remove' ? `${to} will be removed` : `${to} will be provisioned`} if you approve. Recorded as a level ${row.level} addition.`)
  }

  const priorFor = (c) => view.edits.filter((e) => e.changeId === c.id)
  const addedAt = (c) => c.addedAtLevel

  return (
    <Card
      title="Requested changes"
      sub={open
        ? 'What approving this request writes to the directory. As the current approver you may change, strike out or add to it before deciding.'
        : 'What this request wrote, or would have written, to the directory. The record is closed and read only.'}
      actions={(
        <>
          {counts.total > 0 && <Pill tone="acc" icon="edit">{counts.total} in your revision</Pill>}
          <Tag>{resolved.filter((c) => !c.removedByYou).length} change{resolved.filter((c) => !c.removedByYou).length === 1 ? '' : 's'}</Tag>
        </>
      )}
    >
      <div className="apv-diffs">
        {resolved.map((c) => {
          const prior = priorFor(c)
          const isEditing = editing === c.id
          return (
            <div
              className="apv-diff"
              key={c.id}
              data-kind={c.kind}
              data-removed={c.removedByYou || undefined}
              data-added={c.addedByYou || undefined}
            >
              <div className="apv-diff-head">
                <span className="apv-diff-ic" data-kind={c.kind}><Icon name={CHANGE_ICON[c.kind] || 'edit'} size={11} /></span>
                <span className="apv-diff-field">{c.field}</span>
                <Pill tone={CHANGE_TONE[c.kind] || 'warn'} dot>{CHANGE_LABEL[c.kind] || 'Changed'}</Pill>
                {addedAt(c) && <Tag tone="ok">added at level {addedAt(c)}</Tag>}
                {prior.some((e) => e.op === 'modify') && (
                  <Tag>edited at level {[...new Set(prior.filter((e) => e.op === 'modify').map((e) => e.level))].join(', ')}</Tag>
                )}
                {c.addedByYou && <Pill tone="acc" icon="plus">added by you</Pill>}
                {c.editedByYou && <Pill tone="acc" icon="edit">edited by you</Pill>}
                {c.removedByYou && <Pill tone="bad" icon="minus">struck out by you</Pill>}
                <span className="spacer" />
                {open && !isEditing && (
                  c.removedByYou ? (
                    <Button size="sm" icon="refresh" onClick={() => restore(c)}>Undo</Button>
                  ) : (
                    <>
                      {c.editedByYou && (
                        <IconButton icon="refresh" label={`Revert ${c.field} to the value handed to you`} onClick={() => revertEdit(c)} />
                      )}
                      {!c.addedByYou && <IconButton icon="edit" label={`Edit ${c.field}`} onClick={() => beginEdit(c)} />}
                      <IconButton icon="minus" label={c.addedByYou ? `Withdraw ${c.field}` : `Strike out ${c.field}`} onClick={() => remove(c)} />
                    </>
                  )
                )}
              </div>

              <div className="apv-diff-vals">
                <span className="apv-old mono">{c.from || 'not set'}</span>
                <span className="apv-arr"><Icon name="arrowRight" size={11} /></span>
                {isEditing ? (
                  <span className="apv-edit-ctl">
                    {c.options && c.options.length > 1 ? (
                      <Select value={value} options={c.options} aria-label={`New value for ${c.field}`} onChange={(e) => setValue(e.target.value)} />
                    ) : (
                      <TextInput value={value} aria-label={`New value for ${c.field}`} onChange={(e) => setValue(e.target.value)} />
                    )}
                    <Button size="sm" variant="pri" icon="check" onClick={() => commitEdit(c)}>Apply</Button>
                    <Button size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                  </span>
                ) : (
                  <span className="apv-new mono" data-edited={c.editedByYou || undefined}>{c.current}</span>
                )}
                {c.requestedTo !== c.current && !c.addedByYou && (
                  <span className="t-xs t-faint">requested: <span className="mono">{c.requestedTo}</span></span>
                )}
              </div>

              {(prior.length > 0 || c.editedByYou) && (
                <div className="apv-diff-notes">
                  {prior.map((e, i) => (
                    <div className="apv-note" key={`${e.level}-${e.op}-${i}`}>
                      <Icon name={CHANGE_ICON[e.op === 'modify' ? 'modify' : e.op] || 'edit'} size={11} />
                      <span>
                        Level {e.level} · <b>{e.approver}</b> ({e.role}) {OP_VERB[e.op]} {e.field}
                        {e.op === 'modify' && <>: <span className="mono">{e.from}</span> → <span className="mono">{e.to}</span></>}
                        {e.op === 'add' && <>: <span className="mono">{e.to}</span></>}
                      </span>
                      <span className="apv-note-time mono">{e.when}</span>
                    </div>
                  ))}
                  {c.editedByYou && (
                    <div className="apv-note" data-you="true">
                      <Icon name="edit" size={11} />
                      <span>
                        Level {row.level} · <b>You</b> changed {c.field}: <span className="mono">{c.to}</span> → <span className="mono">{c.current}</span> · commits on approval
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {open && (
        adding ? (
          <div className="apv-add">
            <div className="apv-add-h">
              <Icon name="plus" size={13} />
              <span>Add a change at level {row.level}</span>
              <span className="spacer" />
              <IconButton icon="x" size="sm" label="Cancel" onClick={() => setAdding(false)} />
            </div>
            <div className="grid grid-3">
              <Field label="What" htmlFor="apv-add-kind">
                <Select id="apv-add-kind" value={addKind} options={ADDABLE.map((a) => ({ value: a.id, label: a.label }))} onChange={(e) => chooseKind(e.target.value)} />
              </Field>
              {spec.free ? (
                <Field label="Field" required htmlFor="apv-add-field">
                  <TextInput id="apv-add-field" value={addField} placeholder="Designation" onChange={(e) => setAddField(e.target.value)} />
                </Field>
              ) : (
                <Field label="Field"><TextInput value={spec.field} disabled /></Field>
              )}
              <Field label={spec.kind === 'remove' ? 'Group to remove' : 'Value'} required htmlFor="apv-add-value">
                {spec.free
                  ? <TextInput id="apv-add-value" value={addValue} placeholder="Senior Engineer" onChange={(e) => setAddValue(e.target.value)} />
                  : <Select id="apv-add-value" value={addValue} options={spec.options} onChange={(e) => setAddValue(e.target.value)} />}
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <Button size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" variant="pri" icon="plus" onClick={commitAdd}>Add to request</Button>
            </div>
          </div>
        ) : (
          <div className="row" style={{ marginTop: 10 }}>
            <Button size="sm" icon="plus" onClick={openAdd}>Add a change</Button>
          </div>
        )
      )}

      {/* Everything staged at this level, in one place, each undoable. */}
      {counts.total > 0 && (
        <div className="apv-rev">
          <div className="apv-rev-h">
            <Icon name="edit" size={12} />
            <span>Your level {row.level} revision</span>
            <Tag tone="acc">{counts.added} added · {counts.removed} removed · {counts.changed} changed</Tag>
            <span className="spacer" />
            <button type="button" className="link" onClick={() => setDraft({ ops: [] })}>Discard all</button>
          </div>
          <div className="apv-rev-ops">
            {draft.ops.map((o, i) => (
              <span className="apv-op" key={`${o.op}-${o.changeId}-${i}`} data-op={o.op}>
                <Icon name={CHANGE_ICON[o.op === 'modify' ? 'modify' : o.op]} size={10} />
                <span>
                  {o.field}
                  {o.op === 'modify' && <>: <span className="mono">{o.from}</span> → <span className="mono">{o.to}</span></>}
                  {o.op === 'add' && <>: <span className="mono">{o.kind === 'remove' ? o.from : o.to}</span></>}
                  {o.op === 'remove' && <>: <span className="mono">{o.to}</span></>}
                </span>
                <button type="button" aria-label="Undo" onClick={() => setDraft((d) => ({ ops: d.ops.filter((x) => x !== o) }))}>
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="t-xs t-faint">Nothing here reaches the request until you approve. It is then stamped with your name, level and time and shown to every level after you.</div>
        </div>
      )}
    </Card>
  )
}
