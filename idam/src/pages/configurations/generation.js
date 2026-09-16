/* Shared helpers for username / email generation previews. Pure functions, no state. */

import { normaliseSequence } from './rules'

export const SAMPLE_USER = {
  firstName: 'Ananya',
  lastName: 'Sharma',
  empCode: 'TF10482',
  employeeType: 'Internal',
  department: 'Distribution Ops',
  country: 'IN',
}

export const PATTERN_TOKENS = [
  '{firstName}',
  '{lastName}',
  '{firstInitial}',
  '{lastInitial}',
  '{empCode}',
]

export const CASE_MODES = ['lowercase', 'UPPERCASE', 'As entered']

export function renderPattern(pattern, user = SAMPLE_USER) {
  return String(pattern || '')
    .replaceAll('{firstName}', user.firstName)
    .replaceAll('{lastName}', user.lastName)
    .replaceAll('{firstInitial}', user.firstName.slice(0, 1))
    .replaceAll('{lastInitial}', user.lastName.slice(0, 1))
    .replaceAll('{empCode}', user.empCode)
}

export function applyCase(value, mode) {
  if (mode === 'lowercase') return value.toLowerCase()
  if (mode === 'UPPERCASE') return value.toUpperCase()
  return value
}

export const CHARSETS = {
  'Letters, digits and . _ -': /[^a-zA-Z0-9._-]/g,
  'Letters and digits': /[^a-zA-Z0-9]/g,
  'Letters only': /[^a-zA-Z]/g,
}

export function sanitize(value, charset) {
  const re = CHARSETS[charset] || CHARSETS['Letters, digits and . _ -']
  return value.replace(re, '')
}

export const SUFFIX_STRATEGIES = ['Numeric suffix (01, 02…)', 'Random 4 digits', 'Append employee code']

export function suffixSample(base, strategy, user = SAMPLE_USER) {
  if (strategy === 'Random 4 digits') return `${base}4821`
  if (strategy === 'Append employee code') return `${base}.${user.empCode.toLowerCase()}`
  return `${base}02`
}

/* ---------------------------------------------------------------- username

   Username creation is configured per employee type: either an operator types
   the username on the identity form (manual), or the platform derives it from
   one of five fixed rules. The rule set is fixed rather than open-ended because
   downstream connectors are written against these five shapes.
*/

export const USERNAME_MODES = ['Manual', 'Dynamic']

export const USERNAME_RULES = [
  {
    id: 'incremental',
    label: 'Incremental',
    sub: 'A running number, zero padded.',
    fields: ['start', 'padding'],
  },
  {
    id: 'email',
    label: 'Email as username',
    sub: 'The local part of the identity email, or the whole address.',
    fields: ['emailPart'],
  },
  {
    id: 'mobile',
    label: 'Mobile no as username',
    sub: 'The registered mobile number, digits only.',
    fields: ['stripCountryCode'],
  },
  {
    id: 'prefix_incremental',
    label: 'Prefix_Incremental',
    sub: 'A fixed prefix followed by a running number.',
    fields: ['prefix', 'separator', 'start', 'padding'],
  },
  {
    id: 'combination',
    label: 'Combination',
    sub: 'Attribute values joined behind a prefix, with a sequence to break ties.',
    fields: ['prefix', 'attributes', 'separator', 'sequence', 'padding'],
  },
]

export const USERNAME_ATTRIBUTES = [
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'firstInitial', label: 'First initial' },
  { value: 'lastInitial', label: 'Last initial' },
  { value: 'empCode', label: 'Employee code' },
  { value: 'department', label: 'Department' },
  { value: 'employeeType', label: 'Employee type' },
  { value: 'country', label: 'Country' },
]

const attrValue = (id, user) => {
  if (id === 'firstInitial') return user.firstName.slice(0, 1)
  if (id === 'lastInitial') return user.lastName.slice(0, 1)
  return user[id] == null ? '' : String(user[id])
}

const pad = (n, width) => String(n).padStart(Math.max(1, Number(width) || 1), '0')

/* ---------------------------------------------------------- combination

   Each attribute in a Combination sequence carries its own settings (see the
   note in rules.js): how much of the value to take, from which end, and what
   literal text follows it. The shared separator is only the default for that
   trailing text, and the last attribute's trailing text is never emitted —
   what comes after it (a sequence number, or the email domain) brings its own
   joiner.
*/

/** The part of one attribute's value the setting keeps. */
export function takeValue(value, setting) {
  const v = value == null ? '' : String(value)
  if (!setting || !setting.is_var_length) return v
  const n = Number(setting.length)
  if (!Number.isInteger(n) || n < 1) return v
  return setting.end ? v.slice(-n) : v.slice(0, n)
}

/**
 * Assemble the attribute part of a rule: every non-empty value followed by its
 * own `input`, except the last. Returns '' when nothing is selected or every
 * value is empty. The sequence is normalised first so a rule seeded with bare
 * attribute ids renders exactly as it did before per-attribute settings.
 */
export function assembleSequence(attributes, separator, user = SAMPLE_USER) {
  const parts = normaliseSequence(attributes, separator)
    .map((a) => ({ value: takeValue(attrValue(a.attribute, user), a), input: a.input }))
    .filter((p) => p.value)
  return parts.map((p, i) => (i < parts.length - 1 ? `${p.value}${p.input}` : p.value)).join('')
}

// What the rule would produce for a sample identity. Used for the live preview
// beside the form, so a rule can be read before it is saved.
export function usernameSample(rule, user = SAMPLE_USER) {
  if (!rule) return ''
  const sep = rule.separator == null ? '_' : rule.separator
  switch (rule.type) {
    case 'incremental':
      return pad(rule.start || 1, rule.padding)
    case 'email': {
      const email = user.email || `${user.firstName}.${user.lastName}@tanflow.com`.toLowerCase()
      return rule.emailPart === 'Full address' ? email : email.split('@')[0]
    }
    case 'mobile': {
      const mobile = user.mobileNo || '+91 9812345678'
      const digits = mobile.replace(/\D/g, '')
      return rule.stripCountryCode ? digits.slice(-10) : digits
    }
    case 'prefix_incremental':
      return `${rule.prefix || ''}${sep}${pad(rule.start || 1, rule.padding)}`
    case 'combination': {
      const body = assembleSequence(rule.attributes, sep, user)
      const head = rule.prefix ? `${rule.prefix}${sep}` : ''
      const tail = rule.sequence ? `${sep}${pad(1, rule.padding)}` : ''
      return `${head}${body}${tail}`
    }
    default:
      return ''
  }
}

/**
 * The email rule: prefix, attribute values and domain. The local part is
 * assembled the same way as a username, then the domain is appended — no
 * separator ever sits before the @.
 */
export function emailSample(rule, user = SAMPLE_USER) {
  if (!rule) return ''
  const sep = rule.separator == null ? '.' : rule.separator
  const body = assembleSequence(rule.attributes, sep, user)
  const head = rule.prefix ? `${rule.prefix}${body ? sep : ''}` : ''
  const local = applyCase(`${head}${body}`, rule.caseMode).replace(/[^a-zA-Z0-9._-]/g, '')
  return local ? `${local}@${rule.domain}` : ''
}

export const usernameRule = (id) => USERNAME_RULES.find((r) => r.id === id) || null

export const blankUsernameRule = (type = 'combination') => ({
  type,
  prefix: '',
  separator: '_',
  start: 1,
  padding: 4,
  attributes: normaliseSequence(['firstName', 'lastName'], '_'),
  sequence: true,
  emailPart: 'Local part',
  stripCountryCode: true,
})
