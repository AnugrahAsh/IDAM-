// ---------------------------------------------------------------------------
// Attribute configuration model.
//
// One attribute definition answers two questions: what is released, and where
// the value comes from. Both halves are protocol-specific — a SAML assertion
// carries a named attribute with a NameFormat, an OIDC token carries a claim
// with a JSON type and a set of tokens it is written into — so the mapper types
// are declared separately per protocol and never share a field between them.
//
// `fields` is the whole editor for a mapper type. Each entry is rendered by
// <MapperFields /> in facetControls.jsx, so adding a mapper type here is enough
// to make it configurable everywhere it is offered.
//
// The same model backs three surfaces:
//   · the centralised catalogue at /iam/attributeConfigurations,
//   · the Attribute Configuration section on an SSO application,
//   · anywhere an application's released values are summarised.
// ---------------------------------------------------------------------------

import { GROUPS, SSO_APPS } from '../../data/seed'
import { IDAM_ATTRS } from '../shared/provisioning/shared'
import { SAML_NAME_FORMATS } from './appModel'
import { centralAttributeOptions } from '../attributeConfiguration/centralAttributes'

/* Two pickers read registers that live outside this file, and both are read at
   render time rather than at module load: a client registered a minute ago has
   to be offerable without a reload. `options` may therefore be a function, and
   the renderer calls it. */
const ssoClientOptions = () => SSO_APPS.map((a) => ({ value: a.name, label: a.name }))

const applicationGroupOptions = () => GROUPS.map((g) => ({ value: g.name, label: g.name }))

/** The subject formats a NameID mapper may assert. */
export const NAME_ID_FORMATS = [
  'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
]

/** The two mapper families. Every protocol resolves to exactly one of them. */
export const PROTOCOL_FAMILIES = ['SAML', 'OIDC']

/** A protocol's mapper family. OAuth and its mobile profile are OIDC clients;
 *  JWT issues a token of the same shape, so it reads the OIDC mappers too. */
export const familyOf = (protocol) => (protocol === 'SAML' ? 'SAML' : 'OIDC')

export const CLAIM_TYPES = ['String', 'Long', 'Integer', 'Boolean', 'JSON']

export const GROUP_FORMATS = [
  { value: 'name', label: 'Group name' },
  { value: 'dn', label: 'Distinguished name' },
  { value: 'path', label: 'Full group path' },
]

export const ROLE_SCOPES = [
  { value: 'application', label: 'Roles granted on this application' },
  { value: 'platform', label: 'Every platform role' },
]

/* A SAML User Property picks from the central attribute register, so a name
   defined once there is the name every service provider is offered. An OIDC
   User Property is free text — the reference implementation asks for the
   property by name rather than picking it. */
const centralProperties = () => centralAttributeOptions()

const SESSION_NOTES = ['clientId', 'clientHost', 'clientAddress', 'authenticationMethod', 'identityProvider']

// ---------------------------------------------------------------------------
// SAML mapper types
//
// Every SAML mapper releases a named attribute into the assertion, so all of
// them carry the SAML attribute name, its friendly name and its NameFormat.
// Nothing here mentions a token, a claim or a JSON type — those belong to OIDC.
// ---------------------------------------------------------------------------

const SAML_ATTRIBUTE_FIELDS = [
  {
    id: 'samlAttributeName',
    label: 'SAML attribute name',
    required: true,
    mono: true,
    placeholder: 'urn:oid:0.9.2342.19200300.100.1.3',
    hint: 'The Name written on the <Attribute> element, exactly as the service provider expects it.',
  },
  {
    id: 'friendlyName',
    label: 'Friendly name',
    placeholder: 'email',
    hint: 'Optional human-readable alias carried alongside the attribute name.',
  },
  {
    id: 'nameFormat',
    label: 'SAML attribute NameFormat',
    control: 'select',
    options: SAML_NAME_FORMATS,
    required: true,
    span: 2,
  },
]

