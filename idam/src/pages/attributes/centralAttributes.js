/**
 * The central attribute configuration.
 *
 * One row is a named directory attribute: a label the rest of the console
 * refers to it by, the LDAP application it is read from, and the IDAM attribute
 * it resolves to. The LDAP attribute itself is not a fifth field — it is a
 * property of the IDAM attribute that was chosen, which is why the picker's
 * option label carries it in parentheses and the list column is derived rather
 * than entered.
 *
 * The register feeds the `Property` picker on a SAML User Property mapper, so a
 * name defined here is the same name every service provider sees.
 */

import { ATTR_MAPPINGS, DIRECTORIES } from '../../data/seed'
import { stampText } from '../../lib/clock'
import { useLocalState } from '../../lib/useLocalState'

/** The LDAP applications a definition may read from. */
export const LDAP_APPLICATIONS = DIRECTORIES.map((d) => ({ value: String(d.id), label: d.displayName }))

export const ldapApplicationLabel = (id) => {
  const hit = DIRECTORIES.find((d) => String(d.id) === String(id))
  return hit ? hit.displayName : '—'
}

/**
 * The IDAM attributes an LDAP application exposes, and the LDAP attribute each
 * one is read from.
 *
 * A mapping belongs to one directory, so the picker is dependent: until an LDAP
 * application is chosen there is nothing to choose between.
 */
export const idamAttributesFor = (ldapAppId) => {
  const dir = DIRECTORIES.find((d) => String(d.id) === String(ldapAppId))
  if (!dir) return []
  const rows = ATTR_MAPPINGS.filter((m) => m.directory === dir.displayName)
  // A directory with no mappings of its own still resolves the standard set,
  // which is what makes a newly registered LDAP application usable at once.
  const source = rows.length ? rows : ATTR_MAPPINGS
  return source.map((m) => ({
    value: m.idam,
    ldap: m.ldap,
    label: `${m.idam} (LDAP_Attribute: ${m.ldap})`,
  }))
}

/** The LDAP attribute an IDAM attribute resolves to, for the derived column. */
export const ldapAttributeFor = (ldapAppId, idamAttribute) => {
  const hit = idamAttributesFor(ldapAppId).find((a) => a.value === idamAttribute)
  return hit ? hit.ldap : ''
}

export const blankCentralAttribute = () => ({
  id: null,
  attributeName: '',
  displayName: '',
  ldapApplication: '',
  idamAttribute: '',
  createdOn: stampText(),
})

/**
 * Everything that must be true before a definition can be written.
 *
 * The uniqueness rule is deliberate rather than inherited: the reference
 * implementation permits duplicates, and its register carries the same
 * attribute name six times, which then appears six times in every picker fed
 * from it. A name that identifies nothing is not a name.
 */
export function centralAttributeIssues(draft, rows = []) {
  const out = []
  const name = String(draft.attributeName || '').trim()
  if (!name) out.push('An attribute name is required.')
  if (!String(draft.displayName || '').trim()) out.push('A display name is required.')
  if (!draft.ldapApplication) out.push('Select an LDAP application.')
  if (!draft.idamAttribute) out.push('Select an IDAM attribute.')
  if (name && rows.some((r) => r.id !== draft.id && r.attributeName.trim().toLowerCase() === name.toLowerCase())) {
    out.push(`${name} is already defined. Attribute names are unique across the register.`)
  }
  return out
}

const seedRow = (id, attributeName, displayName, dirIndex, idamAttribute) => ({
  id,
  attributeName,
  displayName,
  ldapApplication: String(DIRECTORIES[dirIndex].id),
  idamAttribute,
  createdOn: stampText(new Date(Date.UTC(2026, 4, 3 + id, 9, 12))),
})

export const CENTRAL_ATTRIBUTE_SEED = () => [
  seedRow(1, 'username', 'Username', 0, 'username'),
  seedRow(2, 'email', 'Email address', 0, 'email'),
  seedRow(3, 'firstName', 'First name', 0, 'firstName'),
  seedRow(4, 'lastName', 'Last name', 0, 'lastName'),
  seedRow(5, 'mobile_no', 'Mobile number', 0, 'mobileNo'),
  seedRow(6, 'department', 'Department', 2, 'department'),
]

/* Versioned: the register replaced a catalogue of whole mapper definitions, so
   a browser holding the old shape is re-seeded rather than left with rows this
   screen cannot render. */
export const CENTRAL_ATTRIBUTE_KEY = 'tf-idam-central-attributes-v1'

export function useCentralAttributes() {
  return useLocalState(CENTRAL_ATTRIBUTE_KEY, CENTRAL_ATTRIBUTE_SEED())
}

export function readCentralAttributes() {
  try {
    const raw = localStorage.getItem(CENTRAL_ATTRIBUTE_KEY)
    const parsed = raw == null ? null : JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : CENTRAL_ATTRIBUTE_SEED()
  } catch {
    return CENTRAL_ATTRIBUTE_SEED()
  }
}

/** The `Property` options a SAML User Property mapper offers. */
export const centralAttributeOptions = () =>
  readCentralAttributes().map((r) => ({ value: r.attributeName, label: `${r.displayName} · ${r.attributeName}` }))
