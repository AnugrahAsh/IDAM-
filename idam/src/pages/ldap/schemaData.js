// ---------------------------------------------------------------------------
// Directory schema
//
// The object classes and attribute types the directory publishes under
// cn=schema,cn=config. Standard definitions are the ones every OpenLDAP install
// carries; custom ones are what this tenant added on top, and are the only
// definitions an operator may delete.
// ---------------------------------------------------------------------------

export const SCHEMA_TARGETS = [
  { value: 'cn={0}core,cn=schema,cn=config', label: '{0}core' },
  { value: 'cn={1}cosine,cn=schema,cn=config', label: '{1}cosine' },
  { value: 'cn={2}inetorgperson,cn=schema,cn=config', label: '{2}inetorgperson' },
  { value: 'cn={3}dyngroup,cn=schema,cn=config', label: '{3}dyngroup' },
  { value: 'cn={4}nis,cn=schema,cn=config', label: '{4}nis' },
  { value: 'cn={5}myapp,cn=schema,cn=config', label: '{5}myapp · tenant schema' },
]

export const SYNTAXES = [
  { value: '1.3.6.1.4.1.1466.115.121.1.15', label: 'Directory String' },
  { value: '1.3.6.1.4.1.1466.115.121.1.27', label: 'Integer' },
  { value: '1.3.6.1.4.1.1466.115.121.1.7', label: 'Boolean' },
  { value: '1.3.6.1.4.1.1466.115.121.1.26', label: 'IA5 String' },
  { value: '1.3.6.1.4.1.1466.115.121.1.12', label: 'Distinguished name' },
  { value: '1.3.6.1.4.1.1466.115.121.1.24', label: 'Generalized time' },
]

export const EQUALITIES = [
  'caseIgnoreMatch', 'caseExactMatch', 'caseIgnoreIA5Match', 'integerMatch',
  'distinguishedNameMatch', 'generalizedTimeMatch', 'booleanMatch',
]

export const SUBSTRINGS = ['caseIgnoreSubstringsMatch', 'caseExactSubstringsMatch', 'caseIgnoreIA5SubstringsMatch', '']
export const CLASS_TYPES = ['STRUCTURAL', 'AUXILIARY', 'ABSTRACT']
export const USAGES = ['userApplications', 'directoryOperation', 'distributedOperation', 'dSAOperation']

export const syntaxLabel = (oid) => (SYNTAXES.find((s) => s.value === oid) || {}).label || oid

const std = (name, syntax, equality, single, oid, description) => ({
  name, syntax, equality, single, oid, description, custom: false,
})

export const BASE_ATTRIBUTES = [
  std('cn', SYNTAXES[0].value, 'caseIgnoreMatch', false, '2.5.4.3', 'Common name of the entry.'),
  std('sn', SYNTAXES[0].value, 'caseIgnoreMatch', false, '2.5.4.4', 'Surname.'),
  std('uid', SYNTAXES[3].value, 'caseIgnoreIA5Match', false, '0.9.2342.19200300.100.1.1', 'User identifier used to bind.'),
  std('mail', SYNTAXES[3].value, 'caseIgnoreIA5Match', false, '0.9.2342.19200300.100.1.3', 'RFC822 mailbox.'),
  std('ou', SYNTAXES[0].value, 'caseIgnoreMatch', false, '2.5.4.11', 'Organizational unit name.'),
  std('description', SYNTAXES[0].value, 'caseIgnoreMatch', false, '2.5.4.13', 'Free-text description of the entry.'),
  std('telephoneNumber', SYNTAXES[0].value, 'caseIgnoreMatch', false, '2.5.4.20', 'Telephone number.'),
  std('member', SYNTAXES[4].value, 'distinguishedNameMatch', false, '2.5.4.31', 'Distinguished names held by a group.'),
  std('gidNumber', SYNTAXES[1].value, 'integerMatch', true, '1.3.6.1.1.1.1.1', 'POSIX group identifier.'),
  std('homeDirectory', SYNTAXES[3].value, 'caseExactIA5Match', true, '1.3.6.1.1.1.1.3', 'POSIX home directory.'),
  std('createTimestamp', SYNTAXES[5].value, 'generalizedTimeMatch', true, '2.5.18.1', 'When the entry was created.'),
  std('modifyTimestamp', SYNTAXES[5].value, 'generalizedTimeMatch', true, '2.5.18.2', 'When the entry was last written.'),
]