/**
 * SAML mapper types.
 *
 * Eleven, in the order the picker offers them. A SAML mapper carries no token
 * placement at all — there is one assertion and everything released goes into
 * it — so nothing here has an "add to" switch. Audience and Audience Resolve
 * are the exceptions to the attribute shape: they name who the assertion is
 * for rather than releasing a value, so they carry no SAML attribute name.
 */
export const SAML_MAPPERS = [
  {
    id: 'saml-audience',
    label: 'Audience',
    icon: 'shield',
    sub: 'Name a service provider the assertion is intended for.',
    detail: 'A relying party that does not find itself in the audience rejects the assertion, which is what stops one provider replaying it at another.',
    fields: [
      { id: 'includedClientAudience', label: 'Included client audience', control: 'select', options: ssoClientOptions, required: true, placeholder: 'Select a client' },
      { id: 'includedCustomAudience', label: 'Included custom audience', mono: true, placeholder: 'Enter Custom Audience', hint: 'Used when the recipient is not registered here.' },
    ],
  },
  {
    id: 'saml-audience-resolve',
    label: 'Audience Resolve',
    icon: 'swap',
    sub: 'Derive the audience from the clients the identity may reach.',
    detail: 'Nothing is configured: the audience is resolved at sign-in from the roles the identity holds on each registered client.',
    fields: [],
  },
  {
    id: 'saml-group-list',
    label: 'Group List',
    icon: 'group',
    sub: 'Release the groups the identity belongs to.',
    detail: 'Service providers that derive their own roles from group names read this attribute.',
    fields: [
      { id: 'groupAttributeName', label: 'Group attribute name', required: true, mono: true, placeholder: 'groups' },
      { id: 'nameFormat', label: 'SAML attribute NameFormat', control: 'select', options: SAML_NAME_FORMATS, required: true },
      { id: 'singleAttribute', label: 'Single group attribute', control: 'switch', hint: 'On, every group is written into one multi-valued attribute. Off, each group gets its own.' },
      { id: 'fullPath', label: 'Full group path', control: 'switch', hint: 'Release the whole path rather than the leaf group name.' },
    ],
  },
  {
    id: 'saml-hardcoded',
    label: 'Hardcoded Attribute',
    icon: 'lock',
    sub: 'Release one fixed value to every identity.',
    detail: 'Typically a tenant identifier or an environment marker the service provider keys on.',
    fields: [
      { id: 'samlAttributeName', label: 'SAML attribute name', required: true, mono: true, placeholder: 'tenant' },
      { id: 'nameFormat', label: 'SAML attribute NameFormat', control: 'select', options: SAML_NAME_FORMATS, required: true },
      { id: 'staticValue', label: 'Attribute value', required: true, mono: true, span: 2, placeholder: 'tanflow-production' },
    ],
  },
  {
    id: 'saml-hardcoded-role',
    label: 'Hardcoded Role',
    icon: 'roles',
    sub: 'Grant one fixed role to every identity that signs in here.',
    detail: 'The role is asserted whether or not the identity holds it in the platform, so it is a grant made by the mapper rather than a release of one that exists.',
    fields: [
      { id: 'role', label: 'Role', control: 'select', options: applicationGroupOptions, required: true, span: 2, placeholder: 'Select a role' },
    ],
  },
  {
    id: 'saml-role-list',
    label: 'Role list',
    icon: 'roles',
    sub: 'Release the platform roles held by the identity.',
    detail: 'Every role the identity holds, written into the named attribute.',
    fields: [
      { id: 'roleAttributeName', label: 'Role attribute name', required: true, mono: true, placeholder: 'Role' },
      { id: 'nameFormat', label: 'SAML attribute NameFormat', control: 'select', options: SAML_NAME_FORMATS, required: true },
      { id: 'singleAttribute', label: 'Single role attribute', control: 'switch', span: 2, hint: 'On, every role is written into one multi-valued attribute.' },
    ],
  },
  {
    id: 'saml-role-name-mapper',
    label: 'Role Name Mapper',
    icon: 'swap',
    sub: 'Rename a role on its way into the assertion.',
    detail: 'The platform keeps its own name for the role; the service provider is told the name it expects.',
    fields: [
      { id: 'role', label: 'Role', control: 'select', options: applicationGroupOptions, required: true, placeholder: 'Select a role' },
      { id: 'newRoleName', label: 'New role name', required: true, mono: true, placeholder: 'Enter new role name' },
    ],
  },
  {
    id: 'saml-user-attribute',
    label: 'User Attribute',
    icon: 'user',
    sub: 'Release a stored attribute of the identity.',
    detail: 'Read from the identity record at every sign-in, so the assertion always carries the value as it stands now.',
    fields: [
      { id: 'userAttribute', label: 'User attribute', control: 'select', options: IDAM_ATTRS, required: true },
      { id: 'samlAttributeName', label: 'SAML attribute name', required: true, mono: true, placeholder: 'urn:oid:0.9.2342.19200300.100.1.3' },
      { id: 'nameFormat', label: 'SAML attribute NameFormat', control: 'select', options: SAML_NAME_FORMATS, required: true },
      { id: 'aggregateAttributes', label: 'Aggregate attribute values', control: 'switch', hint: 'Combine values found on the identity and on its groups into one attribute.' },
    ],
  },
  {
    id: 'saml-nameid',
    label: 'User Attribute Mapper For NameID',
    icon: 'at',
    sub: 'Set the assertion subject from an identity attribute.',
    detail: 'The NameID is the subject of the assertion — the value the service provider resolves the account on.',
    fields: [
      { id: 'nameIdFormat', label: 'Name ID format', control: 'select', options: NAME_ID_FORMATS, required: true, span: 2, mono: true },
      { id: 'userAttribute', label: 'User attribute', required: true, mono: true, span: 2, placeholder: 'email' },
    ],
  },
  {
    id: 'saml-user-property',
    label: 'User Property',
    icon: 'tag',
    sub: 'Release a property named in the central attribute register.',
    detail: 'The register decides what a property is called, so a name defined once is the name every service provider is offered.',
    fields: [
      { id: 'userProperty', label: 'Property', control: 'select', options: centralProperties, required: true, placeholder: 'Select a property' },
      { id: 'samlAttributeName', label: 'SAML attribute name', required: true, mono: true, placeholder: 'urn:oid:0.9.2342.19200300.100.1.1' },
      { id: 'nameFormat', label: 'SAML attribute NameFormat', control: 'select', options: SAML_NAME_FORMATS, span: 2 },
    ],
  },
  {
    id: 'saml-session-note',
    label: 'User Session Note',
    icon: 'clock',
    sub: 'Release a note recorded on the authenticated session.',
    detail: 'Session notes describe the sign-in itself — the client it came from, the method used — rather than the identity.',
    fields: [
      { id: 'sessionNote', label: 'User session note attribute', required: true, mono: true, placeholder: 'clientAddress' },
      { id: 'samlAttributeName', label: 'SAML attribute name', required: true, mono: true, placeholder: 'sessionClient' },
      { id: 'nameFormat', label: 'SAML attribute NameFormat', control: 'select', options: SAML_NAME_FORMATS, span: 2 },
    ],
  },
]

