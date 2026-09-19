import { APPLICATIONS, GROUPS, SSO_APPS, DIRECTORIES } from '../../data/seed'
import { dayOf } from './GroupDetail'

export const BASE_PATH = '/iam/groups'

export const KINDS = ['Application', 'Access', 'SSO']

export const OWNERS = [
  'IT Operations', 'Finance', 'Human Resources', 'Engineering',
  'Security', 'Compliance', 'Sales', 'Support', 'Procurement',
]

export const FEDERATED = SSO_APPS.filter((a) => a.protocol !== 'Link')

export const ACCESS_APPLICATIONS = [
  'IDAM Console',
  'Self-Service Portal',
  'Access Request Catalog',
  'Approval Workbench',
  'Recertification Portal',
  'Delegated Admin Console',
  'Password Reset Kiosk',
]

export const CLAIM_OF = { SAML: 'memberOf', OIDC: 'groups', OAuth: 'scope', 'OAuth Mobile': 'scope', JWT: 'roles' }

/**
 * A group provisioned onto a target that is backed by a directory has to say
 * *where* in that directory it lives — the platform writes the group entry to a
 * branch, and without the directory and the organizational unit it has nowhere
 * to put it. Only Application groups carry this: an Access or SSO group is a
 * platform-side construct with no directory entry.
 */
export const LDAP_DIRECTORIES = DIRECTORIES.map((d) => d.displayName)

export const LDAP_OU_SUGGESTIONS = {
  'IDAM Directory': ['ou=groups,dc=tanflow,dc=com', 'ou=appgroups,dc=tanflow,dc=com', 'ou=roles,dc=tanflow,dc=com'],
  'Partner Directory (DMZ)': ['ou=groups,ou=partners,dc=tanflow,dc=com', 'ou=vendors,dc=tanflow,dc=com'],
  'AD Forest': ['OU=Groups,DC=corp,DC=tanflow,DC=com', 'OU=Security Groups,DC=corp,DC=tanflow,DC=com'],
}

export const ouOptionsFor = (directory) => LDAP_OU_SUGGESTIONS[directory] || ['ou=groups,dc=tanflow,dc=com']
export const PROTOCOL_ICON = { SAML: 'certify', OIDC: 'key', OAuth: 'swap', JWT: 'code' }
export const PROTOCOL_TONE = { SAML: 'acc', OIDC: 'info', OAuth: 'warn', JWT: 'mut' }

export const KIND_META = {
  Application: {
    icon: 'group',
    tone: 'acc',
    label: 'Application group',
    plural: 'Application groups',
    appLabel: 'Application',
    appHint: 'The connected system that enforces the rights this group carries.',
    appOptions: () => APPLICATIONS.map((a) => a.displayName),
    namePlaceholder: 'ERP_AP_APPROVE',
  },
  Access: {
    icon: 'users',
    tone: 'info',
    label: 'Access application group',
    plural: 'Access application groups',
    appLabel: 'Access application',
    appHint: 'The surface of the platform this group unlocks.',
    appOptions: () => ACCESS_APPLICATIONS,
    namePlaceholder: 'ACC_REQUEST_APPROVER',
  },
  SSO: {
    icon: 'sso',
    tone: 'viol',
    label: 'SSO access application group',
    plural: 'SSO access application groups',
    appLabel: 'SSO application',
    appHint: 'The relying party that consumes the claim. Protocol, client and claim name are inherited from it.',
    appOptions: () => [...new Set(FEDERATED.map((a) => a.displayName))],
    namePlaceholder: 'SSO_ANALYTICS_VIEWER',
  },
}

export const ssoTargetOf = (displayName) =>
  FEDERATED.find((a) => a.displayName === displayName) || FEDERATED[0]

export const appTargetOf = (displayName) =>
  APPLICATIONS.find((a) => a.displayName === displayName) || APPLICATIONS[0]

/** Fills in the kind-derived fields (SSO claim binding, privileged flag defaults). */
export function decorateByKind(row) {
  if (row.kind === 'SSO') {
    const target = ssoTargetOf(row.application)
    return {
      ...row,
      application: target.displayName,
      protocol: target.protocol,
      clientId: target.clientId,
      claim: CLAIM_OF[target.protocol],
    }
  }
  return row
}

const PRIVILEGED_NAME = /(ADMIN|APPROVE|POST|RELEASE|OPERATOR|UNMASK|DEPLOY|AUTHOR|PAYROLL|CLOSE|VAULT|SUPERVISOR|BREAKGLASS)/
const EXTERNAL_NAME = /(VENDOR|CONTRACTOR|PARTNER)/

const appName = (i) => APPLICATIONS[i % APPLICATIONS.length].displayName

