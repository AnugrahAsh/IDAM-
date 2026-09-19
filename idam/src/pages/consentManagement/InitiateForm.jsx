import { useState } from 'react'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Banner from '../../components/primitives/Banner'
import Icon from '../../components/primitives/Icon'
import Button from '../../components/primitives/Button'
import Modal from '../../components/primitives/Modal'
import FileDrop from '../../components/primitives/FileDrop'
import { num } from '../../lib/format'

export const EMPLOYEE_TYPES = ['Internal', 'External']

const initiativeErrors = (d) => {
  const out = {}
  if (!d.employeeType) out.employeeType = 'Employee Type is required'
  if (!d.email.trim()) out.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) out.email = 'Enter a valid email address'
  if (!d.firstName.trim()) out.firstName = 'First name is required'
  if (!d.lastName.trim()) out.lastName = 'Last name is required'
  if (!d.consentId) out.consentId = 'Consent policy is required'
  return out
}

/**
 * User Consent Initiative: sends one consent request to one person. `onSubmit`
 * receives the form and the chosen consent.
 */
export function ConsentInitiativeModal({ consents, preselect, onSubmit, onClose }) {
  const [d, setD] = useState({
    employeeType: '', email: '', firstName: '', lastName: '',
    consentId: preselect ? String(preselect.id) : '',
  })
  const [attempted, setAttempted] = useState(false)
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const errors = initiativeErrors(d)
  const err = (k) => (attempted ? errors[k] : undefined)

  const submit = () => {
    setAttempted(true)
    if (Object.keys(errors).length) return
    onSubmit({ ...d, email: d.email.trim(), firstName: d.firstName.trim(), lastName: d.lastName.trim() },
      consents.find((c) => String(c.id) === d.consentId))
  }

  return (
    <Modal
      title="User Consent Initiative"
      icon="bell"
      closable
      onClose={onClose}
      footer={<Button variant="pri" onClick={submit}>Submit</Button>}
    >
      <div className="grid grid-2">
        <Field label="Employee Type" required error={err('employeeType')} htmlFor="uci-type">
          <Select id="uci-type" value={d.employeeType} placeholder="Select Employee Type" options={EMPLOYEE_TYPES} onChange={(e) => set('employeeType', e.target.value)} />
        </Field>
        <Field label="Email" required error={err('email')} htmlFor="uci-email">
          <TextInput id="uci-email" type="email" autoComplete="off" value={d.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="First Name" required error={err('firstName')} htmlFor="uci-first">
          <TextInput id="uci-first" value={d.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </Field>
        <Field label="Last Name" required error={err('lastName')} htmlFor="uci-last">
          <TextInput id="uci-last" value={d.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </Field>
        <Field label="Consent Policy" required span={2} error={err('consentId')} htmlFor="uci-policy">
          <Select
            id="uci-policy"
            value={d.consentId}
            placeholder="Select Consent Policy"
            options={consents.map((c) => ({ value: String(c.id), label: c.name }))}
            onChange={(e) => set('consentId', e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

export const CSV_HEADERS = ['employee_type', 'email', 'first_name', 'last_name', 'consent_code']

// Splits one CSV line, honouring double-quoted fields that contain commas.
const splitCsvLine = (line) => {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1 } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { out.push(cur.trim()); cur = '' } else cur += ch
  }
  out.push(cur.trim())
  return out
}

const downloadSample = (code) => {
  const csv = [
    CSV_HEADERS.join(','),
    `Internal,priya.nair@tanflow.com,Priya,Nair,${code}`,
    `External,alex.moore@example.com,Alex,Moore,${code}`,
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'consent-initiation-sample.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Import Consent Initiation: one consent request per CSV row. `onImport`
 * receives the valid rows (each with its consent) and the number skipped.
 */
export function ImportInitiationForm({ consents, sampleCode, onCancel, onImport }) {
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')

  const read = (files) => {
    const f = files[0]
    const reader = new FileReader()
    reader.onload = () => {
      const lines = String(reader.result || '').split(/\r?\n/).filter((l) => l.trim())
      setFile(f)
      if (lines.length === 0) {
        setParsed(null)
        setError('The file is empty.')
        return
      }
      const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
      if (headers.join(',') !== CSV_HEADERS.join(',')) {
        setParsed(null)
        setError(`Headers must match exactly: ${CSV_HEADERS.join(', ')}.`)
        return
      }
      const byCode = new Map(consents.map((c) => [String(c.code).toLowerCase(), c]))
      const rows = lines.slice(1).map((line) => {
        const [employeeType, email, firstName, lastName, code] = splitCsvLine(line)
        const type = EMPLOYEE_TYPES.find((t) => t.toLowerCase() === String(employeeType || '').toLowerCase())
        const consent = byCode.get(String(code || '').toLowerCase())
        const ok = type && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') && firstName && lastName && consent
        return { employeeType: type, email, firstName, lastName, consent, ok: !!ok }
      })
      setParsed(rows)
      setError(rows.length === 0 ? 'The file has headers but no rows.' : '')
    }
    reader.onerror = () => {
      setFile(null)
      setParsed(null)
      setError(`${f.name} could not be read.`)
    }
    reader.readAsText(f)
  }

  const valid = parsed ? parsed.filter((r) => r.ok) : []

  const submit = () => {
    if (!file) {
      setError('Please upload CSV file')
      return
    }
    if (!parsed || error) return
    if (valid.length === 0) {
      setError('No row could be imported. Check each employee type, email, name and consent code.')
      return
    }
    onImport(valid, parsed.length - valid.length)
  }

  return (
    <div className="stack">
      <Banner tone="info">
        <b>CSV File Requirements</b>
        <ul className="ci-reqs">
          <li>File must be CSV format</li>
          <li>First row must contain headers</li>
          <li>Headers must match exactly: <span className="mono">{CSV_HEADERS.join(', ')}</span></li>
        </ul>
        <button type="button" className="link ci-sample" onClick={() => downloadSample(sampleCode)}>
          <Icon name="download" size={12} />Download Sample CSV File
        </button>
      </Banner>

      <Field label="Upload CSV File" error={error || undefined}>
        <FileDrop
          accept=".csv"
          label={file ? file.name : 'Choose a CSV file, or drag it here'}
          hint={parsed
            ? `${num(parsed.length)} ${parsed.length === 1 ? 'row' : 'rows'} · ${num(valid.length)} valid${parsed.length > valid.length ? ` · ${num(parsed.length - valid.length)} will be skipped` : ''}`
            : 'CSV file only'}
          onFiles={read}
        />
      </Field>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="upload" onClick={submit}>Submit</Button>
      </div>
    </div>
  )
}