// ---------------------------------------------------------------------------
// OIDC / OAuth mapper types
//
// An OIDC mapper writes a claim into one or more tokens, so all of them carry
// the claim name, its JSON type and the three token switches. Nothing here
// mentions a NameFormat or a friendly name — those belong to SAML.
// ---------------------------------------------------------------------------

/**
 * Where a claim is written.
 *
 * The reference implementation spells these six inconsistently — "Add to ID
 * Token" beside "Add to ID token", "Add to Userinfo" beside "Add to UserInfo" —
 * and a switch whose label changes between two screens reads as two different
 * switches. They are declared once, in one casing, and every mapper that offers
 * a placement takes it from here.
 */
const PLACEMENT = {
  idToken: { id: 'addToIdToken', label: 'Add to ID token', control: 'switch' },
  accessToken: { id: 'addToAccessToken', label: 'Add to access token', control: 'switch' },
  lightweightToken: { id: 'addToLightweightToken', label: 'Add to lightweight token', control: 'switch' },
  userInfo: { id: 'addToUserInfo', label: 'Add to userinfo', control: 'switch' },
  introspection: { id: 'addToIntrospection', label: 'Add to token introspection', control: 'switch' },
  tokenResponse: { id: 'addToTokenResponse', label: 'Add to token response', control: 'switch' },
}

