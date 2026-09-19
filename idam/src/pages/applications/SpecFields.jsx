import { useRef, useState } from 'react'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Switch from '../../components/primitives/Switch'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Button from '../../components/primitives/Button'
import FileDrop from '../../components/primitives/FileDrop'
import { parseMetadataXml } from './appModel'

/**
 * A field that holds several values.
 *
 * Redirect URLs, web origins and post-logout URLs are lists in the
 * specification and were edited as a textarea, which made "how many are
 * configured" a question about counting lines and let a stray blank line become
 * an entry. Values are entered one at a time and shown as removable rows, and
 * the stored value stays a newline-joined string so every reader downstream —
 * the review step, the metadata export — is unchanged.
 */
export function MultiValueInput({ id, value, placeholder, onChange, mono = true }) {
  const [entry, setEntry] = useState('')
  const list = String(value || '').split('\n').map((v) => v.trim()).filter(Boolean)
  const commit = (next) => onChange(next.join('\n'))

  // A paste from a ticket arrives as several addresses at once, so every
  // separator a keyboard produces is accepted rather than only Enter.
  const add = () => {
    const tokens = entry.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)
    if (!tokens.length) return
    const seen = new Set(list)
    const accepted = tokens.filter((t) => !seen.has(t) && seen.add(t))
    if (accepted.length) commit([...list, ...accepted])
    setEntry('')
  }

  return (
    <div className="mv">
      <div className="mv-add">
        <TextInput
          id={id}
          className={mono ? 'mono' : undefined}
          value={entry}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <Button size="sm" icon="plus" disabled={!entry.trim()} onClick={add}>Add</Button>
      </div>
      {list.length > 0 && (
        <ul className="mv-list">
          {list.map((v) => (
            <li className="mv-row" key={v}>
              <span className={mono ? 'mono trunc' : 'trunc'} title={v}>{v}</span>
              <IconButton
                icon="x"
                size="sm"
                label={`Remove ${v}`}
                onClick={() => commit(list.filter((x) => x !== v))}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="mv-foot">
        {list.length === 0
          ? 'None added yet. Enter a value and press Add — several may be pasted at once.'
          : `${list.length} ${list.length === 1 ? 'value' : 'values'} configured.`}
      </div>
    </div>
  )
}

/**
 * The XML metadata upload rendered by a `metadata` field.
 *
 * The descriptor is not a substitute for the endpoint fields — it is a way of
 * filling them in. It used to replace them: importing metadata hid the entity
 * ID, ACS URL, logout URL and certificate entirely, so what had actually been
 * read out of the file could not be checked, and a descriptor missing one of
 * them left no way to supply it by hand. Importing writes into those fields and
 * leaves them on screen.
 */
function MetadataField({ id, value, onChange }) {
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const read0 = value ? parseMetadataXml(value) : null
  const parsed = read0 && read0.entityId ? read0 : null

  const read = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const probe = parseMetadataXml(text)
      if (!probe.entityId) {
        setError('That file does not look like a SAML EntityDescriptor document — no entityID was found.')
        return
      }
      setError('')
      onChange(text, {
        clientId: probe.entityId || undefined,
        acsUrl: probe.acs || undefined,
        logoutRedirectUrl: probe.slo || undefined,
        certificate: probe.certificate || undefined,
      })
    }
    reader.readAsText(file)
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <input
        ref={fileRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        style={{ display: 'none' }}
        aria-label="Upload service provider metadata"
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; read(f) }}
      />
      <FileDrop
        accept=".xml"
        label={value ? 'Metadata loaded — drop another file to replace it' : 'Drop the metadata XML, or choose a file'}
        onFiles={(files) => read(files && files[0])}
      />
      <div className="row">
        <Button size="sm" icon="upload" onClick={() => fileRef.current && fileRef.current.click()}>Choose XML file</Button>
        {value && (
          <Button size="sm" icon="x" onClick={() => { onChange(''); setError('') }}>Remove metadata</Button>
        )}
      </div>
      {error && <div className="banner" data-tone="warn"><Icon name="warn" size={15} /><div>{error}</div></div>}
      {parsed && (
        <div className="mv-list">
          {[
            ['Entity ID', parsed.entityId],
            ['Assertion consumer URL', parsed.acs],
            ['Logout URL', parsed.slo],
            ['Signing certificate', parsed.certificate ? 'Included in the descriptor' : 'Not present'],
          ].map(([k, v]) => (
            <div className="mv-row" key={k}>
              <span className="t-xs t-mut" style={{ width: 170, flex: 'none' }}>{k}</span>
              <span className="mono t-xs trunc" title={v || '—'}>{v || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Renders one field of the specification.
 *
 * Toggles are laid out as a labelled row rather than a Field, because a
 * capability switch reads as a statement about the client ("standard flow is
 * on") and a hint under a select reads as instruction for a value. A section
 * marked `toggleStyle: 'card'` draws each switch as a bordered tile instead, so
 * a card of eight capabilities reads as a set of choices rather than a list.
 */
function SpecField({ f, value, onChange, error, toggleStyle }) {
  if (f.type === 'toggle') {
    const on = !!value
    if (toggleStyle === 'card') {
      return (
        <div className="sso-switch" data-on={on || undefined} style={f.span === 2 ? { gridColumn: '1 / -1' } : undefined}>
          <div className="sso-switch-h">
            <span className="sso-switch-t">{f.label}</span>
            <Switch checked={on} onChange={(v) => onChange(f.id, v)} label={f.label} />
          </div>
          {f.hint && <div className="sso-switch-s">{f.hint}</div>}
        </div>
      )
    }
    return (
      <div className="sso-toggle" style={f.span === 2 ? { gridColumn: '1 / -1' } : undefined}>
        <div className="sso-toggle-m">
          <div className="sso-toggle-t">{f.label}</div>
          {f.hint && <div className="sso-toggle-s">{f.hint}</div>}
        </div>
        <Switch checked={on} onChange={(v) => onChange(f.id, v)} label={f.label} />
      </div>
    )
  }

  const common = { id: `sf-${f.id}`, value: value ?? '', onChange: (e) => onChange(f.id, e.target.value) }

  return (
    <Field
      label={f.label}
      required={f.required}
      hint={f.hint}
      error={error}
      span={f.type === 'list' || f.type === 'metadata' ? 2 : f.span}
      htmlFor={`sf-${f.id}`}
    >
      {f.type === 'select' && <Select {...common} options={f.options} />}
      {f.type === 'textarea' && <TextInput {...common} as="textarea" rows={f.id === 'certificate' ? 5 : 3} placeholder={f.placeholder} />}
      {f.type === 'list' && (
        <MultiValueInput
          id={`sf-${f.id}`}
          value={value}
          placeholder={f.placeholder}
          onChange={(next) => onChange(f.id, next)}
        />
      )}
      {f.type === 'metadata' && (
        <MetadataField id={`sf-${f.id}`} value={value} onChange={(next, prefill) => onChange(f.id, next, prefill)} />
      )}
      {f.type === 'number' && (
        <span className="sso-num">
          <TextInput {...common} type="number" min="0" />
          {f.unit && <span className="sso-num-u">{f.unit}</span>}
        </span>
      )}
      {f.type === 'file' && (
        <FileDrop
          accept="image/*"
          label={value ? String(value) : 'Drop an image, or choose a file'}
          onFiles={(files) => onChange(f.id, files && files[0] ? files[0].name : '')}
        />
      )}
      {!['select', 'textarea', 'list', 'metadata', 'number', 'file'].includes(f.type) && (
        <TextInput {...common} placeholder={f.placeholder} />
      )}
    </Field>
  )
}

/**
 * One section of the specification.
 *
 * Advanced sections start collapsed and say how many fields are inside, so the
 * operator knows what they are choosing not to open. Every one of them already
 * holds the recommended default, which is what makes collapsing them safe.
 */
export function SpecSection({ section, values, onChange, errors = {}, forceOpen = false }) {
  const [open, setOpen] = useState(!section.advanced)
  const isOpen = forceOpen || open
  const invalid = section.fields.some((f) => errors[f.id])

  return (
    <Card
      title={section.title}
      sub={section.sub}
      actions={section.advanced ? (
        <button
          type="button"
          className="sso-disclose"
          aria-expanded={isOpen}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={isOpen ? 'chevD' : 'chevR'} size={12} />
          {isOpen ? 'Hide' : `Show ${section.fields.length} settings`}
        </button>
      ) : undefined}
      className={invalid ? 'sso-sec-bad' : ''}
    >
      {isOpen ? (
        <div className="grid grid-2 sso-grid">
          {section.fields.map((f) => (
            <SpecField
              key={f.id}
              f={f}
              value={values[f.id]}
              error={errors[f.id]}
              onChange={onChange}
              toggleStyle={section.toggleStyle}
            />
          ))}
        </div>
      ) : (
        <div className="sso-collapsed">
          <Icon name="check" size={13} />
          {section.fields.length} settings held at their recommended defaults.
        </div>
      )}
    </Card>
  )
}

export default SpecField
