import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { MULTI_LOOKUPS } from '../configurations/configData'

/**
 * The hierarchy itself, as distinct from a unit inside one.
 *
 * A tenant runs more than one structure over the same identities — an
 * operating one and the one Human Resources maintains — so the thing being
 * named here is the definition, not a node. The lookup is offered at creation
 * because a hierarchy with no source is only half a record; leaving it unset is
 * allowed, and the tree then says so rather than rendering an empty root.
 */
export default function HierarchyForm({ initial, mode = 'add', onSubmit, onCancel }) {
  const [draft, setDraft] = useState(initial)
  /* The drawer takes focus on open, so a blur is not evidence the operator left
     the name empty. Only typing, or attempting to submit, makes it an error. */
  const [dirty, setDirty] = useState(false)
  const [touched, setTouched] = useState(false)
  const nameError = touched && !draft.name.trim() ? 'A name is required.' : null

  const submit = () => {
    setTouched(true)
    if (!draft.name.trim()) return
    onSubmit({ ...draft, name: draft.name.trim(), description: draft.description.trim() })
  }

  return (
    <div className="stack">
      {mode === 'add' && (
        <Banner tone="info">
          A hierarchy is a saved definition, not a copy of the tree. The units below it are rebuilt from the lookup every
          time the source changes.
        </Banner>
      )}

      <Field label="Name" required error={nameError} htmlFor="hf-name">
        <TextInput
          id="hf-name"
          value={draft.name}
          placeholder="Operating hierarchy"
          onBlur={() => dirty && setTouched(true)}
          onChange={(e) => { setDirty(true); setDraft((d) => ({ ...d, name: e.target.value })) }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>

      <Field label="Description" hint="What this structure is used for, in one line." htmlFor="hf-desc">
        <TextInput
          id="hf-desc"
          value={draft.description}
          placeholder="The structure identity scoping is evaluated against."
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />
      </Field>

      {mode === 'add' && (
        <Field
          label="Multi-level lookup"
          hint="The levels this tree is built from. It can be left unset and configured afterwards."
          htmlFor="hf-lookup"
        >
          <Select
            id="hf-lookup"
            value={draft.lookupId == null ? '' : String(draft.lookupId)}
            placeholder="Configure later"
            options={MULTI_LOOKUPS.map((m) => ({ value: String(m.id), label: `${m.name} · ${m.levels.join(' → ')}` }))}
            onChange={(e) => setDraft((d) => ({ ...d, lookupId: e.target.value === '' ? null : Number(e.target.value) }))}
          />
        </Field>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="check" onClick={submit}>
          {mode === 'add' ? 'Create hierarchy' : 'Save hierarchy'}
        </Button>
      </div>
    </div>
  )
}
