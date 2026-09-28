import { useState } from 'react'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import SearchSelect from '../../components/primitives/SearchSelect'
import Switch from '../../components/primitives/Switch'
import Banner from '../../components/primitives/Banner'
import Icon from '../../components/primitives/Icon'
import { REMOTE_SOURCES } from './schedulerApi'
import { CONFIG_SOURCES } from './schedulerModel'

/**
 * One field of a service's configuration schema.
 *
 * Nine declared types, one control each. Nothing here knows which service it is
 * rendering for — a service that wants a new control declares a new type and
 * this is the only file that learns about it.
 *
 * A `string-list` is a free-entry comma-separated list rather than a picker,
 * because the values are addresses, column names and key=value pairs: sets the
 * server cannot enumerate in advance. Everything the server *can* enumerate —
 * applications, organisations, email templates, date attributes — is a
 * `remote-enum` or a `multi-remote-enum`, so a value that does not exist cannot
 * be typed in the first place.
 */

const listToText = (v) => (Array.isArray(v) ? v.join(', ') : String(v || ''))
const textToList = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean)
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

/* Every comma-separated field says so the same way, and a field that carries
   its own example keeps it: "Comma separated, e.g. admin, security_team" tells
   an operator both the format and what belongs in this particular list. */
const listPlaceholder = (example) =>
  `Comma separated, e.g. ${example || 'first_name, last_name, email'}`

/* A remote source may be declared beside the call that fetches it, or beside
   the register it reads from; the descriptor only names it. */
const sourceFor = (name) => REMOTE_SOURCES[name] || CONFIG_SOURCES[name] || null

/**
 * The options, plus whatever is currently stored that is no longer among them.
 *
 * A template that was renamed, an organisation that was removed, an attribute
 * that was typed in free text before this field became a dropdown: dropping any
 * of them would clear the field silently, and a blank field reads as lost
 * configuration rather than as a value that needs revisiting. It stays
 * selected, and it says why it is marked.
 */
const withCurrent = (options, value) => {
  const held = Array.isArray(value) ? value : (value == null || value === '' ? [] : [value])
  const missing = held.filter((v) => !options.some((o) => String(o.value) === String(v)))
  if (!missing.length) return options
  return [...options, ...missing.map((v) => ({ value: v, label: `${v} (no longer available)` }))]
}

/* The input keeps exactly what was typed. Re-rendering the parsed list on every
   keystroke stripped a trailing comma the moment it was entered, so a second
   value could never be started. The list is parsed for the record; the text is
   only rebuilt from it when the value changes from outside. */
function StringListInput({ id, value, placeholder, onChange }) {
  const list = Array.isArray(value) ? value : []
  const [text, setText] = useState(() => listToText(list))
  const shown = sameList(textToList(text), list) ? text : listToText(list)
  return (
    <TextInput
      id={id}
      value={shown}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value)
        onChange(textToList(e.target.value))
      }}
    />
  )
}

export default function ConfigField({ field, value, config = {}, onChange, idPrefix = 'svc-cfg' }) {
  const control = renderControl(field, value, onChange, `${idPrefix}-${field.key}`)
  /* A field may declare a preview: a line under the control showing what the
     values entered above will produce. It is presentation only — the server
     derives the real thing — so it is read from the descriptor rather than
     hand-placed here for one service. */
  const preview = typeof field.preview === 'function' ? field.preview(config) : null
  if (!preview) return control
  return (
    <div className="cfg-field">
      {control}
      <div className="cfg-preview">
        <Icon name="eye" size={11} />
        <span className="trunc">{preview}</span>
      </div>
    </div>
  )
}

