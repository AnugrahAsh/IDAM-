import { DICTIONARY_WORDS } from '../../data/dictionary'
import { ORGANIZATIONS } from '../../data/seed'

export const LIST_PATH = '/iam/passwordPolicy'


export const DEFAULT_RULES = {
  maxLength: 64,
  upper: 1,
  lower: 1,
  digits: 1,
  special: 1,
  maxRepeat: 2,
  // Alphabetic characters are counted separately from upper and lower: a
  // policy can demand "at least eight letters" without dictating the case mix.
  alpha: 0,
  startAlphanumeric: false,
  requiredChars: '',
  forbiddenChars: '',
  noSequential: true,
  // The three identity rejections are independent: a tenant that bans the
  // username in a credential does not necessarily ban the display name.
  noUsername: true,
  noName: true,
  noEmail: true,
  minAgeHours: 24,
  warnDays: 14,
  graceLogins: 3,
  selfService: true,
  lockoutReset: 'Automatic after the window',
}


export const SPECIALS = '!@#$%^&*()-_=+[]{};:,.<>?/~'


export const seatsFor = (orgs) =>
  ORGANIZATIONS.filter((o) => orgs.includes(o.name)).reduce((a, o) => a + o.users, 0)


export const expiryLabel = (p) => (p.expiryDays === 0 ? 'Never expires' : `${p.expiryDays} days`)


export const poolSize = (r) => {
  let pool = 0
  if (r.lower > 0) pool += 26
  if (r.upper > 0) pool += 26
  if (r.digits > 0) pool += 10
  if (r.special > 0) pool += SPECIALS.length
  return pool || 62
}


export const entropyBits = (r) => Math.round(r.minLength * Math.log2(poolSize(r)))


