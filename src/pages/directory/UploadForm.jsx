import FileDrop, { formatSize } from '../../components/primitives/FileDrop'
import Icon from '../../components/primitives/Icon'
import { useState } from 'react'
import { csvHref } from './uploadData'

// How to prepare the file. The column list this used to render was the same
// information in a less usable form — the sample CSV already carries the exact
// header, so the instructions point at that instead of asking the administrator
// to retype it from a row of tags.
const INSTRUCTIONS = [
  'Download the sample CSV and use its header row exactly as it is — column order does not matter, but the names must match.',
  'Save the file as UTF-8 comma-separated text. Files exported from Excel as ".csv" are already in this format.',
  'Leave a cell empty to leave that attribute unchanged. Do not use "-" or "NA" as placeholders.',
  'Keep the file under 5 MB. Split larger loads into several files and run them one after another.',
]

export default function UploadForm({ spec, onChange }) {
  const [file, setFile] = useState(null)
  const take = (files) => {
    const next = files[0] || null
    setFile(next)
    onChange({ file: next ? next.name : '' })
  }

  return (
    <div className="stack">
      <div className="banner" data-tone={spec.danger ? 'warn' : 'info'}>
        <Icon name="file" size={15} />
        <div>
          Every row is checked before anything is written. Valid rows are applied and the ones that fail are
          returned as a downloadable error file naming the row and the reason, so a single bad row never stops
          the run.
        </div>
      </div>

      <div>
        <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Preparing the file</div>
        <ol className="upload-steps">
          {INSTRUCTIONS.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <a className="link" href={csvHref(spec.sample)} download={spec.sampleName}>
          <Icon name="download" size={12} /> Download sample CSV
        </a>
      </div>

      <div>
        <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Source file</div>
        <FileDrop
          accept=".csv"
          label={file ? file.name : 'Drag the CSV here, or browse'}
          hint={file ? `${formatSize(file.size)} · ready to upload` : 'UTF-8, comma separated, first row must be the header'}
          onFiles={take}
        />
      </div>

      {spec.dupNote && (
        <div className="banner" data-tone="warn">
          <Icon name="noentry" size={15} />
          <div>{spec.dupNote}</div>
        </div>
      )}

      {spec.note && (
        <div className="banner" data-tone="info">
          <Icon name="mail" size={15} />
          <div>{spec.note}</div>
        </div>
      )}

      {spec.danger && (
        <div className="banner" data-tone="bad">
          <Icon name="warn" size={15} />
          <div>
            Deletion revokes every entitlement held on every connected target at the next provisioning run.
            The operation is recorded on the audit trail and cannot be undone.
          </div>
        </div>
      )}
    </div>
  )
}
