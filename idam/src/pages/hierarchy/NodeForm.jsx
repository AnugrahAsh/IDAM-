import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { useState } from 'react'
import { KINDS } from './hierarchyData'

export default function NodeForm({ initial, parentName, submitLabel, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(initial)
  /* The drawer takes focus when it opens, which blurs the name field before the
     operator has touched it. Blur alone therefore cannot mean "they left it
     empty" — the field has to have been typed in, or submit attempted, before
     an empty name is an error rather than a starting state. */
  const [dirty, setDirty] = useState(false)
  const [touched, setTouched] = useState(false)
  const nameError = touched && !draft.name.trim() ? 'A name is required.' : null

  const submit = () => {
    setTouched(true)
    if (!draft.name.trim()) return
    onSubmit({ ...draft, name: draft.name.trim() })
  }

  return (
    <div className="stack">
      {parentName && (
        <Banner tone="info">The new unit is created under <b>{parentName}</b>.</Banner>
      )}
      <Field label="Name" required error={nameError} htmlFor="hier-name">
        <TextInput
          id="hier-name"
          value={draft.name}
          placeholder="Procurement"
          onBlur={() => dirty && setTouched(true)}
          onChange={(e) => { setDirty(true); setDraft((d) => ({ ...d, name: e.target.value })) }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      <div className="grid grid-2">
        <Field label="Type" htmlFor="hier-kind">
          <Select
            id="hier-kind"
            value={draft.kind}
            options={KINDS}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
          />
        </Field>
        <Field label="Status" htmlFor="hier-status">
          <Select
            id="hier-status"
            value={draft.status}
            options={['Active', 'Disabled']}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          />
        </Field>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="check" onClick={submit}>{submitLabel}</Button>
      </div>
    </div>
  )
}

