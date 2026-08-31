/**
 * The permission register.
 *
 * A role is only as expressive as the permissions it can name. The console
 * previously offered a generic five-verb CRUD set per module, which collapsed
 * every distinct capability into `Edit` — an operator who should hold only
 * `MFA Email Test` had to be granted write on the whole MFA module.
 *
 * This register restores per-feature granularity: 43 modules, 400+ named
 * permissions, each mapping to exactly one reachable control in the product.
 * Module names follow the platform's own vocabulary so an existing role
 * definition imports without unresolved permissions; `legacy` carries the
 * names this console used before, so roles authored against those still
 * resolve.
 */

const CRUD = (thing, plural) => [
  `Add ${thing}`,
  `Modify ${thing}`,
  `Delete ${thing}`,
  `View ${thing} Details`,
  `View ${plural} List`,
]

export const PERMISSION_MODULES = [
  {
    name: 'Access Application Groups',
    legacy: [],
    desc: 'Groups that grant console and gateway access on a provisioning target.',
    perms: [
      ...CRUD('Access Application Group', 'Access Application Groups'),
      'Add Users', 'Add Bulk Users', 'Remove Users', 'Remove Bulk Users', 'Remove All Users',
      'Export Users', 'View Logs', 'Change Status',
    ],
  },
  {
    name: 'Application Groups',
    legacy: ['Access Groups'],
    desc: 'Entitlement groups provisioned onto a connected application.',
    perms: [
      ...CRUD('Application Group', 'Application Groups'),
      'Delete Bulk Application Groups', 'Import Application Groups', 'Export Application Groups',
      'Set Primary',
      'Add Users', 'Add Bulk Users', 'Remove Users', 'Remove Bulk Users', 'Remove All Users',
      'Export Users', 'View Logs', 'Change Status',
    ],
  },
  {
    name: 'Application Linkage',
    desc: 'The join between an SSO application and its provisioning application.',
    perms: ['Add Application Linkage', 'Delete Application Linkage', 'View Application Linkage List', 'Sync User'],
  },
  {
    name: 'Approval',
    legacy: ['Approvals'],
    desc: 'Decisions on requests waiting in the approval queue.',
    perms: [
      'Approve Access Request', 'Reject Access Request',
      'Approve Group Request', 'Reject Group Request',
      'Approve Role Request', 'Reject Role Request',
      'Approve Application Request', 'Reject Application Request',
      'Approve Other Request', 'Reject Other Request',
      'Add Approver Remarks', 'View Approval Details', 'View Approvals List', 'Export Approval',
    ],
  },
  {
    name: 'Configurations',
    desc: 'The identity schema itself — attributes, sections, lookups and generation rules.',
    perms: [
      ...CRUD('Attribute', 'Attributes'),
      ...CRUD('Lookup', 'Lookups'),
      ...CRUD('Multi-Level Lookup', 'Multi-Level Lookups'),
      ...CRUD('Section', 'Sections'),
      'Add Smart Populate', 'Modify Smart Populate', 'Delete Smart Populate', 'View Smart Populate List',
      'Email Creation Configuration', 'Username Creation Configuration', 'Employee Type Configuration',
    ],
  },
  {
    name: 'Consent Management',
    desc: 'Issuing consents, versioning their text and reading what was accepted.',
    perms: [
      ...CRUD('Consent', 'Consents'),
      'Initiate Consent', 'Bulk Initiate Consent', 'Map Consent to Users', 'Remove Consent from Users',
      'Add Consent Version', 'Publish Consent Version', 'View Consent Version Details',
      'Add Consent Language', 'Change Consent Status', 'Consent Attribute Configuration',
      'Add Consent Policy', 'Modify Consent Policy', 'Delete Consent Policy', 'View Consent Policies List',
      'View Consent Records List', 'View Consent Record Details',
      'Export Consent Records', 'Export Specific Consent Record',
    ],
  },
  {
    name: 'Consent Template',
    desc: 'The reusable bodies a consent is authored from.',
    perms: ['Add Consent Template', 'View Consent Templates List'],
  },
  {
    name: 'Dynamic Policy',
    desc: 'Condition-driven automatic assignment of a group to matching identities.',
    perms: [
      ...CRUD('Dynamic Policy', 'Dynamic Policies'),
      'Change Status', 'Import Dynamic Policy', 'Sync User', 'View SyncUser',
    ],
  },
  {
    name: 'Email Management',
    desc: 'SMTP configuration, templates and the outbound mail queue.',
    perms: [
      'Add Email Template', 'Modify Email Template', 'Delete Email Template', 'View Email Templates List',
      'Enable/Disable Email Template', 'Email Configuration', 'Test Email Configuration',
      'Send Email', 'View Email Outbox',
    ],
  },
  {
    name: 'IP Restriction Policy',
    legacy: ['Network Restrictions'],
    desc: 'Network ranges an identity or application is allowed to authenticate from.',
    perms: [
      'Add IP Restriction Policy', 'Modify IP Restriction Policy', 'Delete IP Restriction Policy',
      'Bulk Delete IP Restriction Policies', 'Bulk Modify IP Restriction Policies',
      'Change Status', 'Import IP Restriction Policies', 'Export IP Restriction Policies',
      'View IP Restriction Policies List',
    ],
  },
  {
    name: 'Jobs Management',
    legacy: ['Jobs'],
    desc: 'The asynchronous work queue and its per-job evidence.',
    perms: ['Close Job', 'Remove Job', 'View and Download Job Details', 'View Jobs List'],
  },
  {
    name: 'LDAP Applications',
    legacy: ['LDAP Directories'],
    desc: 'Directory connections the platform binds to and reads.',
    perms: [
      ...CRUD('LDAP Application', 'LDAP Applications'),
      'Add Configuration', 'Modify Configuration', 'Delete Configuration',
      'Test Connection', 'Test Authentication',
      'Sync LDAP Application Users', 'View LDAP Application Dashboard',
      'View LDAP Application Users', 'Export LDAP Application Users',
    ],
  },
  {
    name: 'LDAP Configuration',
    desc: 'The objectClass attribute definitions a directory is read through.',
    perms: ['Add LDAP Attribute', 'Delete LDAP Attribute', 'View LDAP Configuration'],
  },
  { name: 'License', desc: 'Entitlement and expiry of the platform licence.', perms: ['View License Details'] },
  {
    name: 'Logging',
    desc: 'What the platform captures and where it ships it.',
    perms: ['Configure Access Approval Logs', 'View System Logs'],
  },
  {
    name: 'Multi-Factor Authentication',
    desc: 'The second-factor methods available to identities.',
    perms: ['Configure MFA', 'Configure MFA Email', 'MFA Email Test', 'Delete MFA', 'Set Primary MFA', 'View All MFA List'],
  },
  { name: 'My Apps', desc: 'The self-service application catalog.', perms: ['View My Apps List'] },
  { name: 'My profile', legacy: ['My Profile'], desc: 'The signed-in identity’s own record.', perms: ['My profile', 'Change Password', 'Give Consent'] },
  { name: 'Notifications', desc: 'Announcements delivered to the signed-in identity.', perms: ['View User Notifications List'] },
  {
    name: 'Notifications Management',
    desc: 'Authoring the announcements every identity sees.',
    perms: [...CRUD('Notification', 'Notifications'), 'Change Status'],
  },
  {
    name: 'Organizational Hierarchy',
    legacy: ['Org Hierarchy'],
    desc: 'The reporting tree and the lookup it is built from.',
    perms: ['Configure', 'Modify Configuration', 'Delete Configuration', 'View Hierarchy', 'View User', 'Export User'],
  },
  { name: 'Organizations', desc: 'Tenant organizations and their inheritance.', perms: CRUD('Organization', 'Organizations') },
  {
    name: 'Orphaned Accounts',
    desc: 'Detection rules for target accounts with no matching identity.',
    perms: ['Add Orphaned Rule', 'Modify Orphaned Rule', 'Delete Orphaned Rule', 'View Details', 'View Rules'],
  },
  { name: 'Password Dictionary', desc: 'The banned-substring register credentials are checked against.', perms: ['Configure Password Dictionary'] },
  {
    name: 'Password Policy',
    desc: 'Credential rule sets and the scopes they govern.',
    perms: [
      ...CRUD('Password Policy', 'Password Policies'),
      'Add Password Policy Mapping', 'Create Policy Mapping', 'Modify Policy Mapping',
      'Delete Policy Mapping', 'View Policy Mapping List',
    ],
  },
  {
    name: 'Provision Applications',
    legacy: ['Provisioning'],
    desc: 'Connected targets the platform writes accounts to.',
    perms: [
      'Add New', 'Modify', 'Delete', 'Activate/Deactivate', 'View Details', 'View List',
      'Test Connection', 'Sync', 'Provision User', 'Deprovision User',
    ],
  },
  {
    name: 'Recertification',
    desc: 'Attestation campaigns and the decisions taken inside them.',
    perms: [
      ...CRUD('Campaign', 'Campaigns'),
      'Close Campaign', 'Campaign User Info Modifications', 'Resend Mail', 'Export Campaign Users Status',
    ],
  },
  {
    name: 'Reports',
    desc: 'The report catalog and each report it renders.',
    perms: [
      'View Reports List', 'View Admin Audit Trail Report', 'View User Access Report',
      'View Application Access Report', 'View Role Mapping Report', 'View User-Group Report',
      'View SMS-OTP Report', 'View Login Activity Report', 'View Recertification Report',
      'View Orphaned Accounts Report', 'View Pam Access Report List',
    ],
  },
  {
    name: 'Roles',
    desc: 'Role definitions and who holds them.',
    perms: ['Add Role', 'Modify Role', 'Delete Role', 'View Roles', 'View Specific Role', 'Add/Remove User'],
  },
  {
    name: 'SMS Management',
    desc: 'SMS clients, providers, templates and the outbound queue.',
    perms: [
      'Add SMS Client', 'Modify SMS Client', 'Delete SMS Client', 'View SMS Clients List', 'Activate/Deactivate SMS Client',
      'Add SMS Provider', 'Modify SMS Provider', 'Delete SMS Provider', 'View SMS Providers List', 'Activate/Deactivate SMS Provider',
      'Add SMS Template', 'Modify SMS Template', 'Delete SMS Template', 'View SMS Templates List', 'Activate/Deactivate SMS Template',
      'Send SMS',
    ],
  },
  {
    name: 'SSO Access Application Groups',
    desc: 'Groups whose membership becomes claims in an SSO assertion.',
    perms: [
      ...CRUD('SSO Access Application Group', 'SSO Access Application Groups'),
      'Add Users', 'Add Bulk Users', 'Remove Users', 'Remove Bulk Users', 'Remove All Users',
      'Export Users', 'View Logs', 'Change Status',
    ],
  },
  {
    name: 'SSO Applications',
    desc: 'Federated applications, per protocol, with their attributes, URLs and client scopes.',
    perms: [
      ...CRUD('SAML Application', 'SAML Applications'),
      ...CRUD('OAuth Application', 'OAuth Applications'),
      ...CRUD('OAuth Mobile Application', 'OAuth Mobile Applications'),
      ...CRUD('JWT Application', 'JWT Applications'),
      ...CRUD('Link Application', 'Link Applications'),
      'Add SAML Attribute', 'Modify SAML Attribute', 'Delete SAML Attribute', 'View SAML Attributes',
      'Add OAuth Attribute', 'Modify OAuth Attribute', 'Delete OAuth Attribute', 'View OAuth Attributes',
      'Add OAuth Mobile Attribute', 'Modify OAuth Mobile Attribute', 'Delete OAuth Mobile Attribute', 'View OAuth Mobile Attributes',
      'Add JWT Attribute', 'Modify JWT Attribute', 'Delete JWT Attribute', 'View JWT Attributes',
      'Add Link Attribute', 'Modify Link Attribute', 'Delete Link Attribute', 'View Link Attributes',
      'Add URL Configuration', 'Modify URL Configuration', 'Delete URL Configuration', 'View URL Configurations',
      'Assign Client Scope Role (OAuth)', 'Remove Client Scope Role (OAuth)',
      'Assign Client Scope Role (SAML)', 'Remove Client Scope Role (SAML)',
      'Application Ip Allowance Toggle', 'Export Metadata', 'Activate/Deactivate SSO Application',
      'View SSO Applications List', 'Import SSO Application', 'Regenerate Client Secret',
      'View Client Secret', 'Test SSO Login', 'Export SSO Application List',
    ],
  },
  { name: 'SSO Configurations', desc: 'Which authentication method the federation gateway presents.', perms: ['Configure Authentication Method'] },
  { name: 'SSO Restrictions', desc: 'Network and device restrictions applied to federated sign-in.', perms: ['Change Configurations', 'Change Status', 'View List'] },
  {
    name: 'Schedule Access',
    desc: 'Time-boxed group membership with an explicit start and end.',
    perms: [
      'Add Schedule Access', 'Update Schedule Access', 'Delete Schedule Access',
      'Bulk Add Schedule Access', 'Bulk Update Schedule Access', 'Bulk Delete Schedule Access',
      'View Schedule Access Details', 'View Schedule Access List', 'View Schedule Access Response',
    ],
  },
  {
    name: 'Schedulers',
    desc: 'Recurring platform jobs and their execution evidence.',
    perms: [
      ...CRUD('Scheduler', 'Schedulers'),
      'Activate/Deactivate', 'Start or stop', 'View Scheduler logs', 'View Scheduler service logs',
    ],
  },
  {
    name: 'Segregation Of Duties',
    legacy: ['Segregation of Duties'],
    desc: 'Toxic-combination rules and the exceptions granted against them.',
    perms: [...CRUD('SoD Rule', 'SoD Rules'), 'Exception', 'Export Exception'],
  },
  {
    name: 'Settings',
    desc: 'Tenant configuration. Each control is granted independently.',
    perms: [
      'Organization Logo', 'Username Casing', 'Set/Reset Email Link Expire Time', 'OTP Expire Time',
      'Default Redirect after logout', 'Password Flow Configuration', 'Region flows',
      'Manage Approval Level', 'SMS Service', "Redirect Uri's", 'Device Based Authentication',
      'Password Creation Link SMS', 'Manage API Payload Encryption',
    ],
  },
  {
    name: 'Trust Reconciliation',
    desc: 'Matching target accounts against authoritative identity sources.',
    perms: [
      ...CRUD('Trust Source', 'Trust Sources'),
      'Import User', 'Modify User', 'Sync User', 'Trust Reconciliation User',
    ],
  },
  { name: 'Useful Links', desc: 'The published link list end users see.', perms: ['View Useful Links'] },
  {
    name: 'Useful Links Management',
    desc: 'Authoring the published link list.',
    perms: [...CRUD('Useful Link', 'Useful Links'), 'Change Status'],
  },
  {
    name: 'Users',
    desc: 'The identity register and everything done to an identity.',
    perms: [
      'Add New User', 'Edit User', 'Delete User', 'View User Details', 'View Users List',
      'Active/Deactivate User Account', 'Lock/Unlock User Account', 'Set/Reset User Password',
      'Reset MFA', 'Reset Device', 'Recent Activity',
      'Add Application Group', 'Remove Application Group',
      'Add Access Application Group', 'Remove Access Application Group',
      'Add SSO Access Application Group', 'Remove SSO Access Application Group',
      'Import Bulk Users', 'Export Users', 'Import Groups', 'Export Groups',
      'Modify Bulk Users', 'Delete Bulk Users', 'Activate/Deactivate Bulk Users', 'Update Bulk Users Password',
    ],
  },
  {
    name: 'Access Requests',
    desc: 'The self-service request catalog and its tracking.',
    perms: [
      'Add Access Request', 'Modify Access Request', 'Delete Access Request',
      'View Access Request Details', 'View Access Requests List',
      'Raise Other Request', 'Track Request', 'Export Access Requests',
    ],
  },
].map((m, i) => ({ id: i + 1, legacy: [], ...m }))