const places = (...keys) => keys.map((k) => ({ ...PLACEMENT[k], default: k === 'idToken' || k === 'accessToken' }))

/** The claim a mapper writes: its name and its JSON type. */
const claimName = (required = true) => ({
  id: 'tokenClaimName',
  label: 'Token claim name',
  required,
  mono: true,
  placeholder: 'email',
  hint: 'Dotted names nest the claim, e.g. address.street writes street inside address.',
})

const claimType = (required = false) => ({
  id: 'claimType', label: 'Claim JSON type', control: 'select', options: CLAIM_TYPES, required, default: 'String',
})

/**
 * OIDC / OAuth mapper types.
 *
 * Nineteen, in the order the picker offers them. Several carry no configuration
 * of their own — what they write is fixed by the protocol and the only decision
 * is which tokens it lands in.
 */
export const OIDC_MAPPERS = [
  {
    id: 'oidc-allowed-web-origins',
    label: 'Allowed Web Origins',
    icon: 'globe',
    sub: 'Write the client’s permitted browser origins into the token.',
    detail: 'Resolved from the Valid URI settings on the application, so there is nothing to configure here.',
    fields: places('accessToken', 'introspection', 'lightweightToken'),
  },
  {
    id: 'oidc-audience',
    label: 'Audience',
    icon: 'shield',
    sub: 'Add an audience to the token.',
    detail: 'A resource server rejects a token that does not name it in the audience, so this is what lets one client call another.',
    fields: [
      { id: 'includedClientAudience', label: 'Included client audience', control: 'select', options: ssoClientOptions, required: true, placeholder: 'Select a client' },
      { id: 'includedCustomAudience', label: 'Included custom audience', mono: true, placeholder: 'Enter Custom Audience', hint: 'Used when the resource server is not registered here.' },
      ...places('accessToken', 'idToken', 'introspection', 'lightweightToken'),
    ],
  },
  {
    id: 'oidc-audience-resolve',
    label: 'Audience Resolve',
    icon: 'swap',
    sub: 'Derive the audience from the clients the identity may reach.',
    detail: 'The audience is resolved when the token is minted, from the roles the identity holds on each registered client.',
    fields: places('accessToken', 'introspection', 'lightweightToken'),
  },
  {
    id: 'oidc-acr',
    label: 'Authentication Context Class Reference (ACR)',
    icon: 'shield',
    sub: 'Write the assurance level the sign-in reached.',
    detail: 'A relying party that requires step-up authentication reads this claim to decide whether the session already satisfies it.',
    fields: places('idToken', 'accessToken', 'lightweightToken', 'introspection'),
  },
  {
    id: 'oidc-amr',
    label: 'Authentication Method Reference (AMR)',
    icon: 'key',
    sub: 'Write which methods the identity actually authenticated with.',
    detail: 'Password, one-time code, passkey — the list of what was used, not what was required.',
    fields: places('idToken', 'accessToken', 'lightweightToken'),
  },
  {
    id: 'oidc-claims-parameter-token',
    label: 'Claims Parameter Token',
    icon: 'file',
    sub: 'Honour claims the client asked for in the request.',
    detail: 'The client names the claims it wants in the authorization request; this mapper decides whether that request is acted on.',
    fields: places('idToken', 'userInfo'),
  },
  {
    id: 'oidc-claims-parameter-id-token',
    label: 'Claims Parameter with value ID Token',
    icon: 'file',
    sub: 'Honour one requested claim, by name.',
    detail: 'Narrower than the parameter token mapper: only the named claim is honoured from the request.',
    fields: [
      { id: 'claimName', label: 'Claim name', required: true, mono: true, span: 2, placeholder: 'Enter Claim Name' },
      { ...PLACEMENT.idToken, default: true },
    ],
  },
  {
    id: 'oidc-full-name',
    label: 'Full Name',
    icon: 'user',
    sub: 'Write the identity’s full name into the standard name claim.',
    detail: 'Composed from the given and family names on the identity record.',
    fields: places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
  },
  {
    id: 'oidc-group-membership',
    label: 'Group Membership',
    icon: 'group',
    sub: 'Write the identity’s group memberships into the token.',
    detail: 'Relying parties that map their own authorization from group names read this claim.',
    fields: [
      claimName(),
      { id: 'fullPath', label: 'Full group path', control: 'switch', hint: 'Write the whole path rather than the leaf group name.' },
      ...places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
    ],
  },
  {
    id: 'oidc-hardcoded',
    label: 'Hardcoded Claim',
    icon: 'lock',
    sub: 'Write one fixed value into every token.',
    detail: 'Typically a tenant identifier or an environment marker the relying party keys on.',
    fields: [
      claimName(),
      { id: 'staticValue', label: 'Claim value', required: true, mono: true, placeholder: 'Enter claim value' },
      claimType(true),
      ...places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'tokenResponse', 'introspection'),
    ],
  },
  {
    id: 'oidc-hardcoded-role',
    label: 'Hardcoded Role',
    icon: 'roles',
    sub: 'Grant one fixed role to every identity that signs in here.',
    detail: 'The role is written into the token whether or not the identity holds it in the platform.',
    fields: [
      { id: 'role', label: 'Role', control: 'select', options: applicationGroupOptions, required: true, span: 2, placeholder: 'Select a role' },
    ],
  },
  {
    id: 'oidc-role-name-mapper',
    label: 'Role Name Mapper',
    icon: 'swap',
    sub: 'Rename a role on its way into the token.',
    detail: 'The platform keeps its own name for the role; the client is told the name it expects.',
    fields: [
      { id: 'role', label: 'Role', control: 'select', options: applicationGroupOptions, required: true, placeholder: 'Select a role' },
      { id: 'newRoleName', label: 'New role name', required: true, mono: true, placeholder: 'Enter new role name' },
    ],
  },
  {
    id: 'oidc-session-state',
    label: 'Session State',
    icon: 'clock',
    sub: 'Write the session identifier the client can poll for changes.',
    detail: 'Session management at the relying party is built on this claim.',
    fields: places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
  },
  {
    id: 'oidc-user-address',
    label: 'User Address',
    icon: 'mapPin',
    sub: 'Write the standard OIDC address claim.',
    detail: 'The address claim is a nested object with six members, and each one names the identity attribute it is read from.',
    fields: [
      { id: 'streetAttribute', label: 'Street user attribute', required: true, mono: true, placeholder: 'Enter Street' },
      { id: 'localityAttribute', label: 'Locality user attribute', required: true, mono: true, placeholder: 'Enter Locality' },
      { id: 'regionAttribute', label: 'Region user attribute', required: true, mono: true, placeholder: 'Enter Region' },
      { id: 'postalCodeAttribute', label: 'Postal code user attribute', required: true, mono: true, placeholder: 'Enter Postal Code' },
      { id: 'countryAttribute', label: 'Country user attribute', required: true, mono: true, placeholder: 'Enter Country' },
      { id: 'formattedAttribute', label: 'Address user attribute', required: true, mono: true, placeholder: 'Enter Formatted Address' },
      ...places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
    ],
  },
  {
    id: 'oidc-user-attribute',
    label: 'User Attribute',
    icon: 'user',
    sub: 'Write a stored attribute of the identity into the token.',
    detail: 'Read from the identity record when the token is minted, so a refreshed token carries the current value.',
    fields: [
      { id: 'userAttribute', label: 'User attribute', control: 'select', options: IDAM_ATTRS, required: true, placeholder: '-- Select an attribute --' },
      claimName(),
      claimType(true),
      { id: 'multivalued', label: 'Multivalued', control: 'switch', hint: 'Write the claim as a JSON array rather than a single value.' },
      { id: 'aggregateAttributes', label: 'Aggregate attribute values', control: 'switch', hint: 'Combine values found on the identity and on its groups.' },
      ...places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
    ],
  },
  {
    id: 'oidc-client-role',
    label: 'User Client Role',
    icon: 'key',
    sub: 'Write the roles held on one client into the token.',
    detail: 'Scoped to a single client, so an unrelated grant never reaches this application.',
    fields: [
      { id: 'clientId', label: 'Client ID', control: 'select', options: ssoClientOptions, required: true, placeholder: 'Select a client' },
      { id: 'rolePrefix', label: 'Client role prefix', required: true, mono: true, placeholder: 'ROLE_' },
      claimName(),
      claimType(),
      { id: 'multivalued', label: 'Multivalued', control: 'switch', default: true },
      ...places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
    ],
  },
  {
    id: 'oidc-user-property',
    label: 'User Property',
    icon: 'tag',
    sub: 'Write a named property of the account into the token.',
    detail: 'Properties are fields of the account itself — username, email, enabled — rather than configurable attributes.',
    fields: [
      { id: 'userProperty', label: 'Property', required: true, mono: true, placeholder: 'Enter Property' },
      claimName(),
      claimType(true),
      ...places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
    ],
  },
  {
    id: 'oidc-realm-role',
    label: 'User Realm Role',
    icon: 'roles',
    sub: 'Write the platform roles held by the identity into the token.',
    detail: 'Every role the identity holds across the tenant, not only those granted on this client.',
    fields: [
      { id: 'rolePrefix', label: 'Realm role prefix', required: true, mono: true, placeholder: 'Enter Prefix' },
      claimName(),
      claimType(),
      { id: 'multivalued', label: 'Multivalued', control: 'switch', default: true },
      ...places('idToken', 'accessToken', 'lightweightToken', 'userInfo', 'introspection'),
    ],
  },
  {
    id: 'oidc-session-note',
    label: 'User Session Note',
    icon: 'clock',
    sub: 'Write a note recorded on the authenticated session into the token.',
    detail: 'Session notes describe the sign-in itself rather than the identity.',
    fields: [
      { id: 'sessionNote', label: 'User session note', required: true, mono: true, placeholder: 'Enter User Session Note' },
      claimName(),
      claimType(),
      ...places('accessToken', 'idToken', 'lightweightToken', 'userInfo', 'tokenResponse', 'introspection'),
    ],
  },
]

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const MAPPERS_FOR = (protocol) => (familyOf(protocol) === 'SAML' ? SAML_MAPPERS : OIDC_MAPPERS)

