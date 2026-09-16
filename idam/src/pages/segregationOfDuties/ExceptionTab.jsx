import { useMemo } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { exceptionColumns, exceptionsFor } from './sodData'

/**
 * The identities that do not satisfy the rule, and which half of it they hold.
 *
 * One column per entitlement in the combination, drawn from the rule rather
 * than from the rows: a rule with no exceptions still has to show what was
 * evaluated, and a table that drops its columns when it is empty answers the
 * question "clean against what?" with silence.
 *
 * Held and not-held are glyphs rather than words. A reader scanning eleven
 * columns is looking for a shape, and eleven repetitions of "TRUE" is not one.
 */
export default function ExceptionTab({ rule }) {
  const { toast } = useApp()
  const groups = useMemo(() => exceptionColumns(rule), [rule])
  const rows = useMemo(() => exceptionsFor(rule), [rule])

  const columns = [
    serialColumn('S.No'),
    { key: 'username', label: 'Username', cls: 'td-main td-mono', width: 200 },
    ...groups.map((g) => ({
      key: g,
      label: g.toUpperCase(),
      cls: 'sod-held',
      value: (r) => r[g],
      render: (r) => (r[g] === 'TRUE'
        ? <span className="sod-yes" title={`Holds ${g}`}><Icon name="check" size={13} stroke={2.6} /></span>
        : <span className="sod-no" title={`Does not hold ${g}`}><Icon name="x" size={13} stroke={2.6} /></span>),
    })),
  ]

  return (
    <div className="stack">
      <Banner tone={rows.length ? 'bad' : 'ok'}>
        {rows.length === 0
          ? <>No identity currently breaches <b>{rule.name}</b>. The {num(groups.length)} entitlements it grades are the columns below.</>
          : rule.type === 'Affinity'
            ? <><b>{num(rows.length)}</b> {rows.length === 1 ? 'identity holds' : 'identities hold'} part of this combination without holding the rest.</>
            : <><b>{num(rows.length)}</b> {rows.length === 1 ? 'identity holds' : 'identities hold'} more than one entitlement from this combination.</>}
      </Banner>

      <DataWorkbench
        id={`sod-exceptions-${rule.id}`}
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchPlaceholder="Search exceptions by username…"
        toolbar={(
          <Button
            size="sm"
            icon="download"
            onClick={() => toast('ok', 'Export queued', `${num(rows.length)} ${rows.length === 1 ? 'exception' : 'exceptions'} for ${rule.name} queued for CSV export.`)}
          >
            Export
          </Button>
        )}
        emptyTitle="No exception"
        emptyBody={`Every identity satisfies ${rule.name} as it currently stands.`}
        emptyIcon="checkC"
        footNote="Evaluated against the entitlements each identity holds right now"
        pageSize={10}
      />
    </div>
  )
}
