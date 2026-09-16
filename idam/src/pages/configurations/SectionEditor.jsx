import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import { MSG } from './rules'

const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase()

/**
 * Create or edit a section.
 *
 * A section carries two names and only one of them moves. The section name is
 * the internal identifier other records point at, so it is fixed once created;
 * the display name is the heading on the user form, and renaming it is the
 * whole point of the edit panel.
 */
export default function SectionEditor({ section, sections = [], onSubmit, onCancel }) {
  const [internal, setInternal] = useState(section ? section.internal : '')
  const [name, setName] = useState(section ? section.name : '')
  const [order, setOrder] = useState(section ? section.order : sections.length + 1)
  const [error, setError] = useState('')

  const submit = () => {
    const secName = internal.trim()
    const display = name.trim()
    if (!secName) { setError('Section name is required.'); return }
    if (!display) { setError('Display name is required.'); return }
    const others = sections.filter((s) => !section || s.id !== section.id)
    // Both comparisons ignore capitalisation, so "personal details" collides
    // with "Personal Details".
    if (others.some((s) => same(s.internal, secName))) { setError(MSG.sectionName); return }
    if (others.some((s) => same(s.name, display))) { setError(MSG.sectionDisplay); return }
    onSubmit({ internal: secName, name: display, order: Number(order) || sections.length + 1 })
  }

  return (
    <>
      {error && <Banner tone="bad">{error}</Banner>}

      <div className="grid grid-2">
        <Field
          label="Section name"
          required
          hint={section ? 'Fixed once created — other records refer to the section by this name.' : 'The internal identifier. Fixed once created.'}
          htmlFor="sec-internal"
        >
          <TextInput
            id="sec-internal"
            className="mono"
            value={internal}
            disabled={!!section}
            placeholder="job_details"
            onChange={(e) => { setError(''); setInternal(e.target.value) }}
          />
        </Field>

        <Field label="Display name" required hint="The heading end users see on the form. Editable at any time." htmlFor="sec-name">
          <TextInput
            id="sec-name"
            value={name}
            placeholder="Job Details"
            onChange={(e) => { setError(''); setName(e.target.value) }}
          />
        </Field>

        <Field label="Display order" hint="Where the heading falls on the user form.">
          <TextInput type="number" min="1" value={order} onChange={(e) => setOrder(e.target.value)} />
        </Field>
      </div>

      <div className="cfg-note" style={{ marginTop: 12 }}>
        Sections are purely organisational. They hold no data, apply no validation and impose no rules — their whole
        job is to make a form of thirty fields readable. Create them before creating attributes: the Section dropdown
        on an attribute lists existing sections only.
      </div>

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{section ? 'Submit' : 'Create section'}</Button>
      </div>
    </>
  )
}
