import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import AppLogo from '../../components/primitives/AppLogo'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import { num } from '../../lib/format'

/**
 * Choosing applications to assign to an identity.
 *
 * This was a multi-select in a drawer: one control listing every application by
 * name, with nothing to narrow it by and nothing shown about any of them. An
 * operator granting access could not see what a target was, who owned it, or
 * whether the identity had any business holding it — the name was the whole
 * record.
 *
 * It is the console's own register now, the same one the role member picker
 * uses, so search, filters, paging and select-all behave as they do everywhere
 * else and the commit sits in the bulk bar where a selection is acted on.
 */

const ALL_TYPE = 'All types'
const ALL_CAT = 'All categories'
const ALL_OWNER = 'All owners'

export default function AppPicker({
  source, subject, commitLabel = 'Assign', commitIcon = 'plus', onCommit, emptyBody,
}) {
  const [type, setType] = useState(ALL_TYPE)
  const [cat, setCat] = useState(ALL_CAT)
  const [owner, setOwner] = useState(ALL_OWNER)

  // Built from the candidates in hand, so a filter never offers a value that
  // would return nothing.
  const options = useMemo(() => ({
    types: [ALL_TYPE, ...[...new Set(source.map((a) => a.type).filter(Boolean))].sort()],
    cats: [ALL_CAT, ...[...new Set(source.map((a) => a.category).filter(Boolean))].sort()],
    owners: [ALL_OWNER, ...[...new Set(source.map((a) => a.owner).filter(Boolean))].sort()],
  }), [source])

  const rows = useMemo(() => source.filter((a) => (
    (type === ALL_TYPE || a.type === type)
    && (cat === ALL_CAT || a.category === cat)
    && (owner === ALL_OWNER || a.owner === owner)
  )), [source, type, cat, owner])

  const filtered = rows.length !== source.length
  const reset = () => { setType(ALL_TYPE); setCat(ALL_CAT); setOwner(ALL_OWNER) }

  const columns = [
    {
      key: 'name', label: 'Application', locked: true, cls: 'td-main',
      value: (r) => `${r.name} ${r.category || ''} ${r.owner || ''}`,
      render: (r) => (
        <span className="cell-id">
          <AppLogo brand={r.brand} name={r.name} size={26} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.name}</span>
            <span className="cell-sub">{r.category || '—'}</span>
          </span>
        </span>
      ),
    },
    { key: 'type', label: 'Type', render: (r) => <span className="tag">{r.type || '—'}</span> },
    { key: 'owner', label: 'Owner', render: (r) => r.owner || <span className="t-faint">Unassigned</span> },
    {
      key: 'sensitivity', label: 'Sensitivity', width: 130,
      value: (r) => r.sensitivity || '',
      render: (r) => (r.sensitivity
        ? <Pill tone={r.sensitivity === 'critical' ? 'bad' : r.sensitivity === 'high' ? 'warn' : 'mut'} dot>{r.sensitivity}</Pill>
        : <span className="t-faint">—</span>),
    },
  ]

  return (
    <div className="stack">
      <div className="banner" data-tone="info">
        <Icon name="plus" size={15} />
        <div>
          Tick the applications to assign to <b>{subject}</b>. The assignment is direct and is recorded against you
          on the identity&rsquo;s activity log.
        </div>
      </div>

      <DataWorkbench
        id="identity-app-picker"
        rows={rows}
        columns={columns}
        selectable
        pageSize={25}
        searchPlaceholder="Search by application, category or owner…"
        /* Each select's resting value names its own field, so the three read as
           one filter row beside the search rather than three labelled fields. */
        filters={(
          <div className="mp-filters">
            <Select options={options.types} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type" />
            <Select options={options.cats} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" />
            <Select options={options.owners} value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter by owner" />
            {filtered && <button type="button" className="mp-clear" onClick={reset}><Icon name="x" size={12} />Clear</button>}
          </div>
        )}
        bulkActions={(ids, clear) => (
          <Button size="sm" variant="pri" icon={commitIcon} onClick={() => { onCommit(ids.map(String)); clear() }}>
            {commitLabel} {ids.length}
          </Button>
        )}
        rowActions={null}
        emptyTitle="No applications available"
        emptyBody={filtered
          ? 'No application matches these filters. Clear them to see everything available.'
          : emptyBody}
        emptyIcon="apps"
        footNote={`${num(rows.length)} of ${num(source.length)} available applications shown`}
      />

      <div className="t-xs t-mut">
        Tick one or more rows to reveal the assign action. Nothing changes until you use it.
      </div>
    </div>
  )
}
