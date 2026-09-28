import { useState } from 'react'
import Card from '../../../components/primitives/Card'
import Button from '../../../components/primitives/Button'
import IconButton from '../../../components/primitives/IconButton'
import Field from '../../../components/primitives/Field'
import TextInput from '../../../components/primitives/TextInput'
import Select from '../../../components/primitives/Select'
import Tag from '../../../components/primitives/Tag'
import Banner from '../../../components/primitives/Banner'
import SeverityBadge from '../../../components/primitives/SeverityBadge'
import EmptyState from '../../../components/primitives/EmptyState'
import { SkeletonLine } from '../../../components/primitives/Skeleton'
import { useApp } from '../../../store/AppContext'
import SectionSkeleton, { LevelListSkeleton } from './SectionSkeleton'
import { writeSection } from '../settingsStore'

/**
 * The severity register a segregation-of-duties rule is graded against.
 *
 * Severity was a literal four-name array inside the SoD module, so a tenant
 * grading its controls on anything else — "P1", "material", "observation" —
 * had to wait for a build. The list is edited here and read by the rule
 * builder, the control register and the breach register.
 *
 * Each entry carries the badge step it is drawn as, because the registers
 * colour by severity and a tenant's own name for a grade cannot tell them which
 * colour that is.
 */

const BADGES = [
  { value: 'critical', label: 'Critical — red' },
  { value: 'high', label: 'High — amber' },
  { value: 'medium', label: 'Medium — neutral' },
  { value: 'low', label: 'Low — muted' },
]

const BLANK = { label: '', badge: 'medium' }

const slug = (label) => `sod-sev-${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || Date.now()}`

