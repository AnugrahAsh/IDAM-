import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import PairEditor from './PairEditor'
import {
  MSG, OPERATORS, downloadCsv, toCsvText, validateCondition, validateConditionRows,
} from './rules'

const COLUMNS = [
  { key: 'condition', label: 'Condition', mono: true, identity: true, placeholder: "department = 'ENG'", sample: "department = 'ENG'" },
  { key: 'value', label: 'Value', placeholder: 'Bengaluru', sample: 'Bengaluru' },
]

const blank = () => ({ condition: '', value: '' })

/**
 * Create or edit one smart-populate rule set.
 *
 * Conditions are validated against the live attribute list as they are typed,
 * because a typo in an attribute name is by far the most common mistake and it
 * is otherwise silent: the expression parses, and the rule simply never fires.
 */
export default function SmartPopulateEditor({ rule, rules = [], attrs = [], onSubmit, onCancel }) {
  const [name, setName] = useState(rule ? rule.name : '')
  const [rows, setRows] = useState(() => (
    rule && rule.conditions.length ? rule.conditions.map((c) => ({ ...c })) : [blank()]
  ))
  const [error, setError] = useState('')

  const attrNames = attrs.map((a) => a.id)
  const rowError = (r) => (String(r.condition || '').trim() ? validateCondition(r.condition, attrNames) : '')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Smart Populate name is required.'); return }
    // The uniqueness check ignores capitalisation, and excludes the record
    // being edited so keeping the same name is fine.
    const clash = rules.some((r) => (!rule || r.id !== rule.id)
      && r.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (clash) { setError(MSG.smartExists); return }
    const message = validateConditionRows(rows, attrNames)
    if (message) { setError(message); return }
    onSubmit({
      name: trimmed,
      conditions: rows
        .filter((r) => String(r.condition).trim())
        .map((r) => ({ condition: String(r.condition).trim(), value: String(r.value).trim() })),
    })
  }

  // A condition is checked as it is added, not only at Submit, because a
  // mistyped attribute name is otherwise silent: the rule parses and never fires.
  const validateNew = (next) => {
    if (!next.condition) return 'Enter a condition.'
    const err = validateCondition(next.condition, attrNames)
    if (err) return err
    return next.value ? '' : `A value is required for: ${next.condition}`
  }

  const downloadCurrent = () => downloadCsv(
    'smart_populate_conditions.csv',
    toCsvText(['condition', 'value'], rows.map((r) => [r.condition, r.value])),
  )

  const problems = rows.map(rowError).filter(Boolean)

  return (
    <>
      {error && <Banner tone="bad">{error}</Banner>}

      <Field label="Smart Populate name" required hint="Shown in the attribute setup dropdown. Must be unique; the check ignores capitalisation.">
        <TextInput
          value={name}
          placeholder="Office mapping"
          onChange={(e) => { setError(''); setName(e.target.value) }}
        />
      </Field>

      <PairEditor
        columns={COLUMNS}
        rows={rows}
        onChange={(next) => { setError(''); setRows(next) }}
        allowRemoveFirst={false}
        onError={setError}
        sampleFile={(text) => downloadCsv('smart_populate_sample.csv', text)}
        downloadFile={rule ? downloadCurrent : undefined}
        downloadLabel="Download conditions"
        quickAddLabel="Add a condition"
        validateNew={validateNew}
        uploadNote="The file becomes the entire condition list. Nothing is merged."
      />

      {problems.length > 0 && (
        <div className="cfg-errors">
          {problems.map((p) => <div key={p} className="cfg-error-row">{p}</div>)}
        </div>
      )}

      <div className="cfg-note" style={{ marginTop: 12 }}>
        <div>
          The left-hand side is an attribute name from the Attributes tab — the internal name, not the display name.
          Clauses combine with AND and OR and group with parentheses, for example
          <code className="mono"> (department = &#39;ENG&#39; AND grade &gt; &#39;3&#39;) OR location = &#39;BLR&#39;</code>.
        </div>
        <div className="cfg-ops">
          <span className="t-xs t-mut">Operators</span>
          {OPERATORS.map((op) => <Tag key={op}>{op}</Tag>)}
        </div>
        <div>
          Compare against the lookup&#39;s <b>value</b>, never its option label. If the Department lookup stores
          <code className="mono"> ENG</code> behind &ldquo;Engineering&rdquo;, write
          <code className="mono"> department = &#39;ENG&#39;</code>. Writing the label parses cleanly and then never matches.
        </div>
      </div>

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{rule ? 'Submit' : 'Create rule set'}</Button>
      </div>
    </>
  )
}
