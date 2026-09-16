import { useMemo, useRef, useState } from 'react'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { parseCsv } from './csv'
import { MSG, headersMatch, toCsvText } from './rules'

/**
 * The two-column entry table shared by Lookups and Smart Populate.
 *
 * Two things are true at once here and the panel has to hold both.
 *
 * The server replaces the option list wholesale — Submit clears what is stored
 * and inserts what was sent — so the table has to show the complete list, not a
 * queue of pending additions. But the everyday job is "add one option" or
 * "remove one option", and making an operator re-edit a 400-row list to do that
 * is absurd.
 *
 * The resolution: adding and removing are single, immediate actions against the
 * working list (a quick-add strip, a per-row + and a per-row Remove), while the
 * list itself stays complete and visible and Submit still sends all of it. The
 * running tally under the table says what changed and states that the whole list
 * is what gets submitted, so neither half of the behaviour is a surprise.
 */
export default function PairEditor({
  columns,
  rows,
  onChange,
  allowRemoveFirst = true,
  sampleFile,
  downloadFile,
  downloadLabel = 'Download current data',
  onError,
  uploadNote,
  quickAddLabel = 'Add an option',
  validateNew,
}) {
  const [method, setMethod] = useState('manual')
  const [fileName, setFileName] = useState('')
  const [draft, setDraft] = useState(() => Object.fromEntries(columns.map((c) => [c.key, ''])))
  const [filter, setFilter] = useState('')
  const fileRef = useRef(null)
  const keys = columns.map((c) => c.key)
  const identity = (columns.find((c) => c.identity) || columns[columns.length - 1]).key

  // What the list held when the panel opened, so the tally can say what this
  // edit actually changes rather than only how long the list is now.
  const original = useRef(null)
  if (original.current === null) {
    original.current = new Set(rows.map((r) => String(r[identity] || '').trim().toLowerCase()).filter(Boolean))
  }

  const blank = () => Object.fromEntries(keys.map((k) => [k, '']))
  const setCell = (i, key, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  const insertAfter = (i) => onChange([...rows.slice(0, i + 1), blank(), ...rows.slice(i + 1)])
  const removeRow = (i) => onChange(rows.filter((_, j) => j !== i))

  const addDraft = () => {
    const next = Object.fromEntries(keys.map((k) => [k, String(draft[k] || '').trim()]))
    if (keys.every((k) => !next[k])) return
    const message = validateNew ? validateNew(next, rows) : ''
    if (message) { onError(message); return }
    onError('')
    onChange([...rows.filter((r) => keys.some((k) => String(r[k] || '').trim())), next])
    setDraft(blank())
  }

  const tally = useMemo(() => {
    const live = rows.map((r) => String(r[identity] || '').trim().toLowerCase()).filter(Boolean)
    const liveSet = new Set(live)
    return {
      total: live.length,
      added: live.filter((v) => !original.current.has(v)).length,
      removed: [...original.current].filter((v) => !liveSet.has(v)).length,
    }
  }, [rows, identity])

  const sampleText = toCsvText(keys, [keys.map((k) => (columns.find((c) => c.key === k) || {}).sample || '')])

  const needle = filter.trim().toLowerCase()
  const shown = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !needle || keys.some((k) => String(r[k] || '').toLowerCase().includes(needle)))

  const readFile = (file) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ''))
      if (parsed.length === 0 || !headersMatch(parsed[0], keys)) {
        onError(MSG.csvHeaders)
        setFileName('')
        return
      }
      // The upload defines the whole list, so the parsed body replaces the
      // table rather than being appended to it.
      const body = parsed.slice(1)
        .map((r) => Object.fromEntries(keys.map((k, i) => [k, String(r[i] || '').trim()])))
        .filter((r) => keys.some((k) => r[k]))
      onChange(body.length ? body : [blank()])
      onError('')
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Field label="Select method to upload options" hint="Manual entry suits a short list, or a single change to a long one. A file suits a few hundred rows prepared in a spreadsheet.">
        <Select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={[{ value: 'manual', label: 'Manually' }, { value: 'file', label: 'Upload file' }]}
        />
      </Field>

      {method === 'file' && (
        <div className="csv-drop">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => readFile(e.target.files && e.target.files[0])}
          />
          <Icon name="upload" size={20} style={{ color: 'var(--faint)' }} />
          <div className="csv-drop-txt">
            <span className="t-sm">
              {fileName ? <span className="mono">{fileName}</span> : `A CSV with headers in the first row, named exactly ${keys.join(' and ')}.`}
            </span>
            <span className="t-xs t-mut">
              {uploadNote || 'The file becomes the entire list. It is not merged with what is there now.'}
            </span>
          </div>
          <Button size="sm" icon="download" onClick={() => sampleFile(sampleText)}>Sample CSV</Button>
          <Button size="sm" icon="folder" onClick={() => fileRef.current && fileRef.current.click()}>
            {fileName ? 'Choose another' : 'Choose file'}
          </Button>
        </div>
      )}

      {method === 'manual' && (
        // The single-action path. One line, one button: type the pair, add it,
        // and it is in the list — no scrolling to the end of a long table.
        <div className="cfg-quick">
          <span className="cfg-quick-l"><Icon name="plus" size={12} />{quickAddLabel}</span>
          {columns.map((c) => (
            <TextInput
              key={c.key}
              className={c.mono ? 'mono' : ''}
              value={draft[c.key] || ''}
              placeholder={c.placeholder}
              aria-label={`New ${c.label}`}
              onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft() } }}
            />
          ))}
          <Button size="sm" variant="pri" icon="plus" onClick={addDraft}>Add</Button>
        </div>
      )}

      <div className="cfg-pairs">
        <div className="cfg-pairs-h">
          <span className="row" style={{ gap: 8 }}>
            <span className="t-sm" style={{ fontWeight: 'var(--w-semi)' }}>
              {tally.total} row{tally.total === 1 ? '' : 's'}
            </span>
            {tally.added > 0 && <Pill tone="ok" dot>{tally.added} added</Pill>}
            {tally.removed > 0 && <Pill tone="warn" dot>{tally.removed} removed</Pill>}
          </span>
          <span className="row" style={{ gap: 6 }}>
            {rows.length > 8 && (
              <label className="wb-search cfg-pairs-find">
                <Icon name="search" size={13} />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Find a row…"
                  aria-label="Find a row to edit or remove"
                />
                {filter && <IconButton icon="x" size="sm" label="Clear" onClick={() => setFilter('')} />}
              </label>
            )}
            {downloadFile && <Button size="sm" icon="download" onClick={downloadFile}>{downloadLabel}</Button>}
            <Button size="sm" icon="plus" onClick={() => onChange([...rows, blank()])}>Add row</Button>
          </span>
        </div>
        <div className="cfg-pairs-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th className="td-num" style={{ width: 52 }}>#</th>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th className="td-act" style={{ width: 116 }} />
              </tr>
            </thead>
            <tbody>
              {shown.map(({ r, i }) => (
                <tr key={i}>
                  <td className="td-num">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key}>
                      <TextInput
                        className={c.mono ? 'mono' : ''}
                        value={r[c.key] || ''}
                        placeholder={c.placeholder}
                        aria-label={`${c.label} row ${i + 1}`}
                        onChange={(e) => setCell(i, c.key, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="td-act">
                    <span className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      <IconButton icon="plus" size="sm" label={`Insert a row after row ${i + 1}`} onClick={() => insertAfter(i)} />
                      <Button
                        size="sm"
                        icon="trash"
                        disabled={i === 0 && !allowRemoveFirst}
                        onClick={() => removeRow(i)}
                      >
                        Remove
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="t-mut t-sm" style={{ textAlign: 'center' }}>
                    {rows.length === 0 ? 'The list is empty.' : `No row matches “${filter}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cfg-delta">
        <Icon name="info" size={12} />
        <span>
          Adding and removing take effect here immediately. Submit then sends the
          {' '}<b>whole list of {tally.total}</b> — the stored options are cleared and replaced by exactly what this
          table holds, so anything removed here is genuinely removed.
        </span>
      </div>
    </>
  )
}