/** Every alias that must still resolve to a module, including its own name. */
export const MODULE_ALIASES = PERMISSION_MODULES.reduce((acc, m) => {
  acc[m.name] = m.name
  m.legacy.forEach((l) => { acc[l] = m.name })
  return acc
}, {})

export const PERMISSION_TOTAL = PERMISSION_MODULES.reduce((a, m) => a + m.perms.length, 0)

/**
 * A permission is a read unless it is not. `View`/`Export` observe; everything
 * else changes state, is dispatched at a target, or hands out a credential.
 */
export const isWritePerm = (p) => !/^(View|Export)\b/i.test(String(p))

/**
 * Bands exist so a 63-permission module stays readable. They are derived from
 * the verb rather than hand-maintained, so a new permission lands in the right
 * band without a second edit.
 */
const BANDS = [
  { id: 'read', label: 'Read and visibility', test: (p) => /^View\b/i.test(p) },
  { id: 'create', label: 'Create', test: (p) => /^(Add|Create|Raise|Initiate|Import)\b/i.test(p) && !/^Import Bulk|^Import Groups/i.test(p) },
  { id: 'modify', label: 'Modify and configure', test: (p) => /^(Modify|Edit|Update|Change|Configure|Set|Assign|Publish|Enable|Activate|Application Ip|Password Flow|Region flows|Organization Logo|Username Casing|OTP Expire|Default Redirect|Manage|Employee Type|Email Creation|Username Creation|Consent Attribute|Device Based|SMS Service|Password Creation|My profile|Redirect Uri)/i.test(p) },
  { id: 'remove', label: 'Remove and revoke', test: (p) => /^(Delete|Remove|Reject|Revoke|Close)\b/i.test(p) },
  { id: 'bulk', label: 'Bulk and data', test: (p) => /(Bulk|^Import|^Export)/i.test(p) },
  { id: 'ops', label: 'Operations', test: () => true },
]

