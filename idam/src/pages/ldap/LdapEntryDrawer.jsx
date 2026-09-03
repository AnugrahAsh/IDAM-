import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { TYPE_META, attributesOf, isOperational } from './directoryTree'

// The attributes of one directory entry. Operational values the server owns are
// shown but never editable; everything else can be changed, added or removed —
// including one value of a multi-valued attribute.
export default function EntryDetails({ app, entry, onSaved }) {
  const [rows, setRows] = useState(() => attributesOf(app, entry))
  const [edit, setEdit] = useState(false)
  const [dirty, setDirty] = useState(false)

  const meta = TYPE_META[entry.type]
  const writable = rows.filter((r) => !isOperational(r.name))

  const patch = (name, fn) => {
    setRows((rs) => rs.map((r) => (r.name === name ? fn(r) : r)))
    setDirty(true)
  }

  return (
    <div className="stack ldap-entry">
      {/* The entry being edited is named here, above everything, because the
          drawer's own chrome is not where an operator looks for it. */}
      <div className="ldap-entry-id">
        <span className="feed-ic" data-tone={entry.type === 'user' ? 'acc' : 'warn'}>
          <Icon name={meta.icon} size={16} />
        </span>
        <span className="ldap-entry-id-m">
          <b>{entry.name}</b>
          <span className="mono trunc">{entry.dn}</span>
        </span>
        <Tag tone={entry.type === 'user' ? 'acc' : undefined}>{meta.label}</Tag>
      </div>

      <div className="ldap-entry-bar">
        <span><b className="num">{rows.length}</b> attributes · {writable.length} writable</span>
        <span className="spacer" />
        {edit ? (
          <>
            <Button size="sm" onClick={() => { setRows(attributesOf(app, entry)); setEdit(false); setDirty(false) }}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="pri"
              icon="save"
              disabled={!dirty}
              onClick={() => { setEdit(false); setDirty(false); onSaved(rows) }}
            >
              Save
            </Button>
          </>
        ) : (
          <Button size="sm" icon="edit" onClick={() => setEdit(true)}>Edit</Button>
        )}
      </div>

      <div className="ldap-attrs">
        {rows.map((r) => {
          const op = isOperational(r.name)
          return (
            <div className="ldap-attr" key={r.name} data-op={op || undefined}>
              <div className="ldap-attr-k">
                <span className="mono">{r.name}</span>
                {op && <Tag>read-only</Tag>}
                {!op && r.values.length > 1 && <span className="t-xs t-mut">{r.values.length} values</span>}
                <span className="spacer" />
                {edit && !op && (
                  <IconButton
                    icon="trash"
                    size="sm"
                    className="ldap-attr-del"
                    label={`Remove the ${r.name} attribute`}
                    onClick={() => { setRows((rs) => rs.filter((x) => x.name !== r.name)); setDirty(true) }}
                  />
                )}
              </div>
              <div className="ldap-attr-v">
                {(r.values.length ? r.values : ['']).map((v, i) => (
                  <span className="ldap-attr-row" key={`${r.name}-${i}`}>
                    <TextInput
                      className="mono"
                      value={v}
                      disabled={op || !edit}
                      onChange={(e) => patch(r.name, (x) => ({
                        ...x,
                        values: x.values.map((old, k) => (k === i ? e.target.value : old)),
                      }))}
                    />
                    {edit && !op && r.values.length > 1 && (
                      <IconButton
                        icon="x"
                        size="sm"
                        className="ldap-attr-del"
                        label={`Remove this ${r.name} value`}
                        onClick={() => patch(r.name, (x) => ({ ...x, values: x.values.filter((_, k) => k !== i) }))}
                      />
                    )}
                  </span>
                ))}
                {edit && !op && (
                  <button
                    type="button"
                    className="link ldap-attr-add"
                    onClick={() => patch(r.name, (x) => ({ ...x, values: [...x.values, ''] }))}
                  >
                    <Icon name="plus" size={11} />add value
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {edit && (
        <Button
          icon="plus"
          onClick={() => {
            setRows((rs) => [...rs.filter((r) => !isOperational(r.name)), { name: `attribute${rs.length}`, values: [''] }, ...rs.filter((r) => isOperational(r.name))])
            setDirty(true)
          }}
        >
          Add attribute
        </Button>
      )}
    </div>
  )
}
