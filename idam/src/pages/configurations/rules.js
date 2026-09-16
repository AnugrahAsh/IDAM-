/*
 * The rules the Configuration screens enforce, kept away from the components.
 *
 * Two reasons they live here rather than inline. First, the same rule is
 * checked in more than one place — an attribute's storage class is needed by
 * the editor and by the delete guard, a condition is validated by the smart
 * populate panel and by the attribute that points at it. Second, the server
 * messages are quoted verbatim: operators search for the exact wording, so it
 * is worth having one place where that wording is defined and cannot drift.
 */

/** Server messages, reproduced exactly as the platform emits them. */
export const MSG = {
  attrNameTaken: 'Attribute with the same name already exists.',
  attrDisplayTaken: 'Attribute with the same display name already exists.',
  attrDataType: 'The attribute data type cannot be modified.',
  attrHasData: 'This attribute cannot be deleted because it contains data.',
  attrDefault: 'Default attribute cannot be deleted',
  sectionName: 'Section with the same name already exists.',
  sectionDisplay: 'Section with the same display name already exist',
  sectionDefault: 'Default section cannot be deleted',
  sectionHasAttrs: 'Section having attributes cannot be deleted',
  lookupDuplicateValues: 'Options array should not have duplicate values',
  lookupHasOptions: 'Lookup cannot be deleted with existing options.',
  lookupNameTaken: 'Lookup with the same name already exists.',
  csvHeaders: 'Invalid CSV format. Please ensure the file has the correct headers',
  levelsMismatch: 'Data levels do not match',
  smartExists: 'Already exists',
  smartInUse: 'Attribute is configured with other attribute',
  requiredDisabled: 'Cannot change required status of disabled attribute',
  requiredAuto: 'Cannot change required status of pre-populate or smart-populate attribute',
  requiredDefault: 'Required status of default attribute cannot be changed',
  atleastOneMapping: 'Atleast One Mapping is required',
}

/* ------------------------------------------------------------------ *
 * Attributes
 * ------------------------------------------------------------------ */

/** The nine input types an administrator may choose from. */
export const INPUT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date (YYYY-MM-DD)' },
  { value: 'tel', label: 'Phone number' },
  { value: 'lookup', label: 'Lookup' },
  { value: 'multi-level', label: 'Multi-level lookup' },
  { value: 'prepopulate', label: 'Pre-populate' },
  { value: 'smart-populate', label: 'Smart-populate' },
]

/*
 * Types the shipped schema still uses. They are not offered when creating an
 * attribute, but an existing record carrying one has to round-trip through the
 * editor without being silently rewritten to something else.
 */
export const LEGACY_TYPES = [
  { value: 'select', label: 'Select (legacy — behaves as Lookup)' },
  { value: 'textarea', label: 'Long text (legacy)' },
  { value: 'boolean', label: 'Yes / No (legacy)' },
]

// Short names for the list column. The dropdown says "legacy" in full, because
// that is where the distinction matters; a table of thirty rows does not need
// the caveat repeated on every one of them.
const TYPE_LABELS = {
  ...Object.fromEntries(INPUT_TYPES.map((t) => [t.value, t.label])),
  select: 'Lookup (legacy)',
  textarea: 'Long text',
  boolean: 'Yes / No',
}
export const typeLabel = (t) => TYPE_LABELS[t] || t

/*
 * The physical column an attribute is stored in. Changing input type is only
 * allowed while this stays the same, because the column already exists on the
 * users table and cannot be re-typed under live data.
 */
export const STORAGE = {
  text: 'text',
  textarea: 'text',
  email: 'text',
  tel: 'text',
  lookup: 'text',
  select: 'text',
  'multi-level': 'text',
  prepopulate: 'text',
  'smart-populate': 'text',
  number: 'number',
  date: 'date',
  boolean: 'boolean',
}
export const storageOf = (type) => STORAGE[type] || 'text'

/** Pre-populate and smart-populate: the system owns the value, not a person. */
export const isAuto = (type) => type === 'prepopulate' || type === 'smart-populate'

/** Types that bind a value list, and so may offer multi-select. */
export const isLookupType = (type) => type === 'lookup' || type === 'select' || type === 'multi-level'

/** Types that ask for length limits. */
export const hasLength = (type) => type === 'text' || type === 'textarea' || type === 'number'