function renderControl(field, value, onChange, id) {
  const common = { label: field.label, required: field.required, hint: field.help, htmlFor: id, keepHint: true }

  switch (field.type) {
    case 'boolean':
      return (
        <div className="cfg-switch">
          <div className="cfg-switch-m">
            <label className="cfg-switch-t" htmlFor={id}>{field.label}</label>
            {field.help && <div className="cfg-switch-s">{field.help}</div>}
          </div>
          <Switch checked={!!value} label={field.label} onChange={(v) => onChange(v)} />
        </div>
      )

    case 'integer':
    case 'number':
      return (
        <Field
          {...common}
          hint={field.help || (field.min != null ? `${field.min} – ${field.max}` : undefined)}
        >
          <TextInput
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </Field>
      )

    case 'date':
      return (
        <Field {...common}>
          <TextInput id={id} type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )

    case 'time':
      return (
        <Field {...common}>
          <TextInput id={id} type="time" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )

    case 'enum': {
      const opts = withCurrent(field.options || [], value)
      return (
        <Field {...common}>
          {opts.length > 8 ? (
            <SearchSelect id={id} value={value ?? ''} options={opts} placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <Select id={id} value={value ?? ''} options={opts} onChange={(e) => onChange(e.target.value)} />
          )}
        </Field>
      )
    }

    case 'multi-enum':
      return (
        <Field {...common}>
          <SearchSelect
            id={id}
            multiple
            value={Array.isArray(value) ? value : []}
            options={withCurrent(field.options || [], value)}
            placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      )

    case 'remote-enum':
    case 'multi-remote-enum': {
      const multiple = field.type === 'multi-remote-enum'
      const source = sourceFor(field.source)
      if (!(source && source.configured())) {
        /* An empty remote source behind a required field is not an empty
           dropdown — it is a service that cannot be saved. Say so instead of
           leaving an operator clicking a picker with nothing in it. */
        return (
          <Field label={field.label} required={field.required} hint={field.help}>
            <Banner tone="warn">{source ? source.emptyNotice : 'This list is not available.'}</Banner>
          </Field>
        )
      }
      return (
        <Field {...common}>
          <SearchSelect
            id={id}
            multiple={multiple}
            value={multiple ? (Array.isArray(value) ? value : []) : (value ?? '')}
            options={withCurrent(source.options(), value)}
            placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
            searchPlaceholder={field.searchPlaceholder || 'Search…'}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      )
    }

    case 'string-list': {
      const list = Array.isArray(value) ? value : []
      const over = field.maxItems != null && list.length > field.maxItems
      return (
        <Field
          {...common}
          hint={field.help || 'Separate multiple values with commas.'}
          error={over ? `At most ${field.maxItems} entries.` : undefined}
        >
          <>
            <StringListInput
              id={id}
              value={value}
              placeholder={listPlaceholder(field.placeholder)}
              onChange={onChange}
            />
            {list.length > 0 && (
              <div className="cfg-chips">
                {list.slice(0, 12).map((v, i) => <span className="chip" key={`${v}-${i}`}>{v}</span>)}
                {list.length > 12 && <span className="t-xs t-mut">+{list.length - 12} more</span>}
              </div>
            )}
          </>
        </Field>
      )
    }

    default:
      return (
        <Field {...common}>
          <TextInput
            id={id}
            value={value ?? ''}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      )
  }
}

/** A read-only rendering of the same value, for summaries and detail views. */
export function configValueText(field, value) {
  if (value == null || value === '') return '—'
  if (field.type === 'boolean') return value ? 'Yes' : 'No'
  if (field.type === 'enum' || field.type === 'multi-enum' || field.type === 'remote-enum' || field.type === 'multi-remote-enum') {
    const remote = field.type.endsWith('remote-enum') ? sourceFor(field.source) : null
    const opts = remote ? remote.options() : (field.options || [])
    const label = (v) => opts.find((o) => String(o.value) === String(v))?.label || v
    return Array.isArray(value) ? (value.length ? value.map(label).join(', ') : '—') : label(value)
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return String(value)
}

export function ConfigGroupHead({ title, count }) {
  return (
    <div className="cfg-group-h">
      <Icon name="sliders" size={12} />
      <span>{title}</span>
      {count != null && <span className="cfg-group-n">{count}</span>}
    </div>
  )
}
