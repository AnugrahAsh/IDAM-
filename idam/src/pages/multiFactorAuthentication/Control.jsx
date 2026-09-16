import IconButton from '../../components/primitives/IconButton'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import { useState } from 'react'

export default function Control({ f, value, onChange }) {
  const [reveal, setReveal] = useState(false)
  if (f.type === 'switch') {
    return (
      <div className="row" style={{ height: 31 }}>
        <Switch checked={!!value} onChange={(v) => onChange(v)} label={f.label} />
        <span className="t-sm t-mut">{value ? 'Enabled' : 'Disabled'}</span>
      </div>
    )
  }
  if (f.type === 'select') {
    return <Select id={f.id} value={value} options={f.options} onChange={(e) => onChange(e.target.value)} />
  }
  if (f.type === 'textarea') {
    return (
      <TextInput
        as="textarea"
        id={f.id}
        rows={3}
        className={f.mono ? 'mono' : ''}
        spellCheck="false"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  if (f.type === 'secret') {
    return (
      <div className="row" style={{ gap: 6 }}>
        <TextInput
          id={f.id}
          className="mono"
          type={reveal ? 'text' : 'password'}
          value={value}
          autoComplete="off"
          spellCheck="false"
          onChange={(e) => onChange(e.target.value)}
        />
        <IconButton
          icon={reveal ? 'eyeoff' : 'eye'}
          label={reveal ? `Hide ${f.label}` : `Reveal ${f.label}`}
          onClick={() => setReveal((r) => !r)}
        />
      </div>
    )
  }
  return (
    <TextInput
      id={f.id}
      type={f.type === 'number' ? 'number' : 'text'}
      className={f.mono ? 'mono' : ''}
      value={value}
      autoComplete="off"
      spellCheck="false"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