export default function SodSeverities({ value, loading = false }) {
  const { toast, confirm } = useApp()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(BLANK)
  const [editing, setEditing] = useState(null)

  const levels = value?.levels || []

  const problemFor = (d, exceptId) => {
    const label = String(d.label || '').trim()
    if (!label) return 'Enter the severity name. It is what the author picks from the dropdown.'
    if (levels.some((x) => x.id !== exceptId && x.label.toLowerCase() === label.toLowerCase())) {
      return 'Another severity already uses this name.'
    }
    return ''
  }

  /* Order is the dropdown order, and the first entry is what a new rule opens
     on, so it is worth being able to change without deleting and re-adding. */
  const move = (index, dir) => {
    const next = [...levels]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    writeSection('sodSeverities', (t) => ({ ...t, levels: next }))
  }

  const add = () => {
    const problem = problemFor(draft, null)
    if (problem) { toast('warn', 'Severity not added', problem); return }
    const label = draft.label.trim()
    writeSection('sodSeverities', (t) => ({ ...t, levels: [...t.levels, { id: slug(label), label, badge: draft.badge }] }))
    toast('ok', 'Severity added', `“${label}” is now offered when a segregation-of-duties rule is authored.`)
    setAdding(false)
  }

  const saveEdit = () => {
    const problem = problemFor(editing, editing.id)
    if (problem) { toast('warn', 'Not saved', problem); return }
    const label = editing.label.trim()
    writeSection('sodSeverities', (t) => ({
      ...t,
      levels: t.levels.map((x) => (x.id === editing.id ? { ...x, label, badge: editing.badge } : x)),
    }))
    toast('ok', 'Saved', `“${label}” updated across the segregation-of-duties register.`)
    setEditing(null)
  }

  const remove = (row) => {
    if (levels.length === 1) {
      toast('warn', 'Cannot delete', 'At least one severity has to remain — it is what the rule builder opens on.')
      return
    }
    confirm({
      title: `Delete the “${row.label}” severity?`,
      body: 'Rules already graded at this severity keep the grade they were saved with, but it will no longer be offered when a rule is authored.',
      confirmLabel: 'Delete severity',
      onConfirm: () => {
        writeSection('sodSeverities', (t) => ({ ...t, levels: t.levels.filter((x) => x.id !== row.id) }))
        toast('ok', 'Deleted', row.label)
      },
    })
  }

  const editForm = (d, set) => (
    <div className="grid grid-2 set-level-form">
      <Field label="Name" required htmlFor="sod-sev-label" hint="What the author picks from the Severity dropdown.">
        <TextInput id="sod-sev-label" value={d.label} placeholder="material" onChange={(e) => set({ label: e.target.value })} />
      </Field>
      <Field label="Drawn as" htmlFor="sod-sev-badge" hint="The badge step this grade is coloured by on every register that shows it.">
        <Select id="sod-sev-badge" options={BADGES} value={d.badge} onChange={(e) => set({ badge: e.target.value })} />
      </Field>
    </div>
  )

  const row = (x, i) => {
    if (editing && editing.id === x.id) {
      return (
        <div className="set-level set-level-edit" key={x.id}>
          <span className="set-level-n">{i + 1}</span>
          {editForm(editing, (patch) => setEditing((d) => ({ ...d, ...patch })))}
          <div className="set-level-acts">
            <IconButton icon="check" size="sm" label="Save" onClick={saveEdit} />
            <IconButton icon="x" size="sm" label="Cancel" onClick={() => setEditing(null)} />
          </div>
        </div>
      )
    }
    return (
      <div className="set-level" key={x.id}>
        <span className="set-level-n">{i + 1}</span>
        <div className="set-level-body">
          <div className="set-level-t">
            <SeverityBadge level={x.badge}>{x.label}</SeverityBadge>
            {i === 0 && <Tag>Default</Tag>}
            <Tag tone="mut">Drawn as {x.badge}</Tag>
          </div>
          <div className="t-xs t-mut">Offered when a segregation-of-duties rule is created or edited.</div>
        </div>
        <div className="set-level-acts">
          <IconButton icon="chevU" size="sm" label={`Move ${x.label} up`} disabled={i === 0} onClick={() => move(i, -1)} />
          <IconButton icon="chevD" size="sm" label={`Move ${x.label} down`} disabled={i === levels.length - 1} onClick={() => move(i, 1)} />
          <IconButton icon="edit" size="sm" label={`Edit ${x.label}`} onClick={() => { setAdding(false); setEditing({ ...x }) }} />
          <IconButton icon="trash" size="sm" label={`Delete ${x.label}`} onClick={() => remove(x)} />
        </div>
      </div>
    )
  }

/* Held while Settings settles. This section is a register of stored rows, not
   a form the operator arrives already typing into: the add row above the table
   appends to rows that are still on their way, so it holds its place with
   them. */
  if (loading) {
    return (
      <div className="stack">
        {/* The note above the card is one line of standing guidance, so it is
            a bar of that height rather than a card of its own. */}
        <SkeletonLine height={46} />
        {/* Read from the stored grades rather than matched to them by hand: the
            seed is four today, and a count written out here is a count that
            stops being true the first time a tenant adds a fifth. */}
        <SectionSkeleton foot>
          <LevelListSkeleton rows={levels.length || 4} />
        </SectionSkeleton>
      </div>
    )
  }

  return (
    <div className="stack">
      <Banner tone="info">
        This list is the Severity dropdown on a segregation-of-duties rule. A change here is live on
        the next rule authored — nothing already saved is re-graded.
      </Banner>

      <Card
        title="Severity levels"
        sub="How seriously a breach of the rule reads, and the colour it carries on the control register. The first entry is what a new rule opens on."
        actions={<Button size="sm" variant="pri" icon="plus" onClick={() => { setEditing(null); setDraft(BLANK); setAdding(true) }}>Add severity</Button>}
        footer={<span className="t-xs t-mut">Order sets the dropdown order. Every grade is drawn as one of Critical, High, Medium or Low so the register stays legible however the levels are named.</span>}
      >
        {levels.length === 0 ? (
          <EmptyState size="sm" icon="warn" title="No severity levels" body="A segregation-of-duties rule cannot be graded until at least one severity exists." />
        ) : (
          <div className="set-levels">{levels.map(row)}</div>
        )}

        {adding && (
          <div className="set-level set-level-edit" style={{ marginTop: 10 }}>
            <span className="set-level-n">{levels.length + 1}</span>
            {editForm(draft, (patch) => setDraft((d) => ({ ...d, ...patch })))}
            <div className="set-level-acts">
              <IconButton icon="check" size="sm" label="Add severity" onClick={add} />
              <IconButton icon="x" size="sm" label="Cancel" onClick={() => setAdding(false)} />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
