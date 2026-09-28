import { useState } from 'react'
import Card from '../../components/primitives/Card'
import KeyValue from '../../components/primitives/KeyValue'
import JsonView from '../../components/primitives/JsonView'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import {
  Skeleton, SkeletonCard, SkeletonKeyValue, SkeletonList, SkeletonTable,
} from '../../components/primitives/Skeleton'
import { useLoading } from '../../lib/useLoading'
import { inZone, zoneSuffix } from './reportTime'

/**
 * What "Show details" opens.
 *
 * Three reports want three different things from a row, so the panel is typed
 * rather than generic:
 *
 *   response — what the platform or provider answered, read back as fields
 *              rather than as a document. The report declares the summary,
 *              because only the report knows which recorded values answer the
 *              question its reader is asking; it also declares whether the raw
 *              payload is exposed at all. Only the OTP log sets `raw`, where
 *              the gateway asks for its own document back when a code is
 *              chased. Everywhere else the payload is noise in front of the
 *              four or five fields that matter.
 *   changes  — the attribute-level diff. A write that does not say what it
 *              changed is not evidence, so old and new sit side by side.
 *   lists    — the sets a cell had to flatten to a comma string. An access
 *              review is read as "which entitlements, on which applications,
 *              with which conflicts", and that does not survive a table cell.
 *   record   — every column of the row, including the ones the table truncated
 *              or hid behind the column picker.
 */