export const crackTime = (bits) => {
  const seconds = Math.pow(2, bits - 1) / 1e11
  if (seconds < 1) return 'under a second'
  if (seconds < 60) return `${Math.round(seconds)} seconds`
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`
  const years = seconds / 31536000
  if (years < 1000) return `${Math.round(years)} years`
  if (years < 1e6) return `${Math.round(years / 1000)} thousand years`
  if (years < 1e9) return `${Math.round(years / 1e6)} million years`
  if (years < 1e12) return `${Math.round(years / 1e9)} billion years`
  return 'longer than the age of the universe'
}


export const strengthBand = (bits) => {
  if (bits >= 90) return { tone: 'ok', label: 'Very strong' }
  if (bits >= 70) return { tone: 'ok', label: 'Strong' }
  if (bits >= 55) return { tone: 'warn', label: 'Adequate' }
  return { tone: 'bad', label: 'Weak' }
}


export const countOf = (value, test) => [...value].filter(test).length


export const hasRun = (value, max) => {
  let run = 1
  for (let i = 1; i < value.length; i += 1) {
    run = value[i] === value[i - 1] ? run + 1 : 1
    if (run > max) return true
  }
  return false
}


export const hasSequence = (value) => {
  const low = value.toLowerCase()
  for (let i = 2; i < low.length; i += 1) {
    const a = low.charCodeAt(i - 2)
    const b = low.charCodeAt(i - 1)
    const c = low.charCodeAt(i)
    if (b === a + 1 && c === b + 1) return true
    if (b === a - 1 && c === b - 1) return true
  }
  return false
}


const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`


export const requirementList = (r) => {
  const list = [
    { id: 'len', label: `At least ${plural(r.minLength, 'character', 'characters')}`, test: (v) => v.length >= r.minLength },
    { id: 'max', label: `No more than ${plural(r.maxLength, 'character', 'characters')}`, test: (v) => v.length <= r.maxLength },
  ]
  if (r.upper > 0) list.push({ id: 'upper', label: `At least ${plural(r.upper, 'upper-case letter', 'upper-case letters')}`, test: (v) => countOf(v, (c) => c >= 'A' && c <= 'Z') >= r.upper })
  if (r.lower > 0) list.push({ id: 'lower', label: `At least ${plural(r.lower, 'lower-case letter', 'lower-case letters')}`, test: (v) => countOf(v, (c) => c >= 'a' && c <= 'z') >= r.lower })
  if (r.digits > 0) list.push({ id: 'digits', label: `At least ${plural(r.digits, 'digit', 'digits')}`, test: (v) => countOf(v, (c) => c >= '0' && c <= '9') >= r.digits })
  if (r.special > 0) list.push({ id: 'special', label: `At least ${plural(r.special, 'symbol', 'symbols')}`, note: SPECIALS, mono: true, test: (v) => countOf(v, (c) => SPECIALS.includes(c)) >= r.special })
  if (r.maxRepeat > 0) list.push({ id: 'repeat', label: `No more than ${plural(r.maxRepeat, 'identical character', 'identical characters')} in a row`, test: (v) => !hasRun(v, r.maxRepeat) })
  if (r.alpha > 0) list.push({ id: 'alpha', label: `At least ${plural(r.alpha, 'letter', 'letters')}`, test: (v) => countOf(v, (c) => /[A-Za-z]/.test(c)) >= r.alpha })
  if (r.startAlphanumeric) list.push({ id: 'start', label: 'Must start with a letter or a digit', test: (v) => /^[A-Za-z0-9]/.test(v) })
  if (String(r.requiredChars || '').trim()) {
    const need = splitChars(r.requiredChars)
    list.push({
      id: 'need',
      label: `Must contain ${need.map((c) => (c === ' ' ? 'a space' : c)).join(', ')}`,
      mono: true,
      test: (v) => need.every((c) => v.includes(c)),
    })
  }
  if (String(r.forbiddenChars || '').trim()) {
    const banned = splitChars(r.forbiddenChars)
    list.push({
      id: 'banned',
      label: `Must not contain ${banned.map((c) => (c === ' ' ? 'a space' : c)).join(', ')}`,
      mono: true,
      test: (v) => banned.every((c) => !v.includes(c)),
    })
  }
  if (r.noSequential) list.push({ id: 'seq', label: 'No three sequential characters', note: 'such as abc or 321', test: (v) => !hasSequence(v) })
  if (r.noUsername) list.push({ id: 'user', label: 'Must not contain the username', test: (v, u) => !u || !v.toLowerCase().includes(u.toLowerCase()) })
  if (r.noName !== false) list.push({ id: 'name', label: 'Must not contain the first or last name', test: (v, u) => !u || !String(u).split(/[_.\s]+/).filter((p) => p.length > 2).some((p) => v.toLowerCase().includes(p.toLowerCase())) })
  if (r.noEmail !== false) list.push({ id: 'mail', label: 'Must not contain the email local part', test: (v, u) => !u || !v.toLowerCase().includes(String(u).split('@')[0].toLowerCase()) })
  if (r.dictionary) list.push({ id: 'dict', label: 'Must not contain a term from the password dictionary', test: (v) => !DICTIONARY_WORDS.some((w) => v.toLowerCase().includes(w)) })
  if (r.history > 0) list.push({ id: 'hist', label: `Must differ from the last ${plural(r.history, 'credential', 'credentials')}`, note: 'Checked against stored history at submission, not in this preview.', test: () => true, informational: true })
  return list
}


/* "@, #, !" and "<, >, &, space" are both written the way an operator types
   them, so the word `space` is accepted for the character that cannot be seen. */
export const splitChars = (v) => String(v || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean)
  .map((x) => (x.toLowerCase() === 'space' ? ' ' : x[0]))

export const SAMPLE_USERNAME = 'JANE_DOE'


export const historyFor = (policy) => {
  const trail = [
    { id: 'created', tone: 'acc', icon: 'plus', title: 'Policy created', sub: `${policy.name} was defined with a ${policy.minLength} character minimum.`, ts: 'v1.0 · SHUBHAM_JAIN' },
    { id: 'dict', tone: policy.dictionary ? 'ok' : 'mut', icon: 'file', title: policy.dictionary ? 'Dictionary checking enabled' : 'Dictionary checking left disabled', sub: policy.dictionary ? 'Every credential is tested against the shared password dictionary.' : 'Only length, composition, history and lockout rules are enforced.', ts: 'v1.1 · VANSH_MAKHIJA' },
  ]
  if (policy.expiryDays === 0) {
    trail.push({ id: 'exp', tone: 'warn', icon: 'clock', title: 'Expiry removed', sub: 'Credentials under this policy never expire. Reserved for service principals whose secrets are rotated by an automated job.', ts: 'v1.2 · SHUBHAM_JAIN' })
  } else {
    trail.push({ id: 'exp', tone: 'ok', icon: 'clock', title: `Expiry set to ${policy.expiryDays} days`, sub: `Identities are warned ${policy.warnDays} days before expiry and allowed ${policy.graceLogins} grace sign-ins afterwards.`, ts: 'v1.2 · PRIYA_NAIR' })
  }
  trail.push({
    id: 'apply', tone: policy.orgs.length > 0 ? 'ok' : 'warn', icon: 'building',
    title: policy.orgs.length > 0 ? `Applied to ${policy.orgs.length} organization${policy.orgs.length === 1 ? '' : 's'}` : 'Not assigned to any organization',
    sub: policy.orgs.length > 0 ? policy.orgs.join(', ') : 'The policy is defined but governs nothing until it is applied.',
    ts: 'Current version',
  })
  return trail
}

