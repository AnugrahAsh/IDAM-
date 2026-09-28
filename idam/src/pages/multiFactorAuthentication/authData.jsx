import { MFA_METHODS, USERS } from '../../data/seed'
import { mfaOf } from '../users/posture'

export const BASE_PATH = '/iam/mfa'

/**
 * The population this screen reports on.
 *
 * It used to be a fixed 3,892 against per-factor enrolment counts in the
 * thousands, while the directory it describes holds 46 identities of which the
 * register says five have no second factor. The two screens then contradicted
 * each other on the same page load — "coverage 100%" beside "5 not enrolled".
 * Both now count the same identities the same way.
 *
 * Service accounts authenticate with a stored secret, so a second factor does
 * not apply to them and they are not part of the denominator.
 */
export const DIRECTORY = USERS.filter((u) => mfaOf(u).state !== 'na').length

const FACTOR_ID_BY_NAME = { Passkey: 'passkey', TOTP: 'totp', Push: 'push', 'Email OTP': 'email' }

/* How many identities hold each factor, taken from the directory rather than
   from a standalone constant that could drift away from it. */
export const ENROLLED_BY_FACTOR = USERS.reduce((acc, u) => {
  const { state, factor } = mfaOf(u)
  const id = state === 'on' ? FACTOR_ID_BY_NAME[factor] : null
  if (id) acc[id] = (acc[id] || 0) + 1
  return acc
}, Object.fromEntries(MFA_METHODS.map((m) => [m.id, 0])))

export const STRENGTH = {
  strongest: { tone: 'ok', label: 'Phishing-resistant' },
  strong: { tone: 'ok', label: 'Strong' },
  weak: { tone: 'warn', label: 'Weak' },
  weakest: { tone: 'bad', label: 'Discouraged' },
}


export const seedOf = (text) => [...String(text)].reduce((a, c) => a + c.charCodeAt(0), 0)


export const dayStr = (n) => new Date(Date.UTC(2026, 7, 5) - n * 86400000).toISOString().slice(0, 10)


export const providerHealth = (p) => {
  const s = seedOf(p.id)
  const method = MFA_METHODS.find((m) => m.id === p.factor)
  const challenges = (method ? method.enrolled : 500) * 4 + (s % 400)
  const failures = Math.round(challenges * (0.004 + (s % 17) / 1000))
  return {
    challenges7d: challenges,
    failures7d: failures,
    successRate: 100 - (failures / challenges) * 100,
    latencyMs: 40 + (s % 380),
    lastTest: `${dayStr(s % 5)} 09:${String(s % 60).padStart(2, '0')}:00`,
  }
}


/* ---------------------------------------------------------------------------
   Per-provider delivery health.

   Delivery health answered for the provider whose page you happened to open,
   which is the same gap Email and SMS Management had: an operator triaging a
   morning of failed challenges had to open five provider pages to find the one
   that was failing. The state below is read off the figures `providerHealth`
   already derives — never stored beside them, because a seeded "degraded" flag
   disagrees with the numbers under it the first time either is touched, and the
   flag is what an operator would believe.
   --------------------------------------------------------------------------- */

/* `attention` is what the summary counts: a factor an administrator withdrew
   from enrollment is a decision, not an incident, so it reads the way every
   other disabled record in the console reads and is not counted against the
   tenant. */
export const HEALTH_STATES = {
  ok: { id: 'ok', label: 'Healthy', tone: 'ok', attention: false },
  warn: { id: 'warn', label: 'Degraded', tone: 'warn', attention: true },
  bad: { id: 'bad', label: 'Failing', tone: 'bad', attention: true },
  off: { id: 'off', label: 'Disabled', tone: 'mut', attention: false },
}

/* The thresholds operations triages a factor on. Some proportion of challenges
   always fails — a mistyped code, a prompt left unanswered — so the bar is not
   zero: better than one in sixty-six is normal, worse than one in thirty-three
   is a provider to look at now. Latency is the other half, because a factor
   that works in half a second and a factor that works in half a minute are the
   same success rate and a different product. */