const ALL_MAPPERS = [...SAML_MAPPERS, ...OIDC_MAPPERS]

const MAPPER_BY_ID = Object.fromEntries(ALL_MAPPERS.map((m) => [m.id, m]))

/** Looked up by id alone: an id is unique across both families by construction,
 *  so a row read back always resolves to the mapper it was written with. */
export const mapperType = (id) => MAPPER_BY_ID[id] || null

export const mapperLabel = (id) => (MAPPER_BY_ID[id] ? MAPPER_BY_ID[id].label : '—')

export const mapperIcon = (id) => (MAPPER_BY_ID[id] ? MAPPER_BY_ID[id].icon : 'swap')

/** What a row releases, as one line in a register. SAML names an attribute,
 *  OIDC names a claim, so the two are read differently. */
export const releasedName = (row) => {
  if (!row) return '—'
  // The NameID mapper sets the assertion subject rather than adding a named
  // attribute, so it is read back as the subject it produces.
  if (row.mapperType === 'saml-nameid') return `NameID · ${row.nameIdFormat || 'unspecified'}`
  return row.samlAttributeName || row.tokenClaimName || '—'
}

/** Where the value comes from, as one line in a register. */
export const sourceSummary = (row) => {
  if (!row) return '—'
  const t = mapperType(row.mapperType)
  if (!t) return '—'
  if (row.userAttribute) return row.userAttribute
  if (row.userProperty) return row.userProperty
  if (row.sessionNote) return row.sessionNote
  if (row.staticValue) return row.staticValue
  if (row.role) return row.newRoleName ? `${row.role} → ${row.newRoleName}` : row.role
  if (row.claimName) return row.claimName
  if (row.formattedAttribute) return `address from ${row.formattedAttribute}`
  if (row.includedClientAudience || row.includedCustomAudience) return row.includedClientAudience || row.includedCustomAudience
  if (row.clientId) return `roles on ${row.clientId}`
  if (t.id.includes('group')) return 'every group'
  if (t.id.includes('realm-role')) return 'every platform role'
  // Several mappers write a value the protocol fixes — the session state, the
  // authentication method, the allowed origins — so what they release is the
  // mapper itself rather than a source that could be named here.
  return t.fields.length === 0 || t.fields.every((f) => f.control === 'switch') ? t.label : '—'
}

