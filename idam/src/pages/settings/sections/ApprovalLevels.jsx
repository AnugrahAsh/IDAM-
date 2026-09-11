import { useState } from 'react'
import Card from '../../../components/primitives/Card'
import Button from '../../../components/primitives/Button'
import IconButton from '../../../components/primitives/IconButton'
import Field from '../../../components/primitives/Field'
import TextInput from '../../../components/primitives/TextInput'
import Select from '../../../components/primitives/Select'
import Banner from '../../../components/primitives/Banner'
import Tag from '../../../components/primitives/Tag'
import Pill from '../../../components/primitives/Pill'
import EmptyState from '../../../components/primitives/EmptyState'
import { useApp } from '../../../store/AppContext'
import { ROLES } from '../../../data/seed'
import { writeSection } from '../settingsStore'

const ROLE_NAMES = ROLES.map((r) => r.name)

/**
 * The approval chain, named and ordered.
 *
 * The level number is not stored — it is the row's position, so reordering
 * cannot leave two level 2s behind. Each role maps to at most one level,
 * because a reviewer who occupies two levels approves their own escalation.
 *
 * These names are not decoration: the Approvals and Access Requests registers
 * generate their `APPROVED ON (<level>)` / `APPROVED BY (<level>)` column pairs
 * from this list, so renaming a level here renames those columns.
 */
