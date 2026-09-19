import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import { useState } from 'react'
import { APP_NAMES, USERNAMES, validAddress } from './networkData'

export default function ImportForm({ onCancel, onImport }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      setError('Paste at least one policy line.')
      return
    }
    const parsed = []
    const rejected = []
    lines.forEach((line) => {
      const cells = line.split(',').map((c) => c.trim())
      const [username, application, ipAddress, action, status, order] = cells
      if (!username || !application || !validAddress(ipAddress || '')) {
        rejected.push(line)
        return
      }
      parsed.push({
        username,
        application,
        ipAddress,
        action: action === 'Deny' ? 'Deny' : 'Allow',
        status: status === 'Disabled' ? 'Disabled' : 'Active',
        order: Number(order) > 0 ? Number(order) : 1,
        note: 'Imported',
      })
    })
    if (parsed.length === 0) {
      setError('No line could be read. Expected username, application, ip address, action, status, order.')
      return
    }
    onImport(parsed, rejected)
  }

  return (
    <>
      <div className="stack">
        <Banner tone="info">
          One binding per line as{' '}
          <span className="mono">username, application, ip address, action, status, order</span>. Action, status and
          order are optional and default to Allow, Active and 1.
        </Banner>
        <Field
          label="Policy definitions"
          required
          hint="Paste the export from another tenant or a change ticket."
          error={error}
          htmlFor="ip-import"
        >
          <TextInput
            as="textarea"
            id="ip-import"
            className="mono"
            rows={10}
            value={text}
            placeholder={`${USERNAMES[0]}, ${APP_NAMES[0]}, 10.4.18.0/24, Allow, Active, 1`}
            spellCheck="false"
            onChange={(e) => { setText(e.target.value); setError('') }}
          />
        </Field>
      </div>

      <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="upload" onClick={submit}>Import policy</Button>
      </div>
    </>
  )
}

