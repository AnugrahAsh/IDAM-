import { RECERTIFY_LINK_BASE } from '../../data/nav'
import { TODAY, reviewerAt } from './data'

/* The link a reviewer receives by email names one campaign, one user and one
   approval level. It is carried as an opaque token so the address doesn't
   read as something to edit by hand. */
const toToken = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromToken = (t) => atob(t.replace(/-/g, '+').replace(/_/g, '/'))

export const reviewLinkPath = (campaignId, userId, levelKey) => `${RECERTIFY_LINK_BASE}/${toToken(`${campaignId}:${userId}:${levelKey}`)}`

export function parseReviewLink(pathname) {
  const token = String(pathname || '').slice(RECERTIFY_LINK_BASE.length + 1).split('/')[0]
  try {
    const [campaignId, userId, levelKey] = fromToken(token).split(':')
    return campaignId && userId && levelKey ? { campaignId, userId, levelKey } : null
  } catch {
    return null
  }
}

/** Who the email for a level is addressed to: the auditor signs the last level. */
export const reviewerFor = (c, index, count) => (index === count - 1 ? c.auditor : reviewerAt(index + 1, c))

/* Submissions made through an email link. The link opens in its own tab, so
   they are kept in local storage and read back by the console's Items tab —
   the same record a submit from inside the console produces. */
const KEY = 'tf-recert-email-submissions'

export function readEmailSubmissions() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

export function saveEmailSubmission(entry) {
  const rest = readEmailSubmissions().filter((s) => !(String(s.campaignId) === String(entry.campaignId)
    && String(s.userId) === String(entry.userId) && s.key === entry.key))
  try { localStorage.setItem(KEY, JSON.stringify([...rest, { ...entry, on: TODAY }])) } catch { /* storage unavailable */ }
}

export const EMAIL_SUBMISSIONS_KEY = KEY

/** A campaign's users with every email-link submission for it applied. */
export function applyEmailSubmissions(campaignId, users) {
  const mine = readEmailSubmissions().filter((s) => String(s.campaignId) === String(campaignId))
  if (!mine.length) return users
  return users.map((u) => {
    const own = mine.filter((s) => String(s.userId) === String(u.id))
    if (!own.length) return u
    const keys = Object.keys(u.levels)
    const levels = { ...u.levels }
    own.forEach((s) => {
      if (!levels[s.key]) return
      levels[s.key] = { ...levels[s.key], mods: s.data, remarks: s.remarks, certified: true, mailSent: true, certifiedBy: s.by, certifiedOn: s.on }
      const next = keys[keys.indexOf(s.key) + 1]
      if (next) levels[next] = { ...levels[next], mailSent: true }
    })
    return { ...u, levels }
  })
}