const FAIL_FAILING = 0.03
const FAIL_DEGRADED = 0.015
const LATENCY_DEGRADED = 250

/**
 * The triage state of one provider, with the figures that decided it.
 *
 * `drivers` is why this returns an object rather than a label. Two independent
 * thresholds raise the same amber pill, so the state alone does not say which
 * figure tripped it — a provider answering every challenge and taking four
 * hundred milliseconds to do it is amber for latency alone, and a head showing
 * its failure count, coloured, would say the opposite of what the arithmetic
 * said. The keys that crossed a threshold come back with the state, and they
 * are the figure ids the tab's tiles use, so the head colours exactly what the
 * body names.
 */
export const providerState = (p, enabled) => {
  const settled = (state) => ({ ...state, drivers: [] })
  if (!p) return settled(HEALTH_STATES.bad)
  if (!enabled) return settled(HEALTH_STATES.off)
  const h = providerHealth(p)
  const rate = h.challenges7d ? h.failures7d / h.challenges7d : 0
  // Both are collected rather than the first to match: a provider can be
  // failing challenges and slow at once, and the head has room to say so.
  const drivers = []
  if (rate >= FAIL_DEGRADED) drivers.push('failed')
  if (h.latencyMs > LATENCY_DEGRADED) drivers.push('latency')
  if (rate >= FAIL_FAILING) return { ...HEALTH_STATES.bad, drivers }
  if (drivers.length) return { ...HEALTH_STATES.warn, drivers }
  return { ...HEALTH_STATES.ok, drivers }
}


export const providerSeries = (p) => {
  const s = seedOf(p.id)
  const health = providerHealth(p)
  const daily = Math.round(health.challenges7d / 7)
  return Array.from({ length: 14 }, (_, i) => {
    const wave = Math.abs(Math.sin((s % 71) + i * 0.94))
    const issued = Math.round(daily * (0.6 + wave * 0.85))
    return {
      d: dayStr(13 - i).slice(5),
      issued,
      failed: Math.max(0, Math.round(issued * (0.006 + wave / 300))),
    }
  })
}


export const fieldsOf = (p) => p.groups.flatMap((g) => g.fields)


export const validateProvider = (p, values) => {
  const missing = fieldsOf(p).filter((f) => f.required && !String(values[f.key] === undefined ? '' : values[f.key]).trim())
  if (missing.length > 0) {
    return { field: missing[0].label, message: `${missing.map((f) => f.label).join(', ')} must be set before a connection can be attempted.` }
  }
  if (p.endpointKey && !/^https:\/\//i.test(String(values[p.endpointKey]))) {
    return { field: 'Endpoint', message: 'The endpoint must use https. The connector refuses to send credentials over plain http.' }
  }
  if (p.id === 'email') {
    if (!/^\d+$/.test(String(values.port)) || Number(values.port) < 1 || Number(values.port) > 65535) {
      return { field: 'Port', message: 'The port must be a number between 1 and 65535.' }
    }
    if (values.encryption === 'None') {
      return { field: 'Encryption', message: 'Unencrypted SMTP is refused. Select STARTTLS or TLS.' }
    }
    if (!String(values.senderAddress).includes('@')) {
      return { field: 'Sender address', message: 'The sender address must be a complete mailbox address.' }
    }
  }
  if (p.id === 'passkey') {
    const origins = String(values.origins).split('\n').map((o) => o.trim()).filter(Boolean)
    const bad = origins.find((o) => !o.startsWith('https://'))
    if (bad) return { field: 'Permitted origins', message: `${bad} is not an https origin. WebAuthn refuses every other scheme.` }
    const mismatch = origins.find((o) => !o.replace('https://', '').endsWith(String(values.rpId)))
    if (mismatch) return { field: 'Relying party id', message: `${mismatch} is not covered by the relying party id ${values.rpId}. Registration would fail in the browser.` }
  }
  if (p.id === 'totp' && Number(values.skew) > 2) {
    return { field: 'Acceptance skew', message: 'A skew above two windows accepts codes for more than five minutes and is refused by the engine.' }
  }
  return null
}