export default function ReportDetail({ report, row, zone }) {
  const kind = (report.detail && report.detail.kind) || 'record'

  /* The panel is its own round trip: the diff, the provider's answer and the
     sets a cell had to flatten are retained beside the row, not inside it. The
     drawer keeps this component mounted between rows, so the wait is keyed on
     which row is being read rather than on the mount. */
  const rowKey = row.id ?? row.uniqueid ?? row.session_id ?? row.ts ?? null
  const loading = useLoading(`${report.id}|${rowKey}`)

  const record = (
    <KeyValue
      cols={1}
      rows={report.columns.map((c) => {
        const raw = row[c.key]
        const v = c.key === 'ts' ? inZone(raw, zone) : raw
        return { k: c.label, v: v == null || v === '' ? '—' : String(v) }
      })}
    />
  )

  if (loading) {
    /* A typed panel gets a typed skeleton. The plain reading is the field grid
       on its own — no card around it, because the real one has none — and
       every other reading is one or more blocks above the Record card that
       closes all three. */
    if (kind === 'record') {
      return (
        <Skeleton label="Loading the record">
          <div className="stack"><SkeletonKeyValue rows={report.columns.length} cols={1} /></div>
        </Skeleton>
      )
    }

    const lists = Array.isArray(row.lists) ? row.lists : []
    const above = kind === 'response'
      ? (
        <>
          <SkeletonCard head><SkeletonKeyValue rows={4} cols={2} /></SkeletonCard>
          {report.detail && report.detail.raw && <SkeletonCard head lines={6} />}
        </>
      )
      : kind === 'lists'
        ? lists.map((l) => (
          <SkeletonCard key={l.k} head>
            <SkeletonList rows={Math.min(4, l.items.length || 1)} media="square" trailing={false} />
          </SkeletonCard>
        ))
        : <SkeletonCard head><SkeletonTable rows={Math.min(6, (row.changes || []).length || 1)} cols={3} /></SkeletonCard>

    return (
      <Skeleton label={`Loading the ${(report.detail && report.detail.label) || 'record'}`}>
        <div className="stack">
          {above}
          <SkeletonCard head><SkeletonKeyValue rows={report.columns.length} cols={1} /></SkeletonCard>
        </div>
      </Skeleton>
    )
  }

  if (kind === 'response') {
    const d = report.detail || {}
    const summary = typeof d.summary === 'function' ? d.summary(row).filter(Boolean) : null
    return (
      <div className="stack">
        {summary && (
          <Card
            flush
            title={d.label || 'Response'}
            sub={d.note}
          >
            <div className="rep-detail-pad"><KeyValue cols={2} rows={summary} /></div>
          </Card>
        )}
        {d.raw && (
          <Card
            flush
            title="Raw response"
            sub={row.statusCode == null
              ? 'The send never reached the provider, so nothing was returned.'
              : `The provider answered ${row.statusCode} at ${inZone(row.ts, zone)} ${zoneSuffix(zone)}.`}
          >
            <div className="rep-detail-pad">
              {row.response
                ? <JsonView data={row.response} />
                : (
                  <EmptyState
                    size="sm"
                    icon="warn"
                    title="No response recorded"
                    body="The request failed before the provider replied. There is nothing to quote in a support ticket beyond the timestamp and the recipient."
                  />
                )}
            </div>
          </Card>
        )}
        <Card flush title="Record" sub="Every field this report holds for the row">
          <div className="rep-detail-pad">{record}</div>
        </Card>
      </div>
    )
  }

  if (kind === 'lists') {
    const lists = Array.isArray(row.lists) ? row.lists : []
    return (
      <div className="stack">
        {lists.map((l) => (
          <Card
            key={l.k}
            flush
            title={l.k}
            sub={`${l.items.length} ${l.items.length === 1 ? 'entry' : 'entries'}`}
          >
            {l.items.length > 0 ? (
              <ul className="rep-list-set">
                {l.items.map((it) => (
                  <li key={it.label}>
                    <Icon name={l.icon} size={13} />
                    <span className="rep-list-m">
                      <span className="rep-list-t">{it.label}</span>
                      {it.sub && <span className="rep-list-s">{it.sub}</span>}
                    </span>
                    {it.flag && <Tag tone="warn">{it.flag}</Tag>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rep-detail-pad t-sm t-mut">
                {l.k === 'Segregation-of-duties flags'
                  ? 'No entitlement this identity holds is in conflict with another.'
                  : 'Nothing held.'}
              </div>
            )}
          </Card>
        ))}
        <Card flush title="Record" sub="Every field this report holds for the row">
          <div className="rep-detail-pad">{record}</div>
        </Card>
      </div>
    )
  }

  if (kind === 'changes') {
    return (
      <div className="stack">
        <ChangesCard changes={Array.isArray(row.changes) ? row.changes : []} />
        <Card flush title="Record" sub="Every field this report holds for the row">
          <div className="rep-detail-pad">{record}</div>
        </Card>
      </div>
    )
  }

  return <div className="stack">{record}</div>
}

/* Whether a recorded value is a document rather than a scalar. Asked of the
   value itself: the trail is not annotated with a type, and it should not have
   to be — an array is an array. */
const isDoc = (v) => v !== null && typeof v === 'object'

/* The placeholder the trail writes for "there was nothing here" is the literal
   string, which is right in a cell and wrong inside a JSON document. */
const unset = (v) => v == null || v === '' || v === 'null'
const norm = (v) => (unset(v) ? null : v)

/* One recorded value. A document is printed as the document it is; a scalar
   keeps the pill the report has always used. Both are tinted by side, so the
   two renderings still read as one before-and-after down the column. */
function DiffValue({ value, side }) {
  const cls = side === 'old' ? 'diff-old' : 'diff-new'
  if (isDoc(value)) {
    return <pre className="rep-json" data-side={side}>{JSON.stringify(value, null, 2)}</pre>
  }
  return <span className={cls}>{unset(value) ? 'null' : String(value)}</span>
}

const VIEWS = [
  { id: 'fields', icon: 'columns', label: 'Fields' },
  { id: 'json', icon: 'code', label: 'JSON' },
]

/**
 * The attribute-level diff, in the two readings it is actually wanted in.
 *
 * `fields` is the audit reading — one row per attribute, old beside new, the
 * question "what did this event change" answered without scrolling. `json` is
 * the payload reading — the whole change set as one typed, collapsible
 * document, which is what gets pasted into a ticket or compared against what
 * the connector reports it received.
 */
function ChangesCard({ changes }) {
  const [view, setView] = useState('fields')
  const docs = changes.filter((c) => isDoc(c.from) || isDoc(c.to)).length

  if (changes.length === 0) {
    return (
      <Card flush title="Changes" sub="This event wrote no attribute">
        <div className="rep-detail-pad">
          <EmptyState
            size="sm"
            icon="eye"
            title="Nothing was written"
            body="This event is a read, a check, or an action the platform refused — there is no before and after to compare."
          />
        </div>
      </Card>
    )
  }

  const payload = Object.fromEntries(changes.map((c) => [
    c.attribute,
    { from: norm(c.from), to: norm(c.to) },
  ]))

  return (
    <Card
      flush
      title="Changes"
      sub={`${changes.length} ${changes.length === 1 ? 'attribute was' : 'attributes were'} written by this event${
        docs ? ` · ${docs} ${docs === 1 ? 'holds a document' : 'hold documents'}` : ''}`}
      actions={(
        <div className="seg">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              data-on={view === v.id || undefined}
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              <Icon name={v.icon} size={13} />
              {v.label}
            </button>
          ))}
        </div>
      )}
    >
      {view === 'fields' ? (
        <div className="rep-diff-wrap">
          <table className="tbl rep-diff">
            <thead>
              <tr>
                <th>Attribute name</th>
                <th>Old value</th>
                <th>New value</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.attribute}>
                  <td className="td-main">{c.attribute}</td>
                  <td><DiffValue value={c.from} side="old" /></td>
                  <td><DiffValue value={c.to} side="new" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rep-detail-pad">
          <JsonView data={payload} label="Change set" />
        </div>
      )}
    </Card>
  )
}
