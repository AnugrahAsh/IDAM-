import { useState } from 'react'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { ATTRS, LOOKUPS, ORGS, USERS } from '../../data/seed'
import { ATTRIBUTE_META } from './campaignUsers'

const MANAGERS = USERS.map((u) => `${u.firstName} ${u.lastName}`)

const optionsFor = (attr) => {
  if (attr.src === 'organizations') return ORGS
  if (attr.src === 'managers') return MANAGERS
  return LOOKUPS[attr.src] || []
}

/* The attributes a recertification reviews, grouped the way the identity form
   groups them. */
export const sectionsForReview = () => {
  const out = []
  ATTRIBUTE_META.forEach((m) => {
    let s = out.find((x) => x.id === m.section)
    if (!s) { s = { id: m.section, name: m.sectionName, attrs: [] }; out.push(s) }
    s.attrs.push({ ...m, ...(ATTRS.find((a) => a.id === m.id) || {}) })
  })
  return out
}

const USERNAME = ATTRS.find((a) => a.id === 'username')

export const missingRequired = (values) => sectionsForReview()
  .flatMap((s) => s.attrs)
  .filter((a) => a.req && !String(values[a.id] ?? '').trim())

/**
 * Edit a campaign user's details for one approval level, section by section.
 * Username identifies the record and is never editable here.
 */
export default function UserDetailsForm({ value, onChange, attempted, username }) {
  const sections = sectionsForReview().map((s) => (s.id === USERNAME.section
    ? { ...s, attrs: [...s.attrs, { ...USERNAME, readOnly: true }].sort((a, b) => a.order - b.order) }
    : s))
  const [open, setOpen] = useState(() => new Set([sections[0]?.id]))
  const toggle = (id) => setOpen((o) => {
    const n = new Set(o)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })
  const set = (id, v) => onChange({ ...value, [id]: v })

  return (
    <div className="stack">
      {sections.map((s) => {
        const expanded = open.has(s.id)
        const invalid = attempted && s.attrs.some((a) => a.req && !String(value[a.id] ?? '').trim())
        return (
          <section key={s.id} className="rl-section">
            <button type="button" className="rl-section-h" aria-expanded={expanded} onClick={() => toggle(s.id)}>
              <Icon name={expanded ? 'chevD' : 'chevR'} size={14} />
              <span>{s.name}</span>
              <span className="t-xs t-mut">{s.attrs.length} fields</span>
              {invalid && <span className="t-xs rl-section-err">Required fields missing</span>}
            </button>
            {expanded && (
              <div className="grid grid-2 rl-section-b">
                {s.attrs.map((a) => {
                  if (a.readOnly) {
                    return (
                      <Field key={a.id} label={a.label} required={a.req} hint="Identifies the record — not editable.">
                        <TextInput value={username || ''} disabled />
                      </Field>
                    )
                  }
                  const v = value[a.id] ?? ''
                  const err = attempted && a.req && !String(v).trim() ? `${a.label} is required.` : undefined
                  if (a.type === 'select' || a.type === 'lookup') {
                    const opts = optionsFor(a)
                    const list = v && !opts.includes(v) ? [v, ...opts] : opts
                    return (
                      <Field key={a.id} label={a.label} required={a.req} error={err}>
                        <Select value={v} placeholder={`Select ${a.label.toLowerCase()}`} options={list} onChange={(e) => set(a.id, e.target.value)} />
                      </Field>
                    )
                  }
                  return (
                    <Field key={a.id} label={a.label} required={a.req} error={err}>
                      <TextInput
                        type={a.type === 'email' || a.type === 'tel' || a.type === 'date' ? a.type : 'text'}
                        value={v}
                        placeholder={`Enter ${a.label.toLowerCase()}`}
                        onChange={(e) => set(a.id, e.target.value)}
                      />
                    </Field>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
