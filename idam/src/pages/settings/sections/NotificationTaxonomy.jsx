import { useMemo, useState } from 'react'
import Card from '../../../components/primitives/Card'
import Button from '../../../components/primitives/Button'
import IconButton from '../../../components/primitives/IconButton'
import Icon from '../../../components/primitives/Icon'
import Field from '../../../components/primitives/Field'
import TextInput from '../../../components/primitives/TextInput'
import Select from '../../../components/primitives/Select'
import Tag from '../../../components/primitives/Tag'
import Pill from '../../../components/primitives/Pill'
import Banner from '../../../components/primitives/Banner'
import SeverityBadge from '../../../components/primitives/SeverityBadge'
import EmptyState from '../../../components/primitives/EmptyState'
import { useApp } from '../../../store/AppContext'
import { useAnnouncements } from '../../notifications/announcementStore'
import { writeSection } from '../settingsStore'

/**
 * The Notification Center vocabulary.
 *
 * Category and Severity are the two selects an announcement is authored
 * against. They were literal arrays in the module that rendered them, so a
 * tenant that files notices under anything but Announcements, Compliance and
 * Governance had to wait for a build. Both lists are edited here and read
 * everywhere they are offered.
 *
 * Severity carries one piece of machinery the operator has to see: the
 * three-step scale the inbox counts by. A tenant may call a severity anything
 * it likes, but the register's Critical and High tiles have to know which of
 * its own steps that name belongs to, so every authored severity is mapped.
 */

const TONES = [
  { value: 'acc', label: 'Accent — blue' },
  { value: 'info', label: 'Info — light blue' },
  { value: 'ok', label: 'Positive — green' },
  { value: 'warn', label: 'Caution — amber' },
  { value: 'bad', label: 'Critical — red' },
  { value: 'viol', label: 'Violation — purple' },
  { value: 'mut', label: 'Neutral — grey' },
]

/* Marks that mean something in this console already. Offering the whole icon
   set would be a picker; these are the ones an operational notice reads as. */
const ICONS = [
  'bell', 'shield', 'certify', 'sod', 'provision', 'server', 'lock', 'key',
  'users', 'building', 'consent', 'report', 'activity', 'clock', 'warn', 'info',
]

const LEVELS = [
  { value: 'info', label: 'Info — routine' },
  { value: 'high', label: 'High — raised for attention' },
  { value: 'critical', label: 'Critical — act now' },
]

const BLANK_CATEGORY = { label: '', tone: 'acc', icon: 'bell' }
const BLANK_SEVERITY = { label: '', level: 'info' }

const slug = (kind, label) => `${kind}-${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || Date.now()}`

