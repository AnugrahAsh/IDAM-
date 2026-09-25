/**
 * What a catalog card draws.
 *
 * The card used to carry fourteen days of record counts as a sparkline. The
 * ledger a report reads does not run evenly over fourteen days, so the line
 * came out as 1,2,1,2 or flattened at 5 — the shape of the sample rather than
 * anything about the report. A reader choosing a report asks what is in it, so
 * each report declares the one column it is actually read by and the card
 * draws that column's composition from the report's own rows: the split of a
 * delivery log into delivered and failed, of a sign-in log into the clients
 * that produced it, of an audit trail into severities.
 *
 * Nothing is stored. The composition is counted from the rows on render, the
 * same rows the report itself renders and exports.
 */

/* `outcome` means the values carry a verdict, so they are coloured by it and
   the failures are counted out separately. `split` means the values are peers
   — a channel, an operation — and are coloured only to be told apart. */
const SIGNALS = {
  'successful-logins': { field: 'client', label: 'Client', kind: 'split' },
  'failed-logins': { field: 'reason', label: 'Reason', kind: 'split' },
  'user-access': { field: 'status', label: 'Account status', kind: 'outcome' },
  'locked-accounts': { field: 'status', label: 'State', kind: 'outcome' },
  'password-resets': { field: 'outcome', label: 'Outcome', kind: 'outcome' },
  'email-delivery': { field: 'status', label: 'Delivery', kind: 'outcome' },
  'sms-delivery': { field: 'status', label: 'Delivery', kind: 'outcome' },
  'sms-otp': { field: 'status', label: 'OTP outcome', kind: 'outcome' },
  'role-mapping': { field: 'operation', label: 'Operation', kind: 'split' },
  'user-group': { field: 'operation', label: 'Membership change', kind: 'split' },
  'audit-trail': { field: 'level', label: 'Severity', kind: 'outcome' },
}

/* Only words that genuinely carry a verdict are tinted by it. A revoked role
   and a removed group are routine hygiene, not failures, so they stay in the
   neutral palette with the rest of their column. */
const VERDICT = [
  [/^(delivered|verified|completed|succeeded|success|allowed|active|info)$/i, 'ok'],
  [/^(failed|denied|error|rejected|locked|account locked|notice failed)$/i, 'bad'],
  [/^(expired|pending|disabled|dormant|warn)$/i, 'warn'],
]

/* What the chip on the card calls a failure. The column's own word, in the
   plural the sentence needs: six ERROR rows read as "6 errors", six Locked
   identities as "6 locked". Two failing values that mean the same thing share
   one word; two that do not are only "flagged". */
const FLAG_WORD = [
  [/fail/i, 'failed'],
  [/error/i, 'errors'],
  [/lock/i, 'locked'],
  [/denied|deny/i, 'denied'],
  [/reject/i, 'rejected'],
  [/disabled/i, 'disabled'],
]
const flagWord = (label) => (FLAG_WORD.find(([re]) => re.test(label)) || [null, 'flagged'])[1]

const VERDICT_COLOR = { ok: 'var(--ok)', bad: 'var(--bad)', warn: 'var(--warn-core)', mut: 'var(--mut-solid)' }
// Hues that stay apart in both themes; red is reserved for a real failure.
const SERIES = ['var(--s1)', 'var(--s5)', 'var(--s3)', 'var(--s2)', 'var(--s8)', 'var(--s7)']

// Beyond five segments a bar stops being readable and starts being a texture.
// A column with six values keeps its five largest and collects the tail.
const SEGMENTS = 5

export const signalOf = (reportId) => SIGNALS[reportId] || null

export function composition(report, rows) {
  const sig = SIGNALS[report.id]
  if (!sig || !rows.length) return null

  const counts = new Map()
  for (const row of rows) {
    const raw = row[sig.field]
    const key = raw == null || raw === '' || raw === '—' ? 'Not recorded' : String(raw)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const verdictOf = (label) => {
    if (sig.kind !== 'outcome') return null
    const hit = VERDICT.find(([re]) => re.test(label))
    return hit ? hit[1] : 'mut'
  }

  const ordered = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const pct = (n) => (n / rows.length) * 100

  // A value is either drawn and named, or collected into the tail with the
  // others — never drawn as itself and then called "other" in the legend.
  const named = ordered.length > SEGMENTS ? ordered.slice(0, SEGMENTS - 1) : ordered
  const parts = named.map(([label, n], i) => {
    const verdict = verdictOf(label)
    return { label, n, pct: pct(n), verdict, color: verdict ? VERDICT_COLOR[verdict] : SERIES[i % SERIES.length] }
  })
  const rest = ordered.slice(named.length)
  if (rest.length) {
    const restN = rest.reduce((a, [, n]) => a + n, 0)
    parts.push({
      label: `${rest.length} other`, n: restN, pct: pct(restN),
      verdict: 'mut', color: VERDICT_COLOR.mut, rest: true,
      title: rest.map(([label, n]) => `${label} ${n}`).join(', '),
    })
  }

  // The one figure worth reading before the report is opened: how much of it
  // went wrong. Only an outcome column can answer that.
  const flagged = ordered.filter(([label]) => verdictOf(label) === 'bad')
  const words = [...new Set(flagged.map(([label]) => flagWord(label)))]
  const flag = flagged.length
    ? { n: flagged.reduce((a, [, n]) => a + n, 0), label: words.length === 1 ? words[0] : 'flagged' }
    : null

  return { field: sig.field, label: sig.label, kind: sig.kind, total: rows.length, parts, flag }
}