const APPLICATION_SPECS = [
  ['AD_DOMAIN_ADMINS', 'Full administration of the corporate forest, including schema changes.', 0],
  ['AD_SERVER_OPERATORS', 'Restarts, patches and services domain-joined member servers.', 0],
  ['AD_HELPDESK_TIER1', 'Resets passwords and unlocks accounts for standard users.', 0],
  ['WD_HR_BUSINESS_PARTNER', 'Reads and edits worker records for an assigned population.', 1],
  ['WD_PAYROLL_RUN', 'Executes and releases the monthly payroll cycle.', 1],
  ['WD_TIME_APPROVER', 'Approves timesheets and absence for direct reports.', 1],
  ['SF_CRM_ADMIN', 'Administers the tenant, profiles and permission sets.', 2],
  ['SF_PIPELINE_EDITOR', 'Creates and edits opportunities across every sales region.', 2],
  ['SF_QUOTE_APPROVE', 'Approves quotes and discounts above the standard threshold.', 2],
  ['ENTRA_GLOBAL_READER', 'Read-only visibility of every tenant configuration object.', 3],
  ['ENTRA_APP_ADMIN', 'Registers applications and consents to delegated permissions.', 3],
  ['ENTRA_PIM_APPROVER', 'Approves just-in-time elevation requests.', 3],
  ['WH_ANALYTICS_READ', 'Queries curated warehouse marts under row-level masking.', 4],
  ['WH_MODEL_DEPLOY', 'Promotes transformation models into the production warehouse.', 4],
  ['BILL_INVOICE_ISSUE', 'Issues and reissues customer invoices.', 5],
  ['BILL_REFUND_APPROVE', 'Approves refunds and credit notes above the desk limit.', 5],
  ['CB_LEDGER_POST', 'Posts journals to the core banking general ledger.', 6],
  ['CB_WIRE_RELEASE', 'Releases outbound wire payments from the settlement queue.', 6],
  ['ERP_AP_APPROVE', 'Approves accounts-payable batches before disbursement.', 7],
  ['ERP_VENDOR_MASTER', 'Maintains vendor master records and settlement details.', 7],
  ['ERP_PERIOD_CLOSE', 'Runs the period-end close and locks the sub-ledgers.', 7],
]

const ACCESS_SPECS = [
  ['ACC_CONSOLE_ADMIN', 'Administers the identity console tenant and every module inside it.', 0],
  ['ACC_CONSOLE_OPERATOR', 'Runs day-to-day joiner, mover and leaver operations.', 0],
  ['ACC_CONSOLE_AUDITOR', 'Reads every console module without any change right.', 0],
  ['ACC_SELF_SERVICE_USER', 'Baseline self-service access granted to every active employee.', 1],
  ['ACC_CATALOGUE_BROWSE', 'Browses the entitlement catalog and raises access requests.', 2],
  ['ACC_CATALOGUE_CURATOR', 'Publishes catalog items and maintains their metadata.', 2],
  ['ACC_REQUEST_APPROVER', 'Approves requests routed to the line-manager stage.', 3],
  ['ACC_REQUEST_ESCALATION', 'Handles escalated and breached approval tasks.', 3],
  ['ACC_RECERT_REVIEWER', 'Reviews and signs off certification line items.', 4],
  ['ACC_RECERT_CAMPAIGN_OWNER', 'Creates campaigns and closes certification cycles.', 4],
  ['ACC_DELEGATED_ORG_ADMIN', 'Administers identities inside a single delegated organization.', 5],
  ['ACC_HELPDESK_UNLOCK', 'Unlocks accounts and forces credential resets from the kiosk.', 6],
  ['ACC_KIOSK_SUPERVISOR', 'Supervises kiosk resets and reviews the resulting audit trail.', 6],
  ['ACC_BREAKGLASS', 'Emergency administrative access with recorded sessions.', 0],
]

const SSO_SPECS = [
  ['SSO_WORKSPACE_STAFF', 'Baseline federated access to mail, drive and calendar.', 0],
  ['SSO_WORKSPACE_ADMINS', 'Super-administrator console for the workspace tenant.', 0],
  ['SSO_WORKSPACE_CONTRACTORS', 'Time-boxed federation for contract staff and agencies.', 0],
  ['SSO_SFDC_SALES', 'Federated sales console for quota-carrying roles.', 1],
  ['SSO_SFDC_ADMIN', 'Administers the federated connection, claims and profiles.', 1],
  ['SSO_ATLASSIAN_ENGINEERING', 'Repository, board and page access for engineering staff.', 2],
  ['SSO_ATLASSIAN_JIRA_ADMIN', 'Administers projects, schemes and workflow configuration.', 2],
  ['SSO_SERVICEDESK_AGENT', 'Works the service desk queue through a delegated token.', 3],
  ['SSO_SERVICEDESK_SUPERVISOR', 'Reassigns, escalates and reopens service desk tickets.', 3],
  ['SSO_ANALYTICS_VIEWER', 'Reads published dashboards through a signed token.', 4],
  ['SSO_ANALYTICS_ADMIN', 'Administers workspaces, tokens and row-level security.', 4],
  ['SSO_VENDOR_PARTNER', 'External partner access to the vendor portal.', 5],
  ['SSO_VENDOR_PORTAL_ADMIN', 'Onboards partners and manages portal entitlements.', 5],
]

