import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import FileDrop, { formatSize } from '../../components/primitives/FileDrop'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import { num } from '../../lib/format'
import { USERS } from '../../data/seed'

const PREVIEW_CAP = 6

/**
 * A membership file is one identity per line — username or email — and every
 * further column is ignored, so a file exported from the members tab can be fed
 * straight back in to remove exactly what it listed.
 */
export function parseMemberCsv(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l, i) => !(i === 0 && /^(username|user|identity|email)\s*(,|$)/i.test(l)))
    .map((line, i) => {
      const comma = line.indexOf(',')
      const raw = (comma === -1 ? line : line.slice(0, comma)).trim().replace(/^"|"$/g, '')
      return { line: i + 1, raw, key: raw.toLowerCase() }
    })
    .filter((r) => r.raw)
}

const MODES = [
  { id: 'add', label: 'Add members' },
  { id: 'remove', label: 'Remove members' },
]

/**
 * Bulk membership from a file. Nothing is applied on upload: the file is read
 * in the browser, reconciled against the directory and the current roster, and
 * the operator applies the reconciliation once it says what it will do.
 */
export default function MemberCsv({ group, roster, onAdd, onRemove, onClose }) {
  const [mode, setMode] = useState('add')
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  const clear = () => {
    setFile(null)
    setRows(null)
    setError('')
  }

  const read = (files) => {
    const f = files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseMemberCsv(reader.result)
      setFile(f)
      setRows(parsed)
      setError(parsed.length === 0 ? 'The file holds no usable rows. Each line should carry one username or email address.' : '')
    }
    reader.onerror = () => {
      clear()
      setError(`${f.name} could not be read. Export the file again.`)
    }
    reader.readAsText(f)
  }

  const report = useMemo(() => {
    if (!rows) return null
    const byUsername = new Map(USERS.map((u) => [u.username.toLowerCase(), u]))
    const byEmail = new Map(USERS.map((u) => [u.email.toLowerCase(), u]))
    const held = new Map(roster.map((m) => [m.userId, m]))
    const seen = new Set()
    const apply = []
    const noop = []
    const unknown = []
    const repeated = []

    rows.forEach((r) => {
      const user = byUsername.get(r.key) || byEmail.get(r.key)
      if (!user) { unknown.push({ ...r, reason: 'No identity carries this username or email.' }); return }
      if (seen.has(user.id)) { repeated.push({ ...r, user, reason: 'Listed more than once in this file.' }); return }
      seen.add(user.id)
      const membership = held.get(user.id)
      if (mode === 'add' && membership) { noop.push({ ...r, user, reason: `Already holds ${group.name}.` }); return }
      if (mode === 'remove' && !membership) { noop.push({ ...r, user, reason: `Does not hold ${group.name}.` }); return }
      apply.push({ ...r, user, membership })
    })

    return { apply, noop, unknown, repeated }
  }, [rows, roster, mode, group.name])

  const run = () => {
    if (!report || report.apply.length === 0) return
    if (mode === 'add') onAdd(report.apply.map((r) => r.user))
    else onRemove(report.apply.map((r) => r.membership.id))
    clear()
  }

  const preview = report ? [...report.apply, ...report.noop, ...report.unknown, ...report.repeated] : []
  const count = report ? report.apply.length : 0

  return (
    <Card
      title="Upload a membership file"
      sub={`One identity per line. The file is read in this browser and nothing is written to ${group.name} until it is applied.`}
      actions={
        <div className="seg" role="radiogroup" aria-label="What the file does">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              data-on={mode === m.id}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="stack">
        <Field
          label="Membership file"
          required
          error={error}
          hint="Expected column: USERNAME — an email address is accepted instead, and any further column is ignored. A header row is skipped."
        >
          {!file ? (
            <FileDrop
              accept=".csv"
              label="Drag a CSV file here, or browse"
              hint=".csv up to 5 MB · parsed in the browser, nothing is applied until you confirm"
              onFiles={read}
            />
          ) : (
            <div className="gp-file">
              <span className="feed-ic" data-tone="acc"><Icon name="file" size={14} /></span>
              <div className="gp-file-m">
                <div className="gp-file-t">{file.name}</div>
                <div className="cell-sub">{num(rows.length)} {rows.length === 1 ? 'row' : 'rows'} read · {formatSize(file.size)}</div>
              </div>
              {report && (
                <>
                  <Pill tone={report.apply.length > 0 ? 'ok' : 'mut'} dot>{report.apply.length} to {mode === 'add' ? 'add' : 'remove'}</Pill>
                  {report.unknown.length > 0 && <Pill tone="warn" dot>{report.unknown.length} unmatched</Pill>}
                </>
              )}
              <Button size="sm" icon="x" onClick={clear}>Remove</Button>
            </div>
          )}
        </Field>

        {report && rows.length > 0 && (
          <>
            <div className="stat-strip">
              <div className="stat-cell">
                <span className="stat-k"><Icon name="file" size={12} />Rows read</span>
                <span className="stat-v">{num(rows.length)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="user" size={12} />Matched an identity</span>
                <span className="stat-v">{num(rows.length - report.unknown.length)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="warn" size={12} />No identity found</span>
                <span className="stat-v">{num(report.unknown.length)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="users" size={12} />{mode === 'add' ? 'Already members' : 'Not members'}</span>
                <span className="stat-v">{num(report.noop.length)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name={mode === 'add' ? 'plus' : 'minus'} size={12} />Will be {mode === 'add' ? 'added' : 'removed'}</span>
                <span className="stat-v">{num(report.apply.length)}</span>
              </div>
            </div>

            <div>
              <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Reconciled preview</div>
              <div className="gp-preview">
                {preview.slice(0, PREVIEW_CAP).map((r) => (
                  <div className="gp-preview-row" key={`${r.line}-${r.raw}`} data-bad={r.reason ? true : undefined}>
                    <Icon name={r.reason ? 'warn' : mode === 'add' ? 'plus' : 'minus'} size={12} className="gp-preview-ic" />
                    <span className="gp-preview-name">{r.user ? r.user.username : r.raw}</span>
                    <span className="cell-sub trunc" title={r.reason || ''}>
                      {r.reason || `${r.user.department} · ${r.user.employeeType}`}
                    </span>
                  </div>
                ))}
                {preview.length > PREVIEW_CAP && (
                  <div className="gp-preview-more">
                    + {preview.length - PREVIEW_CAP} more {preview.length - PREVIEW_CAP === 1 ? 'row' : 'rows'}
                  </div>
                )}
              </div>
            </div>

            {report.repeated.length > 0 && (
              <Banner tone="info">
                {report.repeated.length} {report.repeated.length === 1 ? 'row repeats an identity' : 'rows repeat an identity'} listed
                earlier in the file. Each identity is reconciled once.
              </Banner>
            )}
          </>
        )}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant={mode === 'remove' ? 'danger' : 'pri'}
            icon={mode === 'add' ? 'plus' : 'trash'}
            disabled={!report || report.apply.length === 0}
            onClick={run}
          >
            {`${mode === 'add' ? 'Add' : 'Remove'} ${count} ${count === 1 ? 'member' : 'members'}`}
          </Button>
        </div>
      </div>
    </Card>
  )
}