export const bandPerms = (perms) => {
  const used = new Set()
  const out = []
  BANDS.forEach((b) => {
    const hit = perms.filter((p) => !used.has(p) && b.test(p))
    hit.forEach((p) => used.add(p))
    if (hit.length) out.push({ id: b.id, label: b.label, perms: hit })
  })
  return out
}

/** The catalogue shape the pickers consume. */
export const PERMISSION_CATALOG = PERMISSION_MODULES.map((m) => ({
  id: m.id, name: m.name, desc: m.desc, legacy: m.legacy, perms: m.perms,
}))

/**
 * Role grants authored against the old module names or the old generic CRUD
 * verbs still have to resolve. This maps a stored grant map onto the register:
 * legacy module names are renamed, and the five generic verbs expand to the
 * module's own equivalents.
 */
const GENERIC_EXPANSION = {
  'View list': (m) => m.perms.filter((p) => /^View .*(List|Hierarchy|Configuration|Attributes|Roles|Useful Links)$/i.test(p) || /^View (My Apps List|Reports List|System Logs|List|Rules|Details)$/i.test(p)),
  View: (m) => m.perms.filter((p) => /Details$|^View Specific|^View Hierarchy$|^View User$|^My profile$/i.test(p)),
  Create: (m) => m.perms.filter((p) => /^(Add|Create|Raise)\b/i.test(p)),
  Edit: (m) => m.perms.filter((p) => /^(Modify|Edit|Update|Configure|Change)\b/i.test(p)),
  Delete: (m) => m.perms.filter((p) => /^Delete\b/i.test(p)),
}

export const migrateGrants = (granted = {}) => {
  const out = {}
  Object.entries(granted).forEach(([mod, perms]) => {
    const name = MODULE_ALIASES[mod]
    if (!name) return
    const m = PERMISSION_CATALOG.find((x) => x.name === name)
    if (!m) return
    const set = new Set(out[name] || [])
    ;(perms || []).forEach((p) => {
      if (m.perms.includes(p)) { set.add(p); return }
      const expand = GENERIC_EXPANSION[p]
      if (expand) expand(m).forEach((x) => set.add(x))
    })
    if (set.size) out[name] = m.perms.filter((p) => set.has(p))
  })
  return out
}