/** The three presets offered for Text. */
export const VALID_CHARS = [
  { value: 'alpha', label: 'Only alphabets', hint: 'Letters and spaces.' },
  { value: 'alnum', label: 'Alphanumeric', hint: 'Letters, digits, underscore and space.' },
  { value: 'any', label: 'Alphanumeric, all special char.', hint: 'Any character.' },
]
export const validCharsLabel = (v) => (VALID_CHARS.find((c) => c.value === v) || {}).label || '—'

/** What an administrator may do with the attribute on the user form. */
export const ADMIN_PERM_HELP = {
  'Read & write': 'Visible and editable.',
  'Read only': 'Visible, cannot be changed.',
  Hide: 'Not shown to administrators at all.',
}

/** The attribute name is a storage key, not a label. */
export const NAME_HINT = "Do not use spaces or camelCase, you can use '_'."
export const NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/

/*
 * Default attributes ship with the product because the platform depends on
 * them. Two are deliberate exceptions and may still be opened for editing.
 */
export const DEFAULT_EDITABLE = ['organization', 'employeeType', 'employee_type']
export const canOpenDefault = (attr) => !attr.core || DEFAULT_EDITABLE.includes(attr.id)

/** Attributes that may be configured from the three-dot menu, and where to. */
export const CONFIGURE_TARGET = {
  username: 'username',
  email: 'email',
  employeeType: 'emptypes',
  employee_type: 'emptypes',
}

const lower = (v) => String(v == null ? '' : v).trim().toLowerCase()

/**
 * Everything checked before an attribute is saved.
 * Returns a message, or '' when the draft is acceptable.
 */
export function validateAttribute(draft, { attrs = [], editing = null } = {}) {
  const name = String(draft.id || '').trim()
  const label = String(draft.label || '').trim()
  if (!name) return 'Attribute name is required.'
  if (!NAME_RE.test(name)) return `“${name}” is not a valid attribute name. ${NAME_HINT}`
  if (!label) return 'Display name is required.'
  if (!draft.section) return 'Select a section. Create one on the Sections tab if the list is empty.'

  const others = attrs.filter((a) => a.id !== (editing && editing.id))
  if (others.some((a) => lower(a.id) === lower(name))) return MSG.attrNameTaken
  if (others.some((a) => lower(a.label) === lower(label))) return MSG.attrDisplayTaken

  // The column exists already; only its meaning may change, never its shape.
  if (editing && storageOf(editing.type) !== storageOf(draft.type)) return MSG.attrDataType

  if (hasLength(draft.type)) {
    const min = draft.min === '' || draft.min == null ? null : Number(draft.min)
    const max = draft.max === '' || draft.max == null ? null : Number(draft.max)
    // The platform skips this comparison when either box holds zero, which is
    // how 0/-5 gets through. The console checks both regardless.
    if (min != null && (Number.isNaN(min) || min < 0)) return 'Minimum length cannot be negative.'
    if (max != null && (Number.isNaN(max) || max < 0)) return 'Maximum length cannot be negative.'
    if (min != null && max != null && min > max) return 'Minimum length cannot be greater than maximum length.'
  }

  if (draft.type === 'lookup' && !draft.src) return 'Select the lookup list this attribute reads from.'
  if (draft.type === 'multi-level' && !draft.multiLookup) return 'Select the multi-level lookup this attribute reads from.'
  if (draft.type === 'multi-level' && !draft.level) return 'Select which level of the lookup this attribute holds.'
  if (draft.type === 'prepopulate' && !draft.source) return 'Select the attribute this one copies its value from.'
  if (draft.type === 'smart-populate' && !draft.smartRule) return 'Select the smart populate rule set that fills this attribute.'
  return ''
}

/**
 * Sources a pre-populate attribute may copy from.
 *
 * Filtered so a copy is always one hop from a value a human actually typed:
 * an auto-filled field can never be a source, which rules out chains and loops.
 */
export const prepopulateSources = (attrs, selfId) => attrs.filter((a) => (
  a.id !== selfId && !a.deleted && a.enabled !== false && !isAuto(a.type)
))

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

/** Lookup names are stored with this prefix; the editor strips it again. */
export const LOOKUP_PREFIX = 'Lookup.'

/*
 * The built-in employee-type list is stored under the shortened name the
 * platform ships it with, so it reads as Lookup.Employee rather than
 * Lookup.EmployeeType wherever it is listed.
 */
const LOOKUP_DISPLAY = { employee_type: 'Employee' }

