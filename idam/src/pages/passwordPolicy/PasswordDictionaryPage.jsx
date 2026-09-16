import './PasswordDictionaryPage.css'
import { useEffect, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import StatCards from '../../components/workbench/StatCards'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import FileDrop, { formatSize } from '../../components/primitives/FileDrop'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { ME } from '../../data/seed'

// The platform holds one dictionary file, so this page is a configuration
// screen for a single resource rather than a register of terms. Everything
// below follows from that: there is one active file, at most one candidate
// waiting to replace it, and no list to search.

const MAX_BYTES = 25 * 1024 * 1024
const MIN_LEN = 4
const MAX_LEN = 128

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const stamp = (d = new Date()) => {
  const h = d.getHours()
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, `
    + `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// The file the backend currently has loaded. Seeded so the page describes a
// configured system on first open; the empty state is reached by deleting it.
const SEED_ACTIVE = {
  name: 'password_dictionary.txt',
  size: 19293798,
  encoding: 'UTF-8',
  total: 1245320,
  unique: 1232870,
  duplicates: 12450,
  invalid: 1570,
  updated: '02 Sep 2026, 10:42 AM',
  processing: 'Completed',
}

// Fixed illustrations of the line format. They are literals in this file and
// are never drawn from an uploaded dictionary — the page has no code path that
// renders file content.
const FORMAT_SAMPLE = 'password123\nadmin123\nwelcome123\nPassword@123'

// Progress is reported by the backend as a percentage. The named stages are
// the fallback for runs that cannot report one, so both are driven off the
// same number here rather than being two separate fictions.
const STAGES = [
  { id: 'uploaded', label: 'File uploaded', at: 0, op: 'Storing the uploaded file' },
  { id: 'validated', label: 'File validated', at: 8, op: 'Confirming format, size and encoding' },
  { id: 'reading', label: 'Reading entries', at: 20, op: 'Reading entries from the file' },
  { id: 'building', label: 'Building dictionary', at: 62, op: 'Building dictionary index' },
  { id: 'finalizing', label: 'Finalizing', at: 92, op: 'Finalizing and activating' },
]

const stageAt = (p) => {
  let i = 0
  STAGES.forEach((s, n) => { if (p >= s.at) i = n })
  return i
}

// A run that is going to fail stops in the reading stage, which is where a
// backend discovers that a file it accepted has nothing usable in it.
const FAIL_AT = 34

// Duplicate detection has to remember what it has already seen. It remembers a
// 32-bit FNV-1a hash rather than the line, so no password value survives the
// pass. A collision would move one entry from unique to duplicate and nothing
// else, which is an acceptable price for not holding the values at all.
const hash = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Counts are the only thing that leaves this function. The lines are read,
// classified and dropped in one pass, so the component never holds — and
// therefore can never render — a password from the file.
const inspect = (text) => {
  const seen = new Set()
  const out = { lines: 0, empty: 0, invalid: 0, duplicates: 0, unique: 0 }

  String(text).split(/\r?\n/).forEach((raw) => {
    out.lines += 1
    const line = raw.trim()
    if (!line) { out.empty += 1; return }
    if (line.length < MIN_LEN || line.length > MAX_LEN) { out.invalid += 1; return }
    const key = hash(line.toLowerCase())
    if (seen.has(key)) { out.duplicates += 1; return }
    seen.add(key)
    out.unique += 1
  })

  out.entries = out.unique + out.duplicates
  return out
}

const seedAudit = () => [
  {
    id: 'seed-2',
    action: 'Dictionary replaced',
    result: 'Success',
    tone: 'ok',
    icon: 'check',
    user: 'SHUBHAM_JAIN',
    time: '02 Sep 2026, 10:42 AM',
    detail: `password_dictionary.txt · ${formatSize(SEED_ACTIVE.size)} · ${num(SEED_ACTIVE.total)} entries`,
  },
  {
    id: 'seed-1',
    action: 'Dictionary processing completed',
    result: 'Success',
    tone: 'ok',
    icon: 'check',
    user: 'SHUBHAM_JAIN',
    time: '02 Sep 2026, 10:41 AM',
    detail: `password_dictionary.txt · ${num(SEED_ACTIVE.unique)} unique · ${num(SEED_ACTIVE.invalid)} invalid`,
  },
]

export default function PasswordDictionaryPage({ embedded = false }) {
  const { toast, confirm } = useApp()

  // The active dictionary and the candidate are separate pieces of state on
  // purpose. Nothing in this file writes to `active` except a processing run
  // that completed, which is what keeps the platform from ever standing with
  // no usable dictionary while a replacement is in flight.
  const [active, setActive] = useState(SEED_ACTIVE)
  const [incoming, setIncoming] = useState(null)
  const [picking, setPicking] = useState(false)
  const [reading, setReading] = useState(false)
  const [enforced, setEnforced] = useState(true)
  const [saved, setSaved] = useState(true)
  const [audit, setAudit] = useState(seedAudit)

  // Audit entries carry file metadata and the outcome. They never carry a line
  // from the file, because nothing here ever reads one into state.
  const logEvent = (action, tone, detail, result) => {
    setAudit((es) => [{
      id: `${Date.now()}-${es.length}`,
      action,
      tone,
      detail,
      result: result || (tone === 'bad' ? 'Failed' : tone === 'warn' ? 'Warning' : 'Success'),
      icon: tone === 'bad' ? 'x' : tone === 'warn' ? 'warn' : 'check',
      user: ME.username,
      time: stamp(),
    }, ...es])
  }

  // The upload bar is animated rather than instantaneous. A file that appears
  // to arrive in one frame gives an administrator no chance to read which file
  // was taken before the validation panel replaces the drop zone.
  useEffect(() => {
    if (!incoming || incoming.phase !== 'uploading') return undefined
    const tick = setInterval(() => {
      setIncoming((c) => {
        if (!c || c.phase !== 'uploading') return c
        const next = c.progress + 12
        return next >= 100
          ? { ...c, progress: 100, phase: 'validated' }
          : { ...c, progress: next }
      })
    }, 60)
    return () => clearInterval(tick)
  }, [incoming && incoming.id, incoming && incoming.phase])

  useEffect(() => {
    if (!incoming || incoming.phase !== 'processing') return undefined
    // The candidate's file statistics cannot change while it is processing, so
    // capturing it here is safe and keeps the completion branch off the state
    // updater, which has to stay pure.
    const cand = incoming
    const hadActive = !!active
    const blocker = cand.checks.find((c) => !c.ok)
    const target = blocker ? FAIL_AT : 100
    let p = 0

    const tick = setInterval(() => {
      p = Math.min(target, p + 4)
      setIncoming((c) => (c && c.id === cand.id ? { ...c, progress: p } : c))
      if (p < target) return
      clearInterval(tick)

      if (blocker) {
        setIncoming((c) => (c && c.id === cand.id
          ? { ...c, phase: 'failed', reason: blocker.reason, failedAt: stageAt(FAIL_AT) }
          : c))
        logEvent('Dictionary processing failed', 'bad', `${cand.name} · ${blocker.reason}`)
        toast('bad', 'Processing failed', hadActive
          ? 'The existing dictionary is still active.'
          : 'No dictionary is configured.')
        return
      }

      const next = {
        name: cand.name,
        size: cand.size,
        encoding: 'UTF-8',
        total: cand.report.entries,
        unique: cand.report.unique,
        duplicates: cand.report.duplicates,
        invalid: cand.report.invalid,
        updated: stamp(),
        processing: 'Completed',
      }
      setActive(next)
      setIncoming((c) => (c && c.id === cand.id ? { ...c, phase: 'done', progress: 100 } : c))
      logEvent('Dictionary processing completed', 'ok',
        `${cand.name} · ${num(next.unique)} unique · ${num(next.duplicates)} duplicate · ${num(next.invalid)} invalid`)
      if (hadActive) {
        logEvent('Dictionary replaced', 'ok', `${cand.name} · ${formatSize(cand.size)} is now the active dictionary`)
      }
      toast('ok', 'Dictionary ready', `${cand.name} is active for password validation.`)
    }, 55)

    return () => clearInterval(tick)
  }, [incoming && incoming.id, incoming && incoming.phase])

  const openPicker = () => {
    if (!active) { setPicking(true); return }
    confirm({
      title: 'Replace password dictionary?',
      tone: 'acc',
      body: 'The new dictionary will replace the current dictionary after successful processing. '
        + 'The current dictionary will continue to be used until the new one is ready.',
      confirmLabel: 'Continue',
      onConfirm: () => setPicking(true),
    })
  }

  const closePicker = () => {
    setPicking(false)
    setIncoming(null)
  }

  const takeFile = (files) => {
    const file = files[0]
    setReading(true)
    const reader = new FileReader()

    reader.onerror = () => {
      setReading(false)
      toast('bad', 'File could not be read', file.name)
      logEvent('Dictionary upload failed', 'bad', `${file.name} · the file could not be read`)
    }

    reader.onload = () => {
      setReading(false)
      const text = String(reader.result)
      const utf8 = !text.includes('�')
      const report = inspect(text)

      const checks = [
        {
          id: 'format',
          label: 'File format is valid',
          ok: /\.txt$/i.test(file.name),
          reason: 'The file is not a .txt file.',
        },
        {
          id: 'size',
          label: 'File size is valid',
          ok: file.size > 0 && file.size <= MAX_BYTES,
          reason: file.size === 0
            ? 'The file is empty.'
            : `The file is larger than the ${formatSize(MAX_BYTES)} limit.`,
        },
        { id: 'readable', label: 'File is readable', ok: true, reason: 'The file could not be read.' },
        {
          id: 'encoding',
          label: utf8 ? 'Encoding: UTF-8' : 'Encoding could not be confirmed',
          ok: utf8,
          reason: 'The file is not valid UTF-8 text.',
        },
        {
          id: 'entries',
          label: 'File contains usable entries',
          ok: report.entries > 0,
          reason: 'No usable entries were found in the file.',
        },
      ]

      setIncoming({
        id: `${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain',
        phase: 'uploading',
        progress: 0,
        checks,
        report,
      })
      logEvent('Dictionary uploaded', 'info',
        `${file.name} · ${formatSize(file.size)} · ${num(report.lines)} lines read`, 'Accepted')
    }

    reader.readAsText(file)
  }

  const process = () => {
    setIncoming((c) => (c ? { ...c, phase: 'processing', progress: 0 } : c))
    logEvent('Dictionary processing started', 'info',
      `${incoming.name} · ${num(incoming.report.entries)} entries queued`, 'Started')
  }

  const retry = () => {
    setIncoming(null)
    setPicking(true)
  }

  const remove = () => confirm({
    title: 'Delete password dictionary?',
    body: 'After deletion, dictionary-based password validation will no longer be available.',
    confirmLabel: 'Delete',
    onConfirm: () => {
      const gone = active
      setActive(null)
      setIncoming(null)
      setPicking(false)
      logEvent('Dictionary deleted', 'warn',
        `${gone.name} · ${formatSize(gone.size)} · ${num(gone.total)} entries`, 'Deleted')
      toast('warn', 'Dictionary deleted', 'Credentials are accepted on length and complexity rules alone.')
    },
  })

  const saveEnforcement = () => {
    setSaved(true)
    toast('ok', 'Configuration saved', enforced
      ? 'The dictionary is consulted on every credential set, change and reset.'
      : 'Dictionary checking is disabled.')
  }

  const blocker = incoming && incoming.checks ? incoming.checks.find((c) => !c.ok) : null
  const stage = incoming ? STAGES[stageAt(incoming.progress)] : null
  const processed = incoming && incoming.report
    ? Math.round((incoming.progress / 100) * incoming.report.entries)
    : 0

  // ---------------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------------

  const statusCard = active && (
    <Card
      title="Current dictionary"
      sub="The single dictionary file the platform consults when a credential is set"
      actions={
        <div className="row">
          <Pill tone="ok" dot>Active</Pill>
          <Button size="sm" icon="upload" onClick={openPicker}>Replace dictionary</Button>
          <Button size="sm" variant="danger" icon="trash" onClick={remove}>Delete dictionary</Button>
        </div>
      }
      footer={
        <>
          <Icon name="shield" size={12} />
          <span>Only metadata and counts are held in the console. Entries are never read back from the file.</span>
        </>
      }
    >
      <KeyValue
        rows={[
          { k: 'File', icon: 'file', node: <span className="mono">{active.name}</span> },
          { k: 'Size', icon: 'db', node: <span className="num">{formatSize(active.size)}</span> },
          { k: 'Encoding', icon: 'code', v: active.encoding },
          { k: 'Last updated', icon: 'clock', node: <span className="num">{active.updated}</span> },
          {
            k: 'Last processing status',
            icon: 'activity',
            node: <Pill tone="ok" icon="checkC">{active.processing}</Pill>,
          },
          {
            k: 'Enforcement',
            icon: 'lock',
            node: <Pill tone={enforced ? 'ok' : 'warn'} dot>{enforced ? 'Enforced' : 'Off'}</Pill>,
          },
        ]}
      />
    </Card>
  )

  const emptyCard = !active && (
    <Card>
      <EmptyState
        icon="file"
        title="No password dictionary"
        body="No password dictionary has been configured. Upload a .txt file containing one password per line to enable dictionary-based password validation."
        actions={<Button variant="pri" icon="upload" onClick={() => setPicking(true)}>Upload dictionary</Button>}
      />
    </Card>
  )

  const fileRow = incoming && (
    <div className="filelist">
      <div className="filelist-it">
        <span className="filelist-ic"><Icon name="file" size={13} /></span>
        <span className="filelist-m">
          <span className="filelist-t mono">{incoming.name}</span>
          <span className="filelist-s">{formatSize(incoming.size)} · {incoming.type}</span>
        </span>
        {incoming.phase === 'uploading' && <Tag>Uploading</Tag>}
        {incoming.phase === 'validated' && (
          <Button size="sm" icon="x" onClick={() => setIncoming(null)}>Remove</Button>
        )}
      </div>
    </div>
  )

  const validationPanel = incoming && incoming.phase === 'validated' && (
    <div className="pd-panel">
      <div>
        <div className="t-micro t-mut pd-panel-h">File validation</div>
        <div className="pd-checks">
          {incoming.checks.map((c) => (
            <div className="pd-check" key={c.id} data-ok={c.ok || undefined}>
              <Icon name={c.ok ? 'checkC' : 'ban'} size={13} />
              <span>{c.ok ? c.label : c.reason}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="logs" size={12} />Total lines</span>
          <span className="stat-v num">{num(incoming.report.lines)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="copy" size={12} />Duplicate entries</span>
          <span className="stat-v num">{num(incoming.report.duplicates)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="minus" size={12} />Empty lines</span>
          <span className="stat-v num">{num(incoming.report.empty)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="ban" size={12} />Invalid entries</span>
          <span className="stat-v num">{num(incoming.report.invalid)}</span>
        </div>
      </div>

      <div className="pd-format">
        <div className="t-micro t-mut">Expected format</div>
        <p className="pd-format-s">
          One password per line. Blank lines are ignored, and a line shorter than {MIN_LEN} or longer
          than {MAX_LEN} characters is counted as invalid.
        </p>
        <pre className="pd-sample mono">{FORMAT_SAMPLE}</pre>
      </div>

      {blocker && (
        <Banner tone="bad">
          {blocker.reason} Processing this file will not produce a usable dictionary
          {active ? ', and the current dictionary will stay active.' : '.'}
        </Banner>
      )}

      <div className="row">
        <Button variant="pri" icon="play" onClick={process}>Process dictionary</Button>
        <Button icon="x" onClick={closePicker}>Cancel</Button>
      </div>
    </div>
  )

  const runPanel = incoming && (incoming.phase === 'processing' || incoming.phase === 'failed') && (
    <div className="pd-panel">
      <div className="row-between">
        <span className="t-sm">
          {incoming.phase === 'failed' ? 'Processing stopped' : 'Processing password dictionary'}
        </span>
        <Pill tone={incoming.phase === 'failed' ? 'bad' : 'info'} dot>
          {incoming.phase === 'failed' ? 'Failed' : 'Processing'}
        </Pill>
      </div>

      <div>
        <Meter value={incoming.progress} tone={incoming.phase === 'failed' ? 'bad' : undefined} height={7} />
        <div className="row-between pd-run-m">
          <span className="t-xs t-mut">
            Processed <span className="num">{num(processed)}</span> of{' '}
            <span className="num">{num(incoming.report.entries)}</span> entries
          </span>
          <span className="t-xs num">{Math.round(incoming.progress)}%</span>
        </div>
      </div>

      <div className="pd-stages">
        {STAGES.map((s, i) => {
          const at = incoming.phase === 'failed' ? incoming.failedAt : stageAt(incoming.progress)
          const state = incoming.phase === 'failed' && i === at ? 'error'
            : i < at ? 'done' : i === at ? 'active' : 'todo'
          return (
            <div className="pd-stage" key={s.id} data-state={state}>
              <span className="pd-stage-ic">
                <Icon
                  name={state === 'done' ? 'check' : state === 'error' ? 'x' : state === 'active' ? 'clock' : 'minus'}
                  size={10}
                  stroke={2.6}
                />
              </span>
              <span>{s.label}</span>
            </div>
          )
        })}
      </div>

      {incoming.phase === 'processing' && (
        <div className="t-xs t-mut">Current operation: {stage.op}</div>
      )}

      {incoming.phase === 'failed' && (
        <>
          <Banner tone="bad">
            The new dictionary could not be processed.{' '}
            {active
              ? 'Your existing dictionary is still active.'
              : 'No dictionary is configured, so dictionary checking is not available.'}
          </Banner>
          <KeyValue cols={1} rows={[{ k: 'Reason', icon: 'warn', v: incoming.reason }]} />
          <div className="row">
            <Button variant="pri" icon="refresh" onClick={retry}>Try again</Button>
            <Button icon="x" onClick={closePicker}>Discard</Button>
          </div>
        </>
      )}
    </div>
  )

  const successPanel = incoming && incoming.phase === 'done' && (
    <div className="pd-panel">
      <Banner tone="ok">
        Password dictionary has been successfully processed and is now active for password validation.
      </Banner>
      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="logs" size={12} />Total entries</span>
          <span className="stat-v num">{num(incoming.report.entries)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="checkC" size={12} />Unique entries</span>
          <span className="stat-v num">{num(incoming.report.unique)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="db" size={12} />File size</span>
          <span className="stat-v num">{formatSize(incoming.size)}</span>
        </div>
      </div>
      <div className="row">
        <Button variant="pri" icon="check" onClick={closePicker}>View details</Button>
      </div>
    </div>
  )

  const uploadCard = (picking || incoming) && (
    <Card
      title={active ? 'Replace dictionary' : 'Upload password dictionary'}
      sub={active
        ? 'The current dictionary stays active until the new file has processed successfully'
        : 'A plain text file with one password per line'}
      actions={!incoming && (
        <Button size="sm" icon="x" onClick={closePicker}>Cancel</Button>
      )}
    >
      {!incoming && (
        <FileDrop
          accept=".txt"
          maxSize={MAX_BYTES}
          disabled={reading}
          label={reading ? 'Reading the file…' : 'Drag and drop your .txt file here, or browse'}
          hint={`Supported format: .txt, up to ${formatSize(MAX_BYTES)}. One password per line.`}
          onFiles={takeFile}
        />
      )}

      {fileRow}

      {incoming && incoming.phase === 'uploading' && (
        <div className="pd-panel">
          <Meter value={incoming.progress} height={7} />
          <div className="row-between pd-run-m">
            <span className="t-xs t-mut">Uploading</span>
            <span className="t-xs num">{incoming.progress}%</span>
          </div>
        </div>
      )}

      {validationPanel}
      {runPanel}
      {successPanel}
    </Card>
  )

  const enforcementCard = (
    <Card
      title="Enforcement"
      sub="Whether the dictionary is consulted at credential set, change and reset"
      actions={<Pill tone={enforced && active ? 'ok' : 'warn'} dot>{enforced && active ? 'Enforced' : 'Off'}</Pill>}
      footer={
        <>
          <Icon name="info" size={12} />
          <span>Existing credentials are unaffected until the next change.</span>
          <span className="spacer" />
          <Button size="sm" variant="pri" icon="save" onClick={saveEnforcement} disabled={saved}>
            Save configuration
          </Button>
        </>
      }
    >
      <div className="row">
        <Switch
          checked={enforced}
          onChange={(v) => { setEnforced(v); setSaved(false) }}
          label="Enable password dictionary"
        />
        <span className="t-sm">Check every credential against the dictionary</span>
      </div>

      <div className="pd-note">
        <Banner tone={!active ? 'warn' : enforced ? 'info' : 'warn'}>
          {!active
            ? 'No dictionary is configured, so no credential is checked against one regardless of this setting.'
            : enforced
              ? <>The active dictionary holds <b>{num(active.unique)} unique entries</b>. A match is refused and the identity is asked to choose another password.</>
              : 'Dictionary checking is off. Credentials are accepted on length and complexity rules alone.'}
        </Banner>
      </div>
    </Card>
  )

  const auditCard = (
    <Card
      title="Audit trail"
      sub="Administrative actions taken against the dictionary resource"
      footer={
        <>
          <Icon name="shield" size={12} />
          <span>Entries record file metadata and outcome only. No password value is written to the log.</span>
        </>
      }
    >
      <div className="tl">
        {audit.map((e) => (
          <div className="tl-it" key={e.id} data-tone={e.tone === 'info' ? 'acc' : e.tone}>
            <span className="tl-dot"><Icon name={e.icon} size={8} stroke={3} /></span>
            <div className="pd-audit-h">
              <span className="tl-t">{e.action}</span>
              <Pill tone={e.tone === 'info' ? 'mut' : e.tone}>{e.result}</Pill>
            </div>
            <div className="tl-s">{e.detail}</div>
            <div className="tl-time">{e.user} · {e.time}</div>
          </div>
        ))}
      </div>
    </Card>
  )

  const body = (
    <div className="stack">
      {active && (
        <StatCards
          label="Dictionary summary"
          items={[
            {
              key: 'total',
              icon: 'logs',
              label: 'Total entries',
              value: active.total,
              chip: 'in the active file',
              sub: active.name,
            },
            {
              key: 'unique',
              icon: 'checkC',
              label: 'Unique entries',
              value: active.unique,
              chip: 'enforced',
              chipTone: 'ok',
              sub: 'refused at credential change',
            },
            {
              key: 'duplicates',
              icon: 'copy',
              label: 'Duplicate entries',
              value: active.duplicates,
              chip: 'collapsed',
              sub: 'counted once in the index',
            },
            {
              key: 'invalid',
              icon: 'ban',
              label: 'Invalid entries',
              value: active.invalid,
              chip: active.invalid ? 'skipped' : 'none',
              chipTone: active.invalid ? 'warn' : undefined,
              sub: 'outside the accepted line length',
            },
          ]}
        />
      )}

      {statusCard}
      {emptyCard}
      {uploadCard}
      {enforcementCard}
      {auditCard}
    </div>
  )

  // The page is also rendered as a section of Password Policy, which supplies
  // its own header. The replace and delete actions therefore live on the status
  // card rather than in the page bar, so both modes offer the same controls.
  if (embedded) return body

  return (
    <>
      <PageBar
        title="Password Dictionary"
        sub="The single dictionary file consulted when a credential is set, and the uploads that replace it."
        crumbs={[{ label: 'Reports' }, { label: 'Password Dictionary' }]}
      />
      {body}
    </>
  )
}