export default function NotificationTaxonomy({ value }) {
  const { toast, confirm } = useApp()
  const announcements = useAnnouncements()
  const [adding, setAdding] = useState(null)   // 'categories' | 'severities' | null
  const [draft, setDraft] = useState(BLANK_CATEGORY)
  const [editing, setEditing] = useState(null) // { kind, ...row }

  const categories = value?.categories || []
  const severities = value?.severities || []

  /* An option that is already carrying announcements cannot be deleted without
     telling the operator what happens to them, so the count is read rather
     than assumed. */
  const usage = useMemo(() => {
    const byCategory = {}
    const bySeverity = {}
    announcements.forEach((a) => {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1
    })
    return { byCategory, bySeverity }
  }, [announcements])

  const listOf = (kind) => (kind === 'categories' ? categories : severities)
  const noun = (kind) => (kind === 'categories' ? 'category' : 'severity')

  const problemFor = (kind, d, exceptId) => {
    const label = String(d.label || '').trim()
    if (!label) return `Enter the ${noun(kind)} name. It is what the author picks from the dropdown.`
    if (listOf(kind).some((x) => x.id !== exceptId && x.label.toLowerCase() === label.toLowerCase())) {
      return `Another ${noun(kind)} already uses this name.`
    }
    return ''
  }

  const move = (kind, index, dir) => {
    const next = [...listOf(kind)]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    writeSection('notificationTaxonomy', (t) => ({ ...t, [kind]: next }))
  }

  const add = (kind) => {
    const problem = problemFor(kind, draft, null)
    if (problem) { toast('warn', `${noun(kind)[0].toUpperCase()}${noun(kind).slice(1)} not added`, problem); return }
    const label = draft.label.trim()
    const row = kind === 'categories'
      ? { id: slug('cat', label), label, tone: draft.tone, icon: draft.icon }
      : { id: slug('sev', label), label, level: draft.level }
    writeSection('notificationTaxonomy', (t) => ({ ...t, [kind]: [...t[kind], row] }))
    toast('ok', `${kind === 'categories' ? 'Category' : 'Severity'} added`, `“${label}” is now offered when an announcement is authored.`)
    setAdding(null)
  }

  const saveEdit = () => {
    const { kind } = editing
    const problem = problemFor(kind, editing, editing.id)
    if (problem) { toast('warn', 'Not saved', problem); return }
    const label = editing.label.trim()
    const before = listOf(kind).find((x) => x.id === editing.id)
    writeSection('notificationTaxonomy', (t) => ({
      ...t,
      [kind]: t[kind].map((x) => (x.id === editing.id
        ? (kind === 'categories'
          ? { ...x, label, tone: editing.tone, icon: editing.icon }
          : { ...x, label, level: editing.level })
        : x)),
    }))
    /* Renaming is a rename, not a new option: announcements already filed under
       the old name follow it, or they would fall out of every filter that
       offers the list. */
    if (before && before.label !== label) {
      const field = kind === 'categories' ? 'category' : 'severity'
      const moved = announcements.filter((a) => a[field] === before.label).length
      if (moved) {
        toast('info', 'Existing notices re-filed', `${moved} ${moved === 1 ? 'announcement moves' : 'announcements move'} from “${before.label}” to “${label}”.`)
      }
    }
    toast('ok', 'Saved', `“${label}” updated across the notification center.`)
    setEditing(null)
  }

  const remove = (kind, row) => {
    const list = listOf(kind)
    if (list.length === 1) {
      toast('warn', 'Cannot delete', `At least one ${noun(kind)} has to remain — it is what the authoring form opens on.`)
      return
    }
    const inUse = kind === 'categories' ? (usage.byCategory[row.label] || 0) : (usage.bySeverity[row.label] || 0)
    confirm({
      title: `Delete the “${row.label}” ${noun(kind)}?`,
      body: inUse
        ? `${inUse} ${inUse === 1 ? 'announcement is' : 'announcements are'} filed under it. They keep the name they were published with, but it will no longer be offered when a notice is authored or filtered.`
        : `It will no longer be offered when an announcement is authored. Nothing published changes.`,
      confirmLabel: `Delete ${noun(kind)}`,
      onConfirm: () => {
        writeSection('notificationTaxonomy', (t) => ({ ...t, [kind]: t[kind].filter((x) => x.id !== row.id) }))
        toast('ok', 'Deleted', row.label)
      },
    })
  }

  const openAdd = (kind) => {
    setEditing(null)
    setDraft(kind === 'categories' ? BLANK_CATEGORY : BLANK_SEVERITY)
    setAdding(kind)
  }

  const editForm = (kind, d, set) => (
    <div className="grid grid-2 set-level-form">
      <Field label="Name" required htmlFor={`tx-${kind}-label`}
        hint={kind === 'categories' ? 'What the author picks from the Category dropdown.' : 'What the author picks from the Severity dropdown.'}>
        <TextInput
          id={`tx-${kind}-label`}
          value={d.label}
          placeholder={kind === 'categories' ? 'Service disruption' : 'urgent'}
          onChange={(e) => set({ label: e.target.value })}
        />
      </Field>
      {kind === 'categories' ? (
        <>
          <Field label="Chip colour" htmlFor={`tx-${kind}-tone`} hint="The colour the category carries on a row.">
            <Select id={`tx-${kind}-tone`} options={TONES} value={d.tone} onChange={(e) => set({ tone: e.target.value })} />
          </Field>
          <Field label="Inbox mark" span={2} htmlFor={`tx-${kind}-icon`} hint="Drawn beside the title in the notification center.">
            <div className="tx-icons" role="radiogroup" aria-label="Inbox mark">
              {ICONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={d.icon === n}
                  aria-label={n}
                  data-on={d.icon === n || undefined}
                  onClick={() => set({ icon: n })}
                >
                  <Icon name={n} size={14} />
                </button>
              ))}
            </div>
          </Field>
        </>
      ) : (
        <Field label="Files as" htmlFor={`tx-${kind}-level`}
          hint="Which of the notification center's three steps this severity is counted under.">
          <Select id={`tx-${kind}-level`} options={LEVELS} value={d.level} onChange={(e) => set({ level: e.target.value })} />
        </Field>
      )}
    </div>
  )

  const row = (kind, x, i) => {
    const list = listOf(kind)
    const used = kind === 'categories' ? (usage.byCategory[x.label] || 0) : (usage.bySeverity[x.label] || 0)

    if (editing && editing.kind === kind && editing.id === x.id) {
      return (
        <div className="set-level set-level-edit" key={x.id}>
          <span className="set-level-n">{i + 1}</span>
          {editForm(kind, editing, (patch) => setEditing((d) => ({ ...d, ...patch })))}
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
            {kind === 'categories'
              ? <Pill tone={x.tone} icon={x.icon}>{x.label}</Pill>
              : <SeverityBadge level={x.level}>{x.label}</SeverityBadge>}
            {i === 0 && <Tag>Default</Tag>}
            {kind === 'severities' && <Tag tone="mut">Files as {x.level}</Tag>}
          </div>
          <div className="t-xs t-mut">
            {used
              ? `${used} ${used === 1 ? 'announcement carries' : 'announcements carry'} this ${noun(kind)}.`
              : `Offered when an announcement is authored. Nothing published carries it yet.`}
          </div>
        </div>
        <div className="set-level-acts">
          <IconButton icon="chevU" size="sm" label={`Move ${x.label} up`} disabled={i === 0} onClick={() => move(kind, i, -1)} />
          <IconButton icon="chevD" size="sm" label={`Move ${x.label} down`} disabled={i === list.length - 1} onClick={() => move(kind, i, 1)} />
          <IconButton icon="edit" size="sm" label={`Edit ${x.label}`} onClick={() => { setAdding(null); setEditing({ kind, ...x }) }} />
          <IconButton icon="trash" size="sm" label={`Delete ${x.label}`} onClick={() => remove(kind, x)} />
        </div>
      </div>
    )
  }

  const list = (kind, { title, sub, emptyIcon, emptyTitle, emptyBody, addLabel, foot }) => (
    <Card
      title={title}
      sub={sub}
      actions={<Button size="sm" variant="pri" icon="plus" onClick={() => openAdd(kind)}>{addLabel}</Button>}
      footer={<span className="t-xs t-mut">{foot}</span>}
    >
      {listOf(kind).length === 0 ? (
        <EmptyState size="sm" icon={emptyIcon} title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="set-levels">{listOf(kind).map((x, i) => row(kind, x, i))}</div>
      )}

      {adding === kind && (
        <div className="set-level set-level-edit" style={{ marginTop: 10 }}>
          <span className="set-level-n">{listOf(kind).length + 1}</span>
          {editForm(kind, draft, (patch) => setDraft((d) => ({ ...d, ...patch })))}
          <div className="set-level-acts">
            <IconButton icon="check" size="sm" label={addLabel} onClick={() => add(kind)} />
            <IconButton icon="x" size="sm" label="Cancel" onClick={() => setAdding(null)} />
          </div>
        </div>
      )}
    </Card>
  )

  return (
    <div className="stack">
      <Banner tone="info">
        These two lists are the Category and Severity dropdowns on an announcement, and the
        filters the notification center offers against them. A change here is live on the next
        authoring screen — nothing already published is rewritten.
      </Banner>

      {list('categories', {
        title: 'Notification categories',
        sub: 'How a notice is filed and filtered in the notification center. The first entry is what a new announcement opens on.',
        addLabel: 'Add category',
        emptyIcon: 'layers',
        emptyTitle: 'No categories',
        emptyBody: 'An announcement cannot be filed until at least one category exists.',
        foot: 'Order sets the dropdown order. The colour and mark are what the category carries on every row that shows it.',
      })}

      {list('severities', {
        title: 'Severity levels',
        sub: 'How urgently a notice reads, and whether it pins to the top of the inbox.',
        addLabel: 'Add severity',
        emptyIcon: 'warn',
        emptyTitle: 'No severity levels',
        emptyBody: 'An announcement cannot be published until at least one severity exists.',
        foot: 'Every severity is counted under one of Info, High or Critical, so the tiles above the notification register stay consistent however the levels are named.',
      })}
    </div>
  )
}