export default function ApprovalLevels({ value }) {
  const { toast, confirm } = useApp()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', role: '', detail: '', sla: 8 })
  const [editing, setEditing] = useState(null)

  const takenRoles = (exceptId) => new Set(value.filter((l) => l.id !== exceptId).map((l) => l.role))

  const roleOptions = (exceptId) => {
    const taken = takenRoles(exceptId)
    return ROLE_NAMES.map((r) => ({ value: r, label: taken.has(r) ? `${r} — already mapped` : r }))
  }

  const problemFor = (d, exceptId) => {
    if (!d.name.trim()) return 'Enter the level name. It becomes a column heading on the approval registers.'
    if (value.some((l) => l.id !== exceptId && l.name.trim().toLowerCase() === d.name.trim().toLowerCase())) {
      return 'Another level already uses this name.'
    }
    if (!d.role) return 'Map the level to the role that reviews at it.'
    if (takenRoles(exceptId).has(d.role)) return 'That role is already mapped to another level.'
    return ''
  }

  const move = (index, dir) => {
    const next = [...value]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    writeSection('approvalLevels', next)
    toast('ok', 'Level moved', `${next[target].name} is now level ${index + 1}; ${next[index].name} is level ${target + 1}.`)
  }

  const add = () => {
    const problem = problemFor(draft, null)
    if (problem) { toast('warn', 'Level not added', problem); return }
    writeSection('approvalLevels', (ls) => [...ls, {
      id: ls.reduce((m, l) => Math.max(m, l.id), 0) + 1,
      name: draft.name.trim(),
      role: draft.role,
      detail: draft.detail.trim() || `${draft.role} reviews at this level`,
      sla: Number(draft.sla) || 8,
    }])
    toast('ok', 'Level added', `${draft.name.trim()} is level ${value.length + 1}, reviewed by ${draft.role}.`)
    setDraft({ name: '', role: '', detail: '', sla: 8 })
    setAdding(false)
  }

  const saveEdit = () => {
    const problem = problemFor(editing, editing.id)
    if (problem) { toast('warn', 'Level not saved', problem); return }
    writeSection('approvalLevels', (ls) => ls.map((l) => (l.id === editing.id ? { ...l, ...editing, name: editing.name.trim(), sla: Number(editing.sla) || 8 } : l)))
    toast('ok', 'Level saved', `The approval registers now show “${editing.name.trim()}” on their decision columns.`)
    setEditing(null)
  }

  const remove = (level, index) => confirm({
    title: `Delete level ${index + 1} — ${level.name}?`,
    body: 'Requests currently waiting at this level move to the next one. Decisions already recorded against it are kept in the audit trail.',
    confirmLabel: 'Delete level',
    onConfirm: () => {
      writeSection('approvalLevels', (ls) => ls.filter((l) => l.id !== level.id))
      toast('ok', 'Level deleted', level.name)
    },
  })

  return (
    <Card
      title="Approval levels"
      sub="Approvals run top to bottom. Level numbers follow the order — use the arrows to move a level up or down."
      actions={<Button size="sm" variant="pri" icon="plus" onClick={() => setAdding(true)}>Add level</Button>}
      footer={(
        <span className="t-xs t-mut">
          The level number is assigned automatically from the order. Each role can be mapped to only one level.
        </span>
      )}
    >
      {value.length === 0 ? (
        <EmptyState
          size="sm"
          icon="approve"
          title="No approval levels"
          body="Every request auto-approves until at least one level is defined."
        />
      ) : (
        <div className="set-levels">
          {value.map((l, i) => (
            editing && editing.id === l.id ? (
              <div className="set-level set-level-edit" key={l.id}>
                <span className="set-level-n">{i + 1}</span>
                <div className="grid grid-2 set-level-form">
                  <Field label="Level name" required htmlFor={`lv-name-${l.id}`}>
                    <TextInput id={`lv-name-${l.id}`} value={editing.name} onChange={(e) => setEditing((d) => ({ ...d, name: e.target.value }))} />
                  </Field>
                  <Field label="Reviewed by role" required htmlFor={`lv-role-${l.id}`}>
                    <Select id={`lv-role-${l.id}`} options={roleOptions(l.id)} value={editing.role} onChange={(e) => setEditing((d) => ({ ...d, role: e.target.value }))} />
                  </Field>
                  <Field label="What this level checks" span={2} htmlFor={`lv-detail-${l.id}`}>
                    <TextInput id={`lv-detail-${l.id}`} value={editing.detail} onChange={(e) => setEditing((d) => ({ ...d, detail: e.target.value }))} />
                  </Field>
                  <Field label="Decision window" hint="Hours before the level breaches its SLA." htmlFor={`lv-sla-${l.id}`}>
                    <TextInput id={`lv-sla-${l.id}`} type="number" min="1" max="240" value={editing.sla} onChange={(e) => setEditing((d) => ({ ...d, sla: e.target.value }))} />
                  </Field>
                </div>
                <div className="set-level-acts">
                  <IconButton icon="check" size="sm" label="Save level" onClick={saveEdit} />
                  <IconButton icon="x" size="sm" label="Cancel" onClick={() => setEditing(null)} />
                </div>
              </div>
            ) : (
              <div className="set-level" key={l.id}>
                <span className="set-level-n">{i + 1}</span>
                <div className="set-level-body">
                  <div className="set-level-t">
                    {l.name}
                    <Tag tone="acc">{l.role}</Tag>
                    <Tag>{l.sla}h window</Tag>
                  </div>
                  <div className="t-xs t-mut">{l.detail}</div>
                </div>
                <div className="set-level-acts">
                  <IconButton icon="chevU" size="sm" label={`Move ${l.name} up`} disabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton icon="chevD" size="sm" label={`Move ${l.name} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)} />
                  <IconButton icon="edit" size="sm" label={`Edit ${l.name}`} onClick={() => setEditing({ ...l })} />
                  <IconButton icon="trash" size="sm" label={`Delete ${l.name}`} onClick={() => remove(l, i)} />
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {adding && (
        <div className="set-level set-level-edit" style={{ marginTop: 10 }}>
          <span className="set-level-n">{value.length + 1}</span>
          <div className="grid grid-2 set-level-form">
            <Field label="Level name" required hint="Becomes the approval column heading." htmlFor="lv-new-name">
              <TextInput id="lv-new-name" value={draft.name} placeholder="Compliance review" onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </Field>
            <Field label="Reviewed by role" required htmlFor="lv-new-role">
              <Select id="lv-new-role" options={roleOptions(null)} value={draft.role} placeholder="Select a role" onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} />
            </Field>
            <Field label="What this level checks" span={2} htmlFor="lv-new-detail">
              <TextInput id="lv-new-detail" value={draft.detail} placeholder="Compliance confirms the grant is inside policy" onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))} />
            </Field>
            <Field label="Decision window" hint="Hours before the level breaches its SLA." htmlFor="lv-new-sla">
              <TextInput id="lv-new-sla" type="number" min="1" max="240" value={draft.sla} onChange={(e) => setDraft((d) => ({ ...d, sla: e.target.value }))} />
            </Field>
          </div>
          <div className="set-level-acts">
            <IconButton icon="check" size="sm" label="Add level" onClick={add} />
            <IconButton icon="x" size="sm" label="Cancel" onClick={() => { setAdding(false); setDraft({ name: '', role: '', detail: '', sla: 8 }) }} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Banner tone="info">
          <span>
            The Approvals and Access Requests registers generate their decision columns from this list —{' '}
            {value.map((l) => <Pill key={l.id} tone="mut">{`Approved on (${l.name})`}</Pill>)}
            {' '}— so renaming a level renames the column.
          </span>
        </Banner>
      </div>
    </Card>
  )
}