export const CUSTOM_ATTRIBUTES = [
  { name: 'city', syntax: SYNTAXES[0].value, equality: 'caseIgnoreMatch', single: true, oid: '1.3.6.1.4.1.99999.1.1', description: 'City the identity works from.', custom: true },
  { name: 'location', syntax: SYNTAXES[0].value, equality: 'caseIgnoreMatch', single: true, oid: '1.3.6.1.4.1.99999.1.2', description: 'Site or building.', custom: true },
  { name: 'PAM360', syntax: SYNTAXES[2].value, equality: 'booleanMatch', single: true, oid: '1.3.6.1.4.1.99999.1.3', description: 'Whether the identity is vaulted in PAM360.', custom: true },
  { name: 'PhoneNumber', syntax: SYNTAXES[0].value, equality: 'caseIgnoreMatch', single: true, oid: '1.3.6.1.4.1.99999.1.4', description: 'Contact number held on the directory record.', custom: true },
  { name: 'reEmployeeRole', syntax: SYNTAXES[0].value, equality: 'caseIgnoreMatch', single: false, oid: '1.3.6.1.4.1.99999.1.5', description: 'Role codes released to downstream applications.', custom: true },
  { name: 'rerolecustomer', syntax: SYNTAXES[0].value, equality: 'caseIgnoreMatch', single: false, oid: '1.3.6.1.4.1.99999.1.6', description: 'Customer role mapping used by the provisioning engine.', custom: true },
]

export const BASE_CLASSES = [
  {
    name: 'top', type: 'ABSTRACT', oid: '2.5.6.0', superior: '—', custom: false,
    description: 'The root of the object class hierarchy.', must: ['objectClass'], may: [],
  },
  {
    name: 'person', type: 'STRUCTURAL', oid: '2.5.6.6', superior: 'top', custom: false,
    description: 'A person held in the directory.', must: ['cn', 'sn'], may: ['description', 'telephoneNumber'],
  },
  {
    name: 'organizationalPerson', type: 'STRUCTURAL', oid: '2.5.6.7', superior: 'person', custom: false,
    description: 'A person within an organization.', must: [], may: ['ou', 'telephoneNumber'],
  },
  {
    name: 'inetOrgPerson', type: 'STRUCTURAL', oid: '2.16.840.1.113730.3.2.2', superior: 'organizationalPerson', custom: false,
    description: 'Internet organizational person — the class most user entries use.',
    must: [], may: ['uid', 'mail', 'homeDirectory', 'description'],
  },
  {
    name: 'organizationalUnit', type: 'STRUCTURAL', oid: '2.5.6.5', superior: 'top', custom: false,
    description: 'A container that groups entries beneath it.', must: ['ou'], may: ['description'],
  },
  {
    name: 'groupOfNames', type: 'STRUCTURAL', oid: '2.5.6.9', superior: 'top', custom: false,
    description: 'A group holding member distinguished names.', must: ['cn', 'member'], may: ['description'],
  },
]

export const CUSTOM_CLASSES = [
  {
    name: 'myAppPerson', type: 'STRUCTURAL', oid: '1.3.6.1.4.1.99999.2.10', superior: 'inetOrgPerson', custom: true,
    description: 'Tenant extension carrying the attributes this platform writes.',
    must: [],
    may: ['city', 'location', 'PAM360', 'PhoneNumber', 'reEmployeeRole', 'rerolecustomer'],
  },
]

export const initialSchema = () => ({
  classes: [...CUSTOM_CLASSES, ...BASE_CLASSES],
  attributes: [...CUSTOM_ATTRIBUTES, ...BASE_ATTRIBUTES],
})

// An LDIF rendering of the schema, which is what the directory would hand back
// on an export.
export const schemaLdif = (schema) => [
  '# Tanflow IDAM — schema export',
  'dn: cn=schema,cn=config',
  '',
  ...schema.attributes.map((a) => [
    `attributetype ( ${a.oid}`,
    `  NAME '${a.name}'`,
    a.description ? `  DESC '${a.description}'` : null,
    a.equality ? `  EQUALITY ${a.equality}` : null,
    `  SYNTAX ${a.syntax}`,
    a.single ? '  SINGLE-VALUE )' : ' )',
    '',
  ].filter(Boolean).join('\n')),
  ...schema.classes.map((c) => [
    `objectclass ( ${c.oid}`,
    `  NAME '${c.name}'`,
    c.description ? `  DESC '${c.description}'` : null,
    c.superior !== '—' ? `  SUP ${c.superior}` : null,
    `  ${c.type}`,
    c.must.length ? `  MUST ( ${c.must.join(' $ ')} )` : null,
    c.may.length ? `  MAY ( ${c.may.join(' $ ')} )` : null,
    ' )',
    '',
  ].filter(Boolean).join('\n')),
].join('\n')
