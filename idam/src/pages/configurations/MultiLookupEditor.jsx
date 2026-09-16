import { useRef, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import TextInput from '../../components/primitives/TextInput'
import { parseCsv } from './csv'
import { MSG, downloadCsv, headersMatch, toCsvText } from './rules'

/** Two columns per level: the label a person sees, and the value stored. */
export const levelColumns = (levels) => levels.flatMap((l) => [`${l}_option`, `${l}_value`])

/**
 * Create or edit a multi-level lookup.
 *
 * On creation the levels are declared first and the CSV headers follow from
 * them; the level structure is fixed from that moment because the table holding
 * the rows was shaped by it. On edit only the name and the data can change, and
 * the uploaded file's levels must match exactly — a file with different columns
 * is refused rather than being loaded into the wrong shape.
 */
export default function MultiLookupEditor({ lookup, rows: currentRows = [], existing = [], onSubmit, onCancel }) {
  const editing = !!lookup
  const [name, setName] = useState(editing ? lookup.name : '')
  const [levels, setLevels] = useState(() => (editing ? [...lookup.levels] : ['']))
  const [rows, setRows] = useState(() => (editing ? currentRows : []))
  const [loaded, setLoaded] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const declared = levels.map((l) => l.trim()).filter(Boolean)
  const expected = levelColumns(editing ? lookup.levels : declared)

  const setLevel = (i, v) => { setError(''); setLevels(levels.map((l, j) => (j === i ? v : l))) }
  const addLevel = () => setLevels([...levels, ''])
  const removeLevel = (i) => setLevels(levels.filter((_, j) => j !== i))

  const readFile = (file) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ''))
      if (parsed.length === 0) { setError(MSG.csvHeaders); setFileName(''); return }
      if (!headersMatch(parsed[0], expected)) {
        // On creation this is a header shape problem; on edit it means the file
        // describes a different hierarchy from the one the table was built for.
        setError(editing ? MSG.levelsMismatch : MSG.csvHeaders)
        setFileName('')
        return
      }
      const body = parsed.slice(1)
        .map((r) => expected.map((_, i) => String(r[i] || '').trim()))
        .filter((r) => r.some(Boolean))
      setRows(body)
      setLoaded(true)
      setError('')
    }
    reader.readAsText(file)
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Lookup name is required.'); return }
    const clash = existing.some((m) => (!editing || m.id !== lookup.id)
      && m.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (clash) { setError('Multi-level lookup with the same name already exists.'); return }
    if (!editing) {
      if (declared.length < 2) { setError('Declare at least two levels — a single level is an ordinary lookup.'); return }
      if (new Set(declared.map((l) => l.toLowerCase())).size !== declared.length) {
        setError('Level names must be distinct.')
        return
      }
      if (!loaded) { setError('Upload the data file before submitting.'); return }
    }
    onSubmit({ name: trimmed, levels: editing ? lookup.levels : declared, rows, replaced: loaded })
  }

  const downloadCurrent = () => downloadCsv(
    'multi_lookup_data.csv',
    toCsvText(expected, currentRows),
  )

  return (
    <>
      {error && <Banner tone="bad">{error}</Banner>}

      <Field label="Lookup Name" required hint="Must be unique.">
        <TextInput value={name} placeholder="Geography" onChange={(e) => { setError(''); setName(e.target.value) }} />
      </Field>

      <div className="cfg-pairs">
        <div className="cfg-pairs-h">
          <span className="t-sm" style={{ fontWeight: 'var(--w-semi)' }}>Enter the fields name</span>
          {editing
            ? <Pill tone="mut" icon="lock">Levels are fixed at creation</Pill>
            : <Button size="sm" icon="plus" onClick={addLevel}>Add level</Button>}
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Lookup level</th>
              <th>Field name</th>
              {!editing && <th className="td-act" />}
            </tr>
          </thead>
          <tbody>
            {(editing ? lookup.levels : levels).map((l, i) => (
              <tr key={i}>
                <td className="td-mono">Level-{i + 1}</td>
                <td>
                  <TextInput
                    className="mono"
                    value={l}
                    disabled={editing}
                    placeholder={['country', 'state', 'city'][i] || 'field_name'}
                    aria-label={`Level ${i + 1} field name`}
                    onChange={(e) => setLevel(i, e.target.value)}
                  />
                </td>
                {!editing && (
                  <td className="td-act">
                    <IconButton icon="trash" size="sm" label={`Remove level ${i + 1}`} disabled={levels.length <= 1} onClick={() => removeLevel(i)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="csv-drop" style={{ marginTop: 14 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => readFile(e.target.files && e.target.files[0])}
        />
        <Icon name="upload" size={20} style={{ color: 'var(--faint)' }} />
        <div className="csv-drop-txt">
          <span className="t-sm">{fileName ? <span className="mono">{fileName}</span> : 'Upload the data file. There is no manual entry — a three-level hierarchy runs to hundreds of rows.'}</span>
          <span className="t-xs t-mut mono">
            {expected.length ? expected.join(', ') : 'Declare the levels to see the expected columns'}
          </span>
          <span className="t-xs t-mut">
            One row per complete path. Every expected column must be present and no other column may be.
            The upload replaces every existing row, so start from the current export.
          </span>
        </div>
        <Button
          size="sm"
          icon="download"
          disabled={expected.length === 0}
          onClick={() => downloadCsv('multi_lookup_sample.csv', toCsvText(expected, [expected.map(() => '')]))}
        >
          Sample CSV
        </Button>
        {editing && currentRows.length > 0 && (
          <Button size="sm" icon="download" onClick={downloadCurrent}>Download data</Button>
        )}
        <Button size="sm" icon="folder" disabled={expected.length === 0} onClick={() => fileRef.current && fileRef.current.click()}>
          {fileName ? 'Choose another' : 'Upload file'}
        </Button>
      </div>

      {loaded && (
        <div className="cfg-note" style={{ marginTop: 12 }}>
          <b>{rows.length}</b> row{rows.length === 1 ? '' : 's'} parsed. Submitting replaces every row currently held
          by this lookup.
        </div>
      )}

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{editing ? 'Submit' : 'Create lookup'}</Button>
      </div>
    </>
  )
}
