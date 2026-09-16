import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import PairEditor from './PairEditor'
import { LOOKUP_PREFIX, MSG, downloadCsv, toCsvText, validateOptions } from './rules'

const COLUMNS = [
  { key: 'option', label: 'Options', placeholder: 'Human Resources', sample: 'Human Resources' },
  // The value is what identifies an entry, so it is what the added/removed
  // tally counts and what a duplicate is checked against.
  { key: 'value', label: 'Value', mono: true, identity: true, placeholder: 'HR', sample: 'HR' },
]

const blank = () => ({ option: '', value: '' })

/**
 * Create or edit one lookup.
 *
 * The option is the label a person picks; the value is what the system stores
 * and what every smart-populate condition is written against. Saving replaces
 * the option list wholesale, which is also how a lookup is emptied before it
 * can be deleted — so the table always shows the complete list.
 */
export default function LookupEditor({ lookup, existingKeys = [], onSubmit, onCancel }) {
  const [name, setName] = useState(lookup ? lookup.shortName : '')
  const [rows, setRows] = useState(() => (
    lookup && lookup.options.length ? lookup.options.map((o) => ({ ...o })) : [blank()]
  ))
  const [error, setError] = useState('')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Lookup name is required.'); return }
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const clash = existingKeys.filter((k) => !lookup || k !== lookup.key).includes(key)
    if (clash) { setError(MSG.lookupNameTaken); return }
    const message = validateOptions(rows)
    if (message) { setError(message); return }
    const options = rows
      .filter((r) => String(r.option).trim())
      .map((r) => ({ option: String(r.option).trim(), value: String(r.value).trim() }))
    onSubmit({ key: lookup ? lookup.key : key, shortName: trimmed, options })
  }

  // Checked at the moment the pair is added rather than only at Submit: a
  // duplicate value is the one mistake worth catching before it is buried in a
  // list of four hundred.
  const validateNew = (next, current) => {
    if (!next.option) return 'Every row needs an option label.'
    if (!next.value) return 'Every row needs a value.'
    const taken = current.some((r) => String(r.value || '').trim().toLowerCase() === next.value.toLowerCase())
    return taken ? MSG.lookupDuplicateValues : ''
  }

  const downloadCurrent = () => downloadCsv(
    'lookup_options_data.csv',
    toCsvText(['option', 'value'], rows.map((r) => [r.option, r.value])),
  )

  return (
    <>
      {error && <Banner tone="bad">{error}</Banner>}

      <Field
        label="Lookup name"
        required
        hint={`Stored with the ${LOOKUP_PREFIX} prefix, so “Department” is held as ${LOOKUP_PREFIX}Department. Must be unique.`}
      >
        <TextInput
          value={name}
          disabled={!!(lookup && lookup.protected)}
          placeholder="Department"
          onChange={(e) => { setError(''); setName(e.target.value) }}
        />
      </Field>

      <PairEditor
        columns={COLUMNS}
        rows={rows}
        onChange={(next) => { setError(''); setRows(next) }}
        allowRemoveFirst={!!lookup}
        onError={setError}
        sampleFile={(text) => downloadCsv('lookup_sample.csv', text)}
        downloadFile={lookup ? downloadCurrent : undefined}
        downloadLabel="Download options"
        quickAddLabel="Add an option"
        validateNew={validateNew}
      />

      <div className="cfg-note" style={{ marginTop: 12 }}>
        Values must be unique within the lookup; two entries may share an option label. Renaming an option leaves the
        stored value alone, so existing user records and any rule written against that value keep working.
        {lookup && ' Saving replaces the whole list — anything removed from this table is genuinely removed.'}
      </div>

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{lookup ? 'Submit' : 'Create lookup'}</Button>
      </div>
    </>
  )
}
