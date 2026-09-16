import Icon from '../../../components/primitives/Icon'
import { USERS } from '../../../data/seed'

// ---------------------------------------------------------------------------
// Categorised reconciliation results (client item 7).
//
// A run reads accounts off the target and correlates them against the identity
// store. Three questions matter afterwards: how many accounts were processed,
// which ones carry an identifier the store does not know, and which ones the
// store does know but disagrees with. The estate view and the per-application
// tab have to answer those the same way, so the split lives here rather than
// being derived twice.
// ---------------------------------------------------------------------------

export const CATEGORY = { ALL: 'all', USERNAME: 'username', DATA: 'data', MATCH: 'match' }

export const CATEGORY_LABELS = {
  [CATEGORY.USERNAME]: 'Mismatch user/username',
  [CATEGORY.DATA]: 'Mismatch user data',
  [CATEGORY.MATCH]: 'In step',
}

export const CATEGORY_TONES = {
  [CATEGORY.USERNAME]: 'bad',
  [CATEGORY.DATA]: 'warn',
  [CATEGORY.MATCH]: 'ok',
}

const FIELD_LABELS = {
  department: 'Department',
  designation: 'Designation',
  officeLevel: 'Office level',
  manager: 'Manager',
  mobileNo: 'Mobile number',
  status: 'Status',
}

const USER_BY_ID = Object.fromEntries(USERS.map((u) => [u.id, u]))

// What the attribute reads as on the target. There is no second system to read
// in the demo data, so the drifted value is derived from the identity itself —
// deterministically, so one account always shows the same before-and-after.
const targetValue = (field, user, seed) => {
  const source = user[field]
  if (field === 'status') return source === 'Active' ? 'Disabled' : 'Active'
  if (field === 'mobileNo') return `${String(source || '').slice(0, -3)}${100 + (seed % 900)}`
  const other = USERS[(user.id * 3 + seed + 5) % USERS.length]
  const candidate = other[field]
  return candidate && candidate !== source ? candidate : `${source || '—'} (stale)`
}

/** The attribute-level differences behind a "mismatch user data" row. */
export const differencesFor = (candidate) => {
  const user = candidate.userId ? USER_BY_ID[candidate.userId] : null
  if (!user) return []
  const seed = [...String(candidate.id)].reduce((a, c) => a + c.charCodeAt(0), 3)
  return (candidate.deltaFields || [])
    .filter((f) => FIELD_LABELS[f])
    .map((f, i) => ({
      field: f,
      label: FIELD_LABELS[f],
      source: user[f] == null || user[f] === '' ? '—' : String(user[f]),
      target: String(targetValue(f, user, seed + i * 13)),
    }))
}

export const categoryOf = (candidate) => {
  if (!candidate.matchedTo) return CATEGORY.USERNAME
  return (candidate.deltaFields || []).length > 0 ? CATEGORY.DATA : CATEGORY.MATCH
}

export const syncedUsersFor = (run) => ((run && run.candidates) || []).map((c) => {
  const category = categoryOf(c)
  return {
    id: c.id,
    account: c.account,
    identity: c.matchedTo,
    identityEmail: c.matchedEmail,
    department: c.department,
    employeeType: c.employeeType,
    confidence: c.confidence,
    rule: c.rule,
    lastSeen: c.lastSeen,
    category,
    differences: category === CATEGORY.DATA ? differencesFor(c) : [],
  }
})

export const categoryCounts = (rows = []) => ({
  all: rows.length,
  username: rows.filter((r) => r.category === CATEGORY.USERNAME).length,
  data: rows.filter((r) => r.category === CATEGORY.DATA).length,
  match: rows.filter((r) => r.category === CATEGORY.MATCH).length,
})

/** Cards for StatCards. Each one carries an id, so clicking it filters below. */
export const categoryCards = (counts) => [
  {
    id: CATEGORY.ALL,
    icon: 'users',
    label: 'Total users',
    value: counts.all,
    chip: `${counts.match} in step`,
    chipTone: 'ok',
    sub: 'Accounts read from the target and processed',
    hint: 'Every account the run processed',
  },
  {
    id: CATEGORY.USERNAME,
    icon: 'orphan',
    label: 'Mismatch users/username',
    value: counts.username,
    chip: counts.username ? 'no identity' : 'clear',
    chipTone: counts.username ? 'bad' : 'ok',
    sub: 'The identifier matches no identity in the store',
    hint: 'Accounts whose identifier could not be correlated',
  },
  {
    id: CATEGORY.DATA,
    icon: 'edit',
    label: 'Mismatch user data',
    value: counts.data,
    chip: counts.data ? 'attributes differ' : 'clear',
    chipTone: counts.data ? 'warn' : 'ok',
    sub: 'The identifier matches, the attribute values do not',
    hint: 'Correlated accounts holding values the store disagrees with',
  },
]

export const filterByCategory = (rows, category) => (
  !category || category === CATEGORY.ALL ? rows : rows.filter((r) => r.category === category)
)

/**
 * The differences on one row, spelled out.
 *
 * A count of changed attributes tells an operator that something is wrong but
 * not what, which is the complaint this view exists to answer — so the store
 * value and the target value are both on screen.
 */
export function DifferenceList({ rows = [], limit = 3 }) {
  if (rows.length === 0) return <span className="t-faint">—</span>
  return (
    <span className="diff-list">
      {rows.slice(0, limit).map((d) => (
        <span className="diff-it" key={d.field}>
          <span className="diff-k">{d.label}</span>
          <span className="diff-v mono">{d.source}</span>
          <Icon name="arrowRight" size={10} />
          <span className="diff-v mono" data-drift>{d.target}</span>
        </span>
      ))}
      {rows.length > limit && (
        <span className="t-xs t-mut">{rows.length - limit} more attribute{rows.length - limit === 1 ? '' : 's'} differ</span>
      )}
    </span>
  )
}
