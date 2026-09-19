import { useMemo, useRef, useState } from 'react'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Banner from '../../components/primitives/Banner'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import KeyValue from '../../components/primitives/KeyValue'
import { num } from '../../lib/format'
import { CSV_TEMPLATE, KINDS, KIND_META, parseGroupCsv } from './groupsData'

const CONFLICTS = ['Skip existing', 'Overwrite definition', 'Merge members']
const PREVIEW_CAP = 6

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'groups-import-template.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ImportGroups({ defaultKind = 'Application', onCancel, onImport }) {
  const [kind, setKind] = useState(KINDS.includes(defaultKind) ? defaultKind : 'Application')
  const [application, setApplication] = useState(KIND_META[KINDS.includes(defaultKind) ? defaultKind : 'Application'].appOptions()[0])
  const [conflict, setConflict] = useState(CONFLICTS[0])
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [fileError, setFileError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  const meta = KIND_META[kind]
  const appOptions = useMemo(() => meta.appOptions(), [meta])

  const valid = parsed ? parsed.filter((r) => r.valid) : []
  const invalid = parsed ? parsed.filter((r) => !r.valid) : []

  const pickKind = (next) => {
    setKind(next)
    setApplication(KIND_META[next].appOptions()[0])
  }

  const clearFile = () => {
    setFile(null)
    setParsed(null)
    setFileError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const readFile = (f) => {
    if (!f) return
    if (!/\.csv$/i.test(f.name) && !/text|csv/.test(f.type || '')) {
      setFile(null)
      setParsed(null)
      setFileError(`${f.name} is not a CSV file. Upload a .csv exported from the template.`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseGroupCsv(reader.result)
      setFile(f)
      setParsed(rows)
      setFileError(rows.length === 0 ? 'The file is empty. Each line should read NAME,DESCRIPTION.' : '')
    }
    reader.onerror = () => {
      setFile(null)
      setParsed(null)
      setFileError(`${f.name} could not be read. Try exporting the file again.`)
    }
    reader.readAsText(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    readFile(e.dataTransfer.files && e.dataTransfer.files[0])
  }

  const runImport = () => {
    const created = onImport(valid, { kind, application, conflict })
    setResult({ imported: created, skipped: invalid.length, application, kind, conflict, fileName: file ? file.name : '' })
  }

  if (result) {
    return (
      <>
        <div className="gp-import-done">
          <span className="feed-ic" data-tone="ok" style={{ width: 44, height: 44 }}><Icon name="checkC" size={20} /></span>
          <div>
            <div className="t-h3">Import complete</div>
            <div className="t-sm t-mut">{result.imported} {result.imported === 1 ? 'group was' : 'groups were'} staged from {result.fileName}.</div>
          </div>
        </div>
        <KeyValue
          cols={1}
          rows={[
            { k: 'Imported', v: `${num(result.imported)} ${result.imported === 1 ? 'group' : 'groups'} staged`, icon: 'check' },
            { k: 'Skipped', v: result.skipped === 0 ? 'None' : `${num(result.skipped)} invalid ${result.skipped === 1 ? 'row' : 'rows'} skipped`, icon: result.skipped === 0 ? 'check' : 'warn' },
            { k: 'Register', v: KIND_META[result.kind].plural, icon: KIND_META[result.kind].icon },
            { k: KIND_META[result.kind].appLabel, v: result.application, icon: 'provision' },
            { k: 'On conflict', v: result.conflict, icon: 'swap' },
          ]}
        />
        <Banner tone="info">
          Imported groups are staged first. Nothing reaches {result.application} until the next provisioning run,
          so a bad file can still be rolled back.
        </Banner>
        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          <Button icon="upload" onClick={() => { setResult(null); clearFile() }}>Import another file</Button>
          <Button variant="pri" icon="check" onClick={onCancel}>Done</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Banner tone="info">
        Imported groups are staged first. Membership is only written to the target on the next provisioning run,
        so a bad file can be rolled back before it reaches production.
      </Banner>
      <div className="stack" style={{ marginTop: 16 }}>
        <div className="grid grid-2">
          <Field label="Group kind" hint="Which register the imported groups join.">
            <Select value={kind} options={KINDS} onChange={(e) => pickKind(e.target.value)} />
          </Field>
          <Field label={meta.appLabel} hint={meta.appHint}>
            <Select value={application} options={appOptions} onChange={(e) => setApplication(e.target.value)} />
          </Field>
        </div>

        <Field
          label="Upload CSV file"
          required
          error={fileError}
          hint="Expected columns: NAME,DESCRIPTION — one group per line. An optional header row is ignored."
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => readFile(e.target.files && e.target.files[0])}
          />
          {!file ? (
            <div
              className="gp-drop"
              data-drag={dragOver || undefined}
              role="button"
              tabIndex={0}
              aria-label="Upload CSV file"
              onClick={() => inputRef.current && inputRef.current.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current && inputRef.current.click() } }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <span className="feed-ic" data-tone="acc" style={{ width: 38, height: 38 }}><Icon name="upload" size={17} /></span>
              <div className="gp-drop-t">Drag a CSV file here, or <span className="gp-drop-link">browse</span></div>
              <div className="gp-drop-s">.csv up to 5 MB · parsed locally, nothing is imported until you confirm</div>
            </div>
          ) : (
            <div className="gp-file">
              <span className="feed-ic" data-tone="acc"><Icon name="file" size={14} /></span>
              <div className="gp-file-m">
                <div className="gp-file-t">{file.name}</div>
                <div className="cell-sub">{num(parsed.length)} {parsed.length === 1 ? 'row' : 'rows'} parsed · {Math.max(1, Math.round(file.size / 1024))} KB</div>
              </div>
              <Pill tone={valid.length > 0 ? 'ok' : 'bad'} dot>{valid.length} valid</Pill>
              {invalid.length > 0 && <Pill tone="warn" dot>{invalid.length} invalid</Pill>}
              <Button size="sm" icon="x" onClick={clearFile}>Remove</Button>
            </div>
          )}
        </Field>
        <div className="row" style={{ marginTop: -6 }}>
          <Button size="sm" icon="download" onClick={downloadTemplate}>Download template</Button>
          <span className="t-xs t-faint">NAME,DESCRIPTION per line — e.g. ERP_TAX_FILING,Files statutory returns</span>
        </div>

        {parsed && parsed.length > 0 && (
          <div>
            <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Parsed preview</div>
            <div className="gp-preview">
              {parsed.slice(0, PREVIEW_CAP).map((r) => (
                <div className="gp-preview-row" key={r.line} data-bad={!r.valid || undefined}>
                  <Icon name={r.valid ? 'check' : 'warn'} size={12} className="gp-preview-ic" />
                  <span className="gp-preview-name">{r.name}</span>
                  <span className="cell-sub trunc" title={r.valid ? r.description : r.reason}>
                    {r.valid ? r.description : r.reason}
                  </span>
                </div>
              ))}
              {parsed.length > PREVIEW_CAP && (
                <div className="gp-preview-more">+ {parsed.length - PREVIEW_CAP} more {parsed.length - PREVIEW_CAP === 1 ? 'row' : 'rows'}</div>
              )}
            </div>
          </div>
        )}

        <Field label="On conflict" hint="What happens when an imported name already exists in the register.">
          <Select value={conflict} options={CONFLICTS} onChange={(e) => setConflict(e.target.value)} />
        </Field>
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="upload" disabled={valid.length === 0} onClick={runImport}>
          {valid.length > 0 ? `Import ${valid.length} ${valid.length === 1 ? 'group' : 'groups'}` : 'Import groups'}
        </Button>
      </div>
    </>
  )
}
