import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { num } from '../../lib/format'
import { useState } from 'react'
import { identifiersFrom, matchIdentifier } from './networkData'

export default function BulkForm({ mode, rows, onApply, onCancel }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Active')
  const [action, setAction] = useState('Keep')
  const [error, setError] = useState('')

  const tokens = identifiersFrom(text)
  const matched = tokens.length === 0 ? [] : rows.filter((r) => tokens.some((t) => matchIdentifier(r, t)))
  const unknown = tokens.filter((t) => !rows.some((r) => matchIdentifier(r, t)))

  const submit = () => {
    if (matched.length === 0) {
      setError('No binding matched the identifiers supplied.')
      return
    }
    onApply(matched.map((r) => r.id), { status, action })
  }

  return (
    <>
      <div className="stack">
        <Banner tone={mode === 'delete' ? 'warn' : 'info'}>
          {mode === 'delete'
            ? 'Every matched binding is removed. Identities left without a binding inherit the tenant default of allow.'
            : 'Every matched binding is updated in a single change. Bindings that do not match are left untouched.'}
        </Banner>
        <Field
          label="Identifiers"
          required
          hint="One UUID, username or email per line. Commas and semicolons are also accepted."
          error={error}
          htmlFor="bulk-ids"
        >
          <TextInput
            as="textarea"
            id="bulk-ids"
            className="mono"
            rows={8}
            value={text}
            placeholder={rows[0] ? `${rows[0].username}\n${rows[0].id}` : ''}
            spellCheck="false"
            onChange={(e) => { setText(e.target.value); setError('') }}
          />
        </Field>

        {mode === 'modify' && (
          <div className="grid grid-2">
            <Field label="Status">
              <Select value={status} options={['Active', 'Disabled']} onChange={(e) => setStatus(e.target.value)} />
            </Field>
            <Field label="Action" hint="Keep leaves the allow or deny decision unchanged.">
              <Select value={action} options={['Keep', 'Allow', 'Deny']} onChange={(e) => setAction(e.target.value)} />
            </Field>
          </div>
        )}

        <div className="stat-strip">
          <div className="stat-cell">
            <span className="stat-k">Identifiers supplied</span>
            <span className="stat-v">{num(tokens.length)}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-k">Bindings matched</span>
            <span className="stat-v">{num(matched.length)}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-k">Not recognized</span>
            <span className="stat-v" style={{ color: unknown.length > 0 ? 'var(--bad)' : undefined }}>{num(unknown.length)}</span>
          </div>
        </div>

        {unknown.length > 0 && (
          <div className="t-xs t-mut">
            Ignored: <span className="mono">{unknown.slice(0, 6).join(', ')}</span>
            {unknown.length > 6 ? ` and ${unknown.length - 6} more` : ''}
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant={mode === 'delete' ? 'danger' : 'pri'}
          icon={mode === 'delete' ? 'trash' : 'save'}
          disabled={matched.length === 0}
          onClick={submit}
        >
          {mode === 'delete' ? `Delete ${matched.length || ''}`.trim() : `Modify ${matched.length || ''}`.trim()}
        </Button>
      </div>
    </>
  )
}

