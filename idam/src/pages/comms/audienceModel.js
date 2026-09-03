import { USERS } from '../../data/seed'
import { blankModel, evalModel } from '../conditions/conditionModel'
import { attrIndex, attributes, matchUsers } from '../policy/policyPageData'
import { AUDIENCES } from './commsData'

// ---------------------------------------------------------------------------
// Who a message or a link is for.
//
// One shape, used by announcements and by quick links, because "who sees this"
// is the same question in both places and was previously answered two different
// ways — a fixed list of seven groups here, a single attribute comparison
// there. Neither could name a handful of specific people, which is the thing
// operators actually asked for most often.
//
// Three modes, in increasing order of precision:
//
//   audience   one of the standing groups; the cheapest answer
//   users      an explicit list of identities, chosen by name
//   condition  a predicate over the identity record, written in the same
//              builder as Dynamic Policy — so a rule reads the same wherever
//              it appears in the console
// ---------------------------------------------------------------------------

export const AUDIENCE_MODES = [
  { id: 'audience', label: 'Standing group', icon: 'users', hint: 'One of the groups the platform already maintains.' },
  { id: 'users', label: 'Specific people', icon: 'user', hint: 'Chosen by name. Nobody else sees it.' },
  { id: 'condition', label: 'Matching a condition', icon: 'filter', hint: 'Everyone whose identity record satisfies the rule.' },
]

/* Categories a published notice is filed under. Distinct from severity: an
   announcement can be routine and still be a compliance notice. */
export const NOTIFICATION_CATEGORIES = ['Announcements', 'Compliance', 'Governance']

export const CATEGORY_TONE = {
  Announcements: 'acc',
  Compliance: 'warn',
  Governance: 'viol',
}

export const userOptions = () => USERS.map((u) => ({
  value: u.id,
  label: `${u.firstName} ${u.lastName} · ${u.username}`,
}))

export const blankAudience = (audience = AUDIENCES[0]) => ({
  mode: 'audience',
  audience,
  users: [],
  condition: blankModel(attributes()[0].id),
})

/* A record written before this shape existed carries only the old fields. It is
   read forward rather than migrated in the seed, so nothing has to be rewritten
   and an older record still opens.

   Quick links additionally carried a single attribute comparison
   (`visibilityAttr` / `visibilityOp` / `visibilityValue`); that is exactly a
   one-rule condition, so it is lifted into one rather than discarded. */
export const readAudience = (record = {}, field = 'audience') => {
  if (record.audienceMode) {
    return {
      mode: record.audienceMode,
      audience: record[field] || AUDIENCES[0],
      users: record.audienceUsers || [],
      condition: record.audienceCondition || blankModel(attributes()[0].id),
    }
  }

  const legacyAttr = record.visibilityAttr
  if (legacyAttr && String(record.visibilityValue || '').trim()) {
    const op = record.visibilityOp === 'is not' ? '!=' : record.visibilityOp === 'contains' ? 'contains' : '='
    return {
      mode: 'condition',
      audience: record[field] || AUDIENCES[0],
      users: [],
      condition: {
        join: 'AND',
        groups: [{ join: 'AND', rules: [{ attribute: legacyAttr, operator: op, value: record.visibilityValue }] }],
      },
    }
  }

  return blankAudience(AUDIENCES.includes(record[field]) ? record[field] : AUDIENCES[0])
}

/* Flattened back onto the record. `field` keeps the legacy string column
   populated with something readable, because registers, previews and seeded
   rows still sort and search on it. */
export const writeAudience = (a, field = 'audience') => ({
  [field]: describeAudience(a),
  audienceMode: a.mode,
  audienceUsers: a.mode === 'users' ? a.users : [],
  audienceCondition: a.mode === 'condition' ? a.condition : undefined,
})

export const matchedUsers = (a) => {
  if (!a) return []
  if (a.mode === 'users') {
    const set = new Set((a.users || []).map(String))
    return USERS.filter((u) => set.has(String(u.id)))
  }
  if (a.mode === 'condition') return matchUsers(a.condition)
  return []
}

/* What the audience covers, as a number the operator can sanity-check.

   A standing group is a platform-side count and is far larger than the sample
   of identities this console holds, so the two are never added together — the
   picker labels which kind of number it is showing. */
export const reachOf = (a) => {
  if (!a) return 0
  if (a.mode === 'users') return (a.users || []).length
  if (a.mode === 'condition') return matchUsers(a.condition).length
  return groupReach(a.audience)
}

export const groupReach = (name) => ({
  'All users': 3892,
  'Privileged identities': 84,
  Administrators: 12,
  Finance: 412,
  Engineering: 640,
  'Human Resources': 96,
  Contractors: 298,
}[name] ?? 412)

/* Whether the count is a platform-wide estimate or an exact count over the
   identities this console can see. The picker says which, so 84 and 12 are
   never read as the same kind of figure. */
export const reachIsExact = (a) => !!a && a.mode !== 'audience'

export const describeAudience = (a) => {
  if (!a) return AUDIENCES[0]
  if (a.mode === 'users') {
    const n = (a.users || []).length
    if (n === 0) return 'Nobody selected'
    if (n === 1) {
      const u = USERS.find((x) => String(x.id) === String(a.users[0]))
      return u ? `${u.firstName} ${u.lastName}` : '1 identity'
    }
    return `${n} selected identities`
  }
  if (a.mode === 'condition') {
    const n = matchUsers(a.condition).length
    return n === 1 ? '1 identity matching a condition' : `${n} identities matching a condition`
  }
  return a.audience
}

/* Whether a given identity is in scope. The notification inbox and the useful
   links page both need this to decide what to show. */
export const audienceIncludes = (a, user) => {
  if (!a || !user) return true
  if (a.mode === 'users') return (a.users || []).some((id) => String(id) === String(user.id))
  if (a.mode === 'condition') return evalModel(user, a.condition, attrIndex())
  if (a.audience === 'All users') return true
  if (a.audience === 'Administrators' || a.audience === 'Privileged identities') return !!user.isAdmin
  return user.department === a.audience || user.organization === a.audience
    || user.employeeType === a.audience
}

/* An audience that would reach nobody is nearly always a mistake, so the
   editors surface it rather than letting it publish quietly. */
export const audienceIssue = (a) => {
  if (!a) return ''
  if (a.mode === 'users' && (a.users || []).length === 0) return 'Choose at least one person, or pick a different audience.'
  if (a.mode === 'condition') {
    const rules = a.condition.groups.flatMap((g) => g.rules)
    if (rules.length === 0) return 'Add at least one condition, or pick a different audience.'
    if (rules.some((r) => r.raw == null && !String(r.value ?? '').trim() && !String(r.operator).startsWith('is '))) {
      return 'One condition has no value.'
    }
    if (matchUsers(a.condition).length === 0) return 'No identity currently matches this condition.'
  }
  return ''
}