/** Which tokens an OIDC mapper writes into, as a short label. */
export const tokenTargets = (row) => {
  const on = []
  if (row.addToIdToken) on.push('ID')
  if (row.addToAccessToken) on.push('Access')
  if (row.addToLightweightToken) on.push('Lightweight')
  if (row.addToUserInfo) on.push('Userinfo')
  if (row.addToIntrospection) on.push('Introspection')
  if (row.addToTokenResponse) on.push('Token response')
  return on.length ? on.join(' · ') : 'None'
}

// A blank row for a mapper type, with switch defaults already applied so an
// unsaved draft and a saved row read the same way.
export const blankAttribute = (id = '') => {
  const base = { mapperType: id, name: '', required: false }
  const t = mapperType(id)
  if (t) {
    t.fields.forEach((f) => {
      if (f.default !== undefined) base[f.id] = f.default
      else if (f.control === 'switch') base[f.id] = false
      else base[f.id] = ''
    })
  }
  return base
}

// Switching mapper type keeps the name and resets everything else: a SAML
// NameFormat has no meaning on an OIDC claim, and a half-filled directory
// lookup cannot survive onto a hardcoded value.
export const withMapperType = (draft, id) => ({
  ...blankAttribute(id),
  name: draft.name,
  required: draft.required,
  description: draft.description,
  scope: draft.scope,
  id: draft.id,
})

export const attributeIssues = (draft) => {
  const out = []
  if (!draft.mapperType) out.push('Choose a mapper type before configuring the attribute.')
  if (!String(draft.name || '').trim()) out.push('A mapper name is required.')
  const t = mapperType(draft.mapperType)
  if (t) {
    t.fields.forEach((f) => {
      if (f.control === 'switch') return
      if (f.required && !String(draft[f.id] == null ? '' : draft[f.id]).trim()) out.push(`${f.label} is required.`)
    })
  }
  return out
}

export const attributeReady = (draft) => !!draft && attributeIssues(draft).length === 0
