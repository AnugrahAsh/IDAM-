import './RolesPage.css'
import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Avatar from '../../components/primitives/Avatar'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import { num, statusTone } from '../../lib/format'

/**
 * Choosing identities to add to a role.
 *
 * This was an inline card that pushed the register down the page, showed the
 * first sixty matches with no way to reach the sixty-first, and offered no
 * filters, no select-all and no page size.
 *
 * It is the console's own register now rather than a bespoke list, so search,
 * paging, rows-per-page, select-all and the bulk bar all behave the way they do
 * on every other screen, and the commit lives in the bulk bar where an operator
 * already looks for it. Taking members out in bulk is a CSV, beside the import.
 */

const ALL_ORG = 'All organizations'
const ALL_DEPT = 'All departments'
const ALL_TYPE = 'All types'
const ALL_STATUS = 'All statuses'

export default function MemberPicker({ role, source, onCommit, onCancel }) {
  const [org, setOrg] = useState(ALL_ORG)
  const [dept, setDept] = useState(ALL_DEPT)
  const [type, setType] = useState(ALL_TYPE)
  const [status, setStatus] = useState(ALL_STATUS)

  // Built from the candidates in hand, so a filter never offers a value that
  // would return nothing.
  const options = useMemo(() => ({
    orgs: [ALL_ORG, ...[...new Set(source.map((u) => u.organization))].sort()],
    depts: [ALL_DEPT, ...[...new Set(source.map((u) => u.department))].sort()],
    types: [ALL_TYPE, ...[...new Set(source.map((u) => u.employeeType))].sort()],
    statuses: [ALL_STATUS, ...[...new Set(source.map((u) => u.status))].sort()],
  }), [source])

  const rows = useMemo(() => source.filter((u) => (
    (org === ALL_ORG || u.organization === org)
    && (dept === ALL_DEPT || u.department === dept)
    && (type === ALL_TYPE || u.employeeType === type)
    && (status === ALL_STATUS || u.status === status)
  )), [source, org, dept, type, status])

  const filtered = rows.length !== source.length

  const columns = [
    {
      key: 'username', label: 'Identity', locked: true, cls: 'td-main',
      value: (r) => `${r.username} ${r.email} ${r.firstName} ${r.lastName}`,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.username}</span>
            <span className="cell-sub">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'organization', label: 'Organization' },
    { key: 'department', label: 'Department' },
    { key: 'employeeType', label: 'Type', render: (r) => <span className="tag">{r.employeeType}</span> },
    { key: 'status', label: 'Status', width: 118, render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
  ]

  const reset = () => { setOrg(ALL_ORG); setDept(ALL_DEPT); setType(ALL_TYPE); setStatus(ALL_STATUS) }

  return (
    <div className="stack">
      <div className="banner" data-tone="info">
        <Icon name="plus" size={15} />
        <div>
          Tick the identities to grant {role.name}. Direct assignment is recorded against you in the role&rsquo;s
          activity log.
        </div>
      </div>

      <DataWorkbench
        id="role-member-picker"
        rows={rows}
        columns={columns}
        selectable
        pageSize={25}
        searchPlaceholder="Search by username, email, name or department…"
        /* Each select's resting value names its own field — "All departments"
           needs no DEPARTMENT above it — so the labels are gone and the four
           read as one filter row rather than four separate fields. They sit
           beside the search, which is where the other registers put their
           filters. */
        filters={(
          <div className="mp-filters">
            <Select options={options.orgs} value={org} onChange={(e) => setOrg(e.target.value)} aria-label="Filter by organization" />
            <Select options={options.depts} value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department" />
            <Select options={options.types} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by employee type" />
            <Select options={options.statuses} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" />
            {filtered && <button type="button" className="mp-clear" onClick={reset}><Icon name="x" size={12} />Clear</button>}
          </div>
        )}
        /* The commit sits in the bulk bar, which is where a selection is acted
           on everywhere else in the console — and it only appears once there is
           a selection to act on. */
        bulkActions={(ids, clear) => (
          <Button size="sm" variant="pri" icon="plus" onClick={() => { onCommit(ids.map(Number)); clear() }}>
            Add {ids.length} to role
          </Button>
        )}
        rowActions={null}
        emptyTitle="No identities available"
        emptyBody={filtered
          ? 'No identity outside the role matches these filters. Clear them to see everyone available.'
          : 'Every identity in the directory already holds this role.'}
        emptyIcon="users"
        footNote={`${num(rows.length)} of ${num(source.length)} available identities shown`}
      />

      {onCancel && (
        <div className="t-xs t-mut">
          Tick one or more rows to reveal the add action. Nothing changes until you use it.
        </div>
      )}
    </div>
  )
}