function buildRow({ id, name, description, kind, application, i }) {
  const seed = GROUPS[(id * 2 + 1) % GROUPS.length]
  const ageDays = 14 + id * 9
  const privileged = PRIVILEGED_NAME.test(name)
  const external = kind === 'SSO' && EXTERNAL_NAME.test(name)
  return decorateByKind({
    id,
    sno: id,
    name,
    description,
    kind,
    application,
    members: i % 9 === 5 ? 0 : ((seed.members * (i + 5)) % 380) + 6,
    owner: OWNERS[(seed.id + id) % OWNERS.length],
    privileged,
    external,
    // Directory binding, on Application groups whose target is directory-backed.
    ldapApplication: kind === 'Application' && id % 3 === 0 ? LDAP_DIRECTORIES[id % LDAP_DIRECTORIES.length] : '',
    ldapOu: kind === 'Application' && id % 3 === 0
      ? ouOptionsFor(LDAP_DIRECTORIES[id % LDAP_DIRECTORIES.length])[0]
      : '',
    // Exactly one Application group per application is the primary: the one an
    // identity is placed in when nothing more specific applies.
    primary: kind === 'Application' && id % 7 === 1,
    ageDays,
    createdOn: dayOf(ageDays),
    reviewedOn: dayOf(Math.max(3, Math.round(ageDays / 4))),
  })
}

let n = 0
export const GROUP_ROWS = [
  ...APPLICATION_SPECS.map(([name, description, app], i) =>
    buildRow({ id: ++n, name, description, kind: 'Application', application: appName(app), i })),
  ...ACCESS_SPECS.map(([name, description, app], i) =>
    buildRow({ id: ++n, name, description, kind: 'Access', application: ACCESS_APPLICATIONS[app % ACCESS_APPLICATIONS.length], i })),
  ...SSO_SPECS.map(([name, description, app], i) =>
    buildRow({ id: ++n, name, description, kind: 'SSO', application: FEDERATED[app % FEDERATED.length].displayName, i })),
]

export const cleanGroupName = (raw, fallback) =>
  (raw || fallback).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')

/**
 * Parses CSV text into staged group definitions.
 * Expected columns: NAME,DESCRIPTION — one group per line, optional header row.
 */
export function parseGroupCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l, i) => !(i === 0 && /^name\s*,/i.test(l)))
  return lines.map((line, i) => {
    const comma = line.indexOf(',')
    const rawName = comma === -1 ? line : line.slice(0, comma)
    const description = comma === -1 ? '' : line.slice(comma + 1).trim().replace(/^"|"$/g, '')
    const name = rawName.trim()
    const valid = /^[A-Za-z0-9_ -]+$/.test(name) && name.length >= 2
    return {
      line: i + 1,
      name: cleanGroupName(name, `IMPORTED_${i + 1}`),
      description: description || 'Imported definition, description pending.',
      valid,
      reason: valid ? '' : 'Name must use letters, digits and underscores.',
    }
  })
}

export const CSV_TEMPLATE = [
  'NAME,DESCRIPTION',
  'ERP_TAX_FILING,Files statutory returns for the Indian ledger',
  'ACC_AUDIT_READONLY,Reads every module for the external auditor',
  'SSO_ANALYTICS_AUDIT,Reads dashboards for the external auditor',
].join('\n')

/* Delete Bulk reads a list of group names. It is deliberately the same shape as
   the directory's delete template — one identifying column and nothing else —
   so an operator who has run one has run both. */
export const GROUP_DELETE_SAMPLE = [
  'groupName',
  'ERP_TAX_FILING',
  'ACC_AUDIT_READONLY',
].join('\n')

export const GROUP_DELETE_SPEC = {
  title: 'Delete Bulk',
  sub: 'Remove every group listed in the file and revoke what its members hold.',
  sample: GROUP_DELETE_SAMPLE,
  sampleName: 'tanflow-groups-delete-sample.csv',
  expects: ['groupName'],
  danger: true,
  dupNote: 'A group name may appear only once in the file. Names that do not match a group in the register are rejected and returned as failed rows; nothing else in the file is affected.',
  submitLabel: 'Delete groups',
  icon: 'trash',
}
