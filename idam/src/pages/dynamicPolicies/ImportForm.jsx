import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import { num } from '../../lib/format'
import { SAMPLE_IMPORT, matchUsers, parseExpression } from './policyPageData'

export default function ImportForm({ onCancel, onImport }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const read = (raw) => {
    try {
      const parsed = JSON.parse(raw)
      return { list: Array.isArray(parsed) ? parsed : [parsed], bad: false }
    } catch {
      return { list: [], bad: true }
    }
  }

  const usable = (p) => p && typeof p === 'object' && String(p.name || '').trim() && String(p.condition || '').trim()
  const preview = text.trim() ? read(text) : { list: [], bad: false }
  const ready = preview.list.filter(usable)

  const submit = () => {
    if (!text.trim()) { setError('Paste at least one policy definition.'); return }
    if (preview.bad) { setError('The definition is not valid JSON.'); return }
    if (ready.length === 0) { setError('Every policy needs at least a name and a condition.'); return }
    onImport(ready, preview.list.length - ready.length)
  }

  return (
    <>
      <div className="stack">
        <Banner tone="info">
          Paste a single policy object or an array of them. Imported policies always arrive inactive so you can
          simulate them against the live directory before they assign anything.
        </Banner>
        <Field label="Policy definitions" required hint="Recognised keys: name, description, condition, groupType, group — one group name or an array of them." error={error} htmlFor="policy-import">
          <TextInput
            as="textarea"
            id="policy-import"
            className="mono"
            rows={12}
            value={text}
            spellCheck="false"
            placeholder={SAMPLE_IMPORT}
            onChange={(e) => { setText(e.target.value); setError('') }}
          />
        </Field>
        <div className="stat-strip">
          <div className="stat-cell"><span className="stat-k">Definitions read</span><span className="stat-v">{num(preview.list.length)}</span></div>
          <div className="stat-cell"><span className="stat-k">Ready to import</span><span className="stat-v">{num(ready.length)}</span></div>
          <div className="stat-cell"><span className="stat-k">Identities reached</span><span className="stat-v">{num(ready.reduce((a, p) => a + matchUsers(parseExpression(p.condition)).length, 0))}</span></div>
        </div>
        {preview.bad && text.trim() && <div className="t-xs" style={{ color: 'var(--bad)' }}>The pasted text is not valid JSON yet.</div>}
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="upload" disabled={ready.length === 0} onClick={submit}>Import policy</Button>
      </div>
    </>
  )
}
