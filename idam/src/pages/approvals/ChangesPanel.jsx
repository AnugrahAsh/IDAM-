import { useMemo, useState } from 'react'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import { useApp } from '../../store/AppContext'
import { OPEN } from '../requests/data'
import {
  CHANGE_ICON, CHANGE_LABEL, CHANGE_TONE, approvalView, resolveChanges,
} from './data'

/* Requested changes for every request type, highlighted old → new, with the
   modifications made by preceding-level approvers annotated per level and the
   current approver able to edit each change in place before deciding. */
export default function ChangesPanel({ row, edits, setEdits }) {
  const { toast } = useApp()
  const open = OPEN.has(row.status)
  const view = useMemo(() => approvalView(row), [row])
  const resolved = resolveChanges(row, edits)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')

  const editedCount = Object.keys(edits).length

  const begin = (c) => {
    setEditing(c.id)
    setDraft(edits[c.id] ?? c.to)
  }
  const commit = (c) => {
    const val = String(draft).trim()
    setEditing(null)
    if (!val) return
    if (val === c.to) {
      if (edits[c.id] !== undefined) {
        setEdits((s) => { const n = { ...s }; delete n[c.id]; return n })
        toast('info', 'Edit discarded', `${c.field} reverted to the value handed to you.`)
      }
      return
    }
    setEdits((s) => ({ ...s, [c.id]: val }))
    toast('ok', 'Change edited', `${c.field} will be provisioned as “${val}” if you approve. Your level ${row.level} edit is recorded in the evidence trail.`)
  }
  const revert = (c) => {
    setEdits((s) => { const n = { ...s }; delete n[c.id]; return n })
    toast('info', 'Edit discarded', `${c.field} reverted to “${c.to}”.`)
  }

  return (
    <Card
      title="Requested changes"
      sub={open
        ? 'What approving this request writes to the directory. As the current approver you may edit any change before deciding.'
        : 'What this request asked to write to the directory. The record is closed and read only.'}
      actions={(
        <>
          {editedCount > 0 && <Pill tone="acc" icon="edit">{editedCount} edited by you</Pill>}
          <Tag>{resolved.length} change{resolved.length === 1 ? '' : 's'}</Tag>
        </>
      )}
    >
      <div className="apv-diffs">
        {resolved.map((c) => {
          const isEdited = c.editedByYou
          const shown = c.current
          const priorForChange = view.edits.filter((e) => e.changeId === c.id)
          return (
            <div className="apv-diff" key={c.id} data-kind={c.kind}>
              <div className="apv-diff-head">
                <span className="apv-diff-ic" data-kind={c.kind}><Icon name={CHANGE_ICON[c.kind] || 'edit'} size={11} /></span>
                <span className="apv-diff-field">{c.field}</span>
                <Pill tone={CHANGE_TONE[c.kind] || 'warn'} dot>{CHANGE_LABEL[c.kind] || 'Changed'}</Pill>
                {priorForChange.length > 0 && (
                  <Tag>edited at level {priorForChange.map((e) => e.level).join(', ')}</Tag>
                )}
                {isEdited && <Pill tone="acc" icon="edit">edited by you</Pill>}
                <span className="spacer" />
                {open && editing !== c.id && (
                  <>
                    {isEdited && (
                      <IconButton icon="refresh" label={`Revert ${c.field} to the value handed to you`} onClick={() => revert(c)} />
                    )}
                    <IconButton icon="edit" label={`Edit ${c.field}`} onClick={() => begin(c)} />
                  </>
                )}
              </div>
              <div className="apv-diff-vals">
                <span className="apv-old mono">{c.from || 'not set'}</span>
                <span className="apv-arr"><Icon name="arrowRight" size={11} /></span>
                {editing === c.id ? (
                  <span className="apv-edit-ctl">
                    {c.options && c.options.length > 1 ? (
                      <Select
                        value={draft}
                        options={c.options}
                        aria-label={`New value for ${c.field}`}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                    ) : (
                      <TextInput
                        value={draft}
                        aria-label={`New value for ${c.field}`}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                    )}
                    <Button size="sm" variant="pri" icon="check" onClick={() => commit(c)}>Apply</Button>
                    <Button size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                  </span>
                ) : (
                  <span className="apv-new mono" data-edited={isEdited}>{shown}</span>
                )}
                {(isEdited || priorForChange.length > 0) && c.requestedTo !== shown && (
                  <span className="t-xs t-faint">requested: <span className="mono">{c.requestedTo}</span></span>
                )}
              </div>
              {(priorForChange.length > 0 || isEdited) && (
                <div className="apv-diff-notes">
                  {priorForChange.map((e) => (
                    <div className="apv-note" key={`${e.level}-${e.changeId}`}>
                      <Icon name="edit" size={11} />
                      <span>
                        Level {e.level} · <b>{e.approver}</b> ({e.role}) changed {c.field}:{' '}
                        <span className="mono">{e.from}</span> → <span className="mono">{e.to}</span>
                      </span>
                      <span className="apv-note-time mono">{e.when}</span>
                    </div>
                  ))}
                  {isEdited && (
                    <div className="apv-note" data-you="true">
                      <Icon name="edit" size={11} />
                      <span>
                        Level {row.level} · <b>You</b> changed {c.field}:{' '}
                        <span className="mono">{c.to}</span> → <span className="mono">{edits[c.id]}</span> · applies on approval
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="t-xs t-faint" style={{ marginTop: 10 }}>
        Approvers may reduce or correct the scope at their level before approving. Every edit is stamped with the
        approver, level and time, carried to the next level, and exported with the evidence.
      </div>
    </Card>
  )
}