export const lookupDisplayName = (key) => LOOKUP_PREFIX + (
  LOOKUP_DISPLAY[key] || String(key).split(/[_\s]+/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
)

/** The employee-type list is load-bearing: it can never be removed. */
export const isProtectedLookup = (key) => key === 'employee_type'

/** Values must be unique within a lookup; option labels may repeat. */
export function validateOptions(rows) {
  const kept = rows.filter((r) => String(r.option || '').trim() || String(r.value || '').trim())
  if (kept.some((r) => !String(r.option || '').trim())) return 'Every row needs an option label.'
  if (kept.some((r) => !String(r.value || '').trim())) return 'Every row needs a value.'
  const seen = new Set()
  for (const r of kept) {
    const v = lower(r.value)
    if (seen.has(v)) return MSG.lookupDuplicateValues
    seen.add(v)
  }
  return ''
}

/* ------------------------------------------------------------------ *
 * Smart populate conditions
 * ------------------------------------------------------------------ */

/** The eight comparison operators the condition language accepts. */
export const OPERATORS = ['=', '!=', '>=', '<=', '>', '<', 'IN', 'LIKE']

/** Characters that have no business in a condition are removed before parsing. */
export const sanitiseCondition = (expr) => String(expr == null ? '' : expr)
  .replace(/[;`\\]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const stripOuterParens = (s) => {
  const t = s.trim()
  if (!t.startsWith('(') || !t.endsWith(')')) return t
  let depth = 0
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '(') depth += 1
    else if (t[i] === ')') {
      depth -= 1
      if (depth === 0 && i < t.length - 1) return t
    }
  }
  return t.slice(1, -1).trim()
}

/** Split an expression on the AND / OR that sit outside quotes and brackets. */
export function splitClauses(expr) {
  const src = String(expr)
  const out = []
  let buf = ''
  let depth = 0
  let quote = null
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (quote) { buf += ch; if (ch === quote) quote = null; continue }
    if (ch === "'" || ch === '"') { quote = ch; buf += ch; continue }
    if (ch === '(') { depth += 1; buf += ch; continue }
    if (ch === ')') { depth -= 1; buf += ch; continue }
    if (depth === 0) {
      const m = src.slice(i).match(/^(AND|OR)\b/i)
      if (m && (i === 0 || /[\s)]/.test(src[i - 1]))) {
        out.push(buf)
        buf = ''
        i += m[0].length - 1
        continue
      }
    }
    buf += ch
  }
  out.push(buf)
  return out.map((c) => c.trim()).filter(Boolean)
}

/*
 * A symbolic operator may sit hard against the attribute name; a worded one
 * (IN, LIKE) has to be surrounded by whitespace, or `department` on its own
 * would parse as the column `departme` compared with the operator `n`.
 */
const SYMBOL_CLAUSE = /^([A-Za-z_][A-Za-z0-9_]*)\s*([<>=!]+|[^\s\w'"]+)\s*(.+)$/
const WORD_CLAUSE = /^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z]+)\s+(.+)$/

/** Parse one clause into attribute / operator / literal. */
export function parseClause(raw) {
  const clause = stripOuterParens(String(raw).trim())
  if (!clause) return { error: 'Invalid condition clause: (empty)' }
  const m = clause.match(SYMBOL_CLAUSE) || clause.match(WORD_CLAUSE)
  if (!m) return { error: `Invalid condition clause: ${clause}` }
  const [, column, rawOp, value] = m
  const operator = /^[A-Za-z]+$/.test(rawOp) ? rawOp.toUpperCase() : rawOp
  if (!OPERATORS.includes(operator)) return { error: `Invalid operator: ${rawOp}` }
  if (!String(value).trim()) return { error: `Invalid condition clause: ${clause}` }
  return { column, operator, value: String(value).trim() }
}

/**
 * Validate a whole condition expression against the live attribute list.
 * Returns a message, or '' when the expression is sound.
 */
export function validateCondition(expr, attrNames = []) {
  const clean = sanitiseCondition(expr)
  if (!clean) return 'Invalid condition clause: (empty)'
  const parts = splitClauses(clean)
  if (parts.length > 1) {
    for (const p of parts) {
      const err = validateCondition(p, attrNames)
      if (err) return err
    }
    return ''
  }
  const single = parts[0]
  const inner = stripOuterParens(single)
  if (inner !== single) return validateCondition(inner, attrNames)

  const parsed = parseClause(single)
  if (parsed.error) return parsed.error
  const known = attrNames.map(lower)
  if (!known.includes(lower(parsed.column))) return `Invalid column: ${parsed.column}`
  return ''
}

/** Every attribute name a condition refers to, for the "used by" summary. */
export function conditionColumns(expr) {
  const out = []
  splitClauses(sanitiseCondition(expr)).forEach((part) => {
    const inner = stripOuterParens(part)
    if (inner !== part) { conditionColumns(inner).forEach((c) => out.push(c)); return }
    const parsed = parseClause(part)
    if (!parsed.error && !out.includes(parsed.column)) out.push(parsed.column)
  })
  return out
}

/** Validate a whole rule set before it replaces the stored condition list. */
export function validateConditionRows(rows, attrNames) {
  const kept = rows.filter((r) => String(r.condition || '').trim() || String(r.value || '').trim())
  if (kept.length === 0) return 'Add at least one condition.'
  for (const r of kept) {
    const err = validateCondition(r.condition, attrNames)
    if (err) return err
    if (!String(r.value || '').trim()) return `A value is required for: ${String(r.condition).trim()}`
  }
  return ''
}

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */

const headerKey = (v) => String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

/**
 * Strict header check: every expected column present, in order, and nothing
 * else. A stray column is as much a mismatch as a missing one, because the
 * uploaded rows are written straight into a table of exactly this shape.
 */
export function headersMatch(firstRow, expected) {
  if (!firstRow || firstRow.length !== expected.length) return false
  return expected.every((c, i) => headerKey(firstRow[i]) === headerKey(c))
}

const cell = (v) => {
  const s = String(v == null ? '' : v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsvText = (headers, rows) => [
  headers.join(','),
  ...rows.map((r) => r.map(cell).join(',')),
].join('\n')

/** Hand the operator a file. Used by every "download the current data" link. */
export function downloadCsv(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ *
 * Username / email Combination rules — per-attribute settings
 * ------------------------------------------------------------------ */

/*
 * A Combination rule joins attribute values behind a prefix. Each attribute in
 * the sequence carries its own settings, in the shape the platform already
 * stores per attribute, so the console posts nothing the server does not
 * expect:
 *
 *   {
 *     attribute:     'firstName',  // which attribute
 *     input:         '_',          // literal text placed after this attribute
 *     is_var_length: true,         // Limited Chars — is the value trimmed?
 *     length:        3,            // how many characters; null when whole value
 *     end:           false,        // false = take from the start, true = from the end
 *     sequence_with: false,        // username only — see the note below
 *   }
 *
 * Control → field mapping:
 *   Use → Whole value      is_var_length: false, length: null
 *   Use → First n          is_var_length: true,  length: n, end: false
 *   Use → Last n           is_var_length: true,  length: n, end: true
 *   Follow with → Default  input = the rule's shared separator
 *   Follow with → override input = the chosen character
 *
 * "Default" is not stored as a flag: an attribute follows the shared separator
 * exactly when its `input` equals it, and changing the shared separator
 * rewrites every attribute that was following it (see followSharedSeparator).
 *
 * The trailing `input` of the last attribute is never emitted. On the email
 * screen the domain is appended after the assembled local part, so no
 * separator ever precedes the @.
 *
 * `sequence_with` (username only) recorded which attribute the running number
 * was tied to on the screen this one replaces. The field is kept on every
 * username attribute — default false, preserved on load and save so nothing is
 * lost — but deliberately has NO control in the editor. The user-creation
 * owner has not yet confirmed what the anchor scopes (one global counter, a
 * counter per distinct value of the anchored attribute, or something else),
 * and a control must not be invented around unconfirmed behaviour. Once the
 * semantics are confirmed, either design the control into the expanded row or
 * drop the field on purpose — not by omission.
 */

/** Separator choices, shared by the rule's Separator field and the per-attribute override. */
export const SEQ_SEPARATORS = [
  { value: '_', label: '_' },
  { value: '.', label: '.' },
  { value: '-', label: '-' },
  { value: '', label: 'none' },
]

export const separatorLabel = (v) => (v === '' || v == null ? 'none' : `“${v}”`)

/** A freshly added attribute: whole value, following the shared separator. */
export function blankAttributeSetting(attribute, separator = '_', { withSequence = true } = {}) {
  const base = {
    attribute,
    input: separator == null ? '' : String(separator),
    is_var_length: false,
    length: null,
    end: false,
  }
  return withSequence ? { ...base, sequence_with: false } : base
}

/*
 * Bring one stored entry up to the full shape. Rules seeded before the
 * per-attribute settings existed hold a bare attribute id; a partially
 * filled object is completed rather than replaced.
 */
export function normaliseAttributeSetting(raw, separator = '_', opts = {}) {
  if (raw == null) return null
  if (typeof raw === 'string') return blankAttributeSetting(raw, separator, opts)
  const attribute = raw.attribute || raw.id || raw.value
  if (!attribute) return null
  const blank = blankAttributeSetting(attribute, separator, opts)
  const trimmed = !!raw.is_var_length
  const length = raw.length == null || raw.length === '' ? null : Number(raw.length)
  const out = {
    ...blank,
    input: raw.input == null ? blank.input : String(raw.input),
    is_var_length: trimmed,
    length: trimmed ? (Number.isNaN(length) ? null : length) : null,
    end: trimmed && !!raw.end,
  }
  if (opts.withSequence === false) delete out.sequence_with
  else out.sequence_with = !!raw.sequence_with
  return out
}

/** Migrate a whole sequence in place: strings become settings, duplicates collapse. */
export function normaliseSequence(list, separator = '_', opts = {}) {
  const seen = new Set()
  const out = []
  ;(Array.isArray(list) ? list : []).forEach((raw) => {
    const s = normaliseAttributeSetting(raw, separator, opts)
    if (s && !seen.has(s.attribute)) { seen.add(s.attribute); out.push(s) }
  })
  return out
}

/** The attribute ids in sequence order — what the multi-select shows. */
export const sequenceIds = (list) => (Array.isArray(list) ? list : [])
  .map((a) => (typeof a === 'string' ? a : a && a.attribute)).filter(Boolean)

/*
 * Reconcile the multi-select's new id list with the stored sequence: an
 * attribute that stays keeps its settings, a new one starts blank, and the
 * order is the order the multi-select reports.
 */
export function reconcileSequence(ids, current, separator, opts = {}) {
  const byId = new Map(normaliseSequence(current, separator, opts).map((a) => [a.attribute, a]))
  return sequenceIds(ids).map((id) => byId.get(id) || blankAttributeSetting(id, separator, opts))
}

/** The shared separator changed: every attribute that was following it follows the new one. */
export const followSharedSeparator = (list, from, to) => (Array.isArray(list) ? list : [])
  .map((a) => (typeof a !== 'string' && a.input === (from == null ? '' : String(from)) ? { ...a, input: to == null ? '' : String(to) } : a))

/** Does this attribute follow the rule's shared separator, or override it? */
export const followsShared = (setting, separator) => (setting.input == null ? '' : String(setting.input)) === (separator == null ? '' : String(separator))

/** Move one attribute to a new position. Pure; returns a new list. */
export function moveInSequence(list, attribute, index) {
  const rest = list.filter((a) => a.attribute !== attribute)
  const hit = list.find((a) => a.attribute === attribute)
  if (!hit) return list
  const at = Math.max(0, Math.min(rest.length, index))
  rest.splice(at, 0, hit)
  return rest
}

/** The character count is required and at least 1 once First or Last is chosen. */
export const attributeSettingError = (setting) => (
  setting && setting.is_var_length && !(Number.isInteger(setting.length) && setting.length >= 1)
    ? 'Enter how many characters to take — 1 or more.'
    : ''
)

/** Every problem in a sequence, keyed by attribute id. Empty when the sequence is sound. */
export function validateSequence(list) {
  const out = {}
  ;(Array.isArray(list) ? list : []).forEach((a) => {
    if (typeof a === 'string') return
    const err = attributeSettingError(a)
    if (err) out[a.attribute] = err
  })
  return out
}

/** One line describing an attribute's treatment: `First 2 characters · separator "."`. */
export function attributeSettingSummary(setting, { last = false } = {}) {
  const use = !setting.is_var_length
    ? 'Whole value'
    : `${setting.end ? 'Last' : 'First'} ${Number.isInteger(setting.length) && setting.length >= 1 ? setting.length : '?'} character${setting.length === 1 ? '' : 's'}`
  if (last) return `${use} · no trailing separator`
  return `${use} · separator ${separatorLabel(setting.input)}`
}
