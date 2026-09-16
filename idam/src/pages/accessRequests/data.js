import { approvalLevels, useApprovalLevels } from '../settings/settingsStore'
import { NOW_MS, stampText } from '../../lib/clock'
import {
  APPLICATIONS, ATTRS, DEPARTMENTS, GROUPS, LOOKUPS, MFA_METHODS, ME, ORGS, USERS,
} from '../../data/seed'

export const TODAY = '2026-08-05 09:00'
export const TODAY_DATE = '2026-08-05'
export const OPEN = new Set(['Pending', 'Escalated'])
export const DURATIONS = ['30 days', '60 days', '90 days', 'Until project close', 'Permanent']

const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{1,2})/
export const hashOf = (v) => [...String(v)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7)

/* A decision is stamped some hours after the request was raised, but it cannot
   be stamped after the platform clock: a request raised at the current instant
   was otherwise showing approvals committed hours into the future. */
export const shiftStamp = (raised, hours) => {
  const m = STAMP_RE.exec(String(raised || ''))
  if (!m) return ''
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) % 24, Number(m[5]) % 60)
  return stampText(new Date(Math.min(base + hours * 3600000, NOW_MS)))
}

export const nameOf = (username) => {
  const parts = String(username).split('_')
  return { first: parts[0] || username, last: parts[1] || '' }
}
export const statusTone = (s) => (s === 'Approved' ? 'ok' : s === 'Rejected' ? 'bad' : s === 'Escalated' ? 'bad' : 'warn')
export const nextRequestId = (rs) => `REQ-${rs.reduce((m, r) => Math.max(m, Number(String(r.id).split('-')[1]) || 0), 2400) + 1}`
export const userOf = (id) => USERS.find((u) => String(u.id) === String(id))
export const slug = (v, fallback) => String(v || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 28) || fallback

export const APPROVERS_L1 = ['Priya Nair', 'Rohan Mehta', 'Ananya Iyer', 'Sameer Verma', 'Marta Novak', 'Yusuf Haddad']
export const APPROVERS_L2 = ['Shubham Jain', 'Vansh Makhija', 'Elena Ferrer', 'Nikhil Rao', 'Zoya Khan']
export const APPROVERS_L3 = ['Elena Ferrer', 'Vansh Makhija', 'Shubham Jain']

const COMMENTS_L1 = [
  'Confirmed with the requester. The task is in this quarter’s plan and the grant is time-bound.',
  'Business need verified against the project charter. Approved for the stated duration only.',
  'Cover for a colleague on parental leave. Reviewed the handover note before approving.',
  'Needed for the quarter-end close. Flagged for removal in the next attestation cycle.',
]
const COMMENTS_L2 = [
  'Entitlement is appropriate for the role. No compensating control required.',
  'Approved on the target. The account is already provisioned and will inherit the group on the next run.',
  'Owner sign-off recorded. Grant will be reviewed in the Q4 attestation.',
]

/**
 * The approval chain is tenant configuration, not a constant: Settings →
 * Approval levels names and orders it, and this reads whatever is configured
 * there. `CHAIN` is kept as a live-enough snapshot for the few call sites that
 * cannot use a hook; every rendering surface should call `useChain()`.
 */
export const chainSteps = () => approvalLevels().map((l) => ({
  id: l.id, title: l.name, role: l.role, detail: l.detail, sla: l.sla,
}))

export const CHAIN = chainSteps()

/** The reactive form. A level renamed in Settings re-renders every chain. */
export const useChain = () => useApprovalLevels().map((l) => ({
  id: l.id, title: l.name, role: l.role, detail: l.detail, sla: l.sla,
}))

/**
 * Which stored audit fields hold level `i`'s decision. The tenant's record
 * carries three triplets; a fourth configured level reads an absent field and
 * renders as "not yet decided", which is the honest answer.
 */
export const levelFields = (i) => (i === 0
  ? { on: 'approvedOn', by: 'approvedBy', comment: 'comment' }
  : { on: `approvedOnL${i}`, by: `approvedByL${i}`, comment: `commentL${i}` })

/** The `DECIDED ON (<level>)` / `DECIDED BY (<level>)` column pairs, named from
 *  the configured levels so renaming a level renames the column.
 *
 *  A level records whoever closed it either way, so a rejected request has a
 *  name and a timestamp in these cells. Heading them "Approved" said the
 *  opposite of what the row shows. */
export const levelColumnDefs = (levels) => levels.flatMap((l, i) => {
  const f = levelFields(i)
  return [
    { key: f.on, label: `Decided on (${l.name})`, kind: 'date' },
    { key: f.by, label: `Decided by (${l.name})`, kind: 'who' },
  ]
})
export const STEP_FILL = { done: 'var(--ok)', current: 'var(--warn-core)', rejected: 'var(--bad)', future: 'var(--mut)' }
export const STEP_TONE = { done: 'ok', current: 'warn', rejected: 'bad', future: 'mut' }
export const STEP_LABEL = { done: 'Approved', current: 'Awaiting', rejected: 'Rejected', future: 'Waiting' }

export const stepState = (row, i) => {
  if (row.status === 'Approved') return 'done'
  if (row.status === 'Rejected') return i < row.level ? 'done' : i === row.level ? 'rejected' : 'future'
  if (i < row.level) return 'done'
  if (i === row.level) return 'current'
  return 'future'
}

export const withAudit = (r) => {
  const h = hashOf(r.id)
  /* A level is stamped when it has closed — approved or rejected — and not
     before. These read `r.level > i - 1`, which is the level the request is
     *sitting at*, so an open request arrived carrying a decision timestamp, an
     approver name and a comment for the level still deciding it. The evidence
     card and the register printed them, and the workflow view put a signed
     comment under an approver who had not answered yet. `stepState` already
     knows which levels are closed; ask it rather than re-deriving it. */
  const closed = (i) => ['done', 'rejected'].includes(stepState(r, i))
  const l0 = closed(1)
  const l1 = closed(2)
  const l2 = closed(3)
  return {
    ...r,
    approvedOn: l0 ? shiftStamp(r.raised, 1 + (h % 5)) : '',
    approvedBy: l0 ? APPROVERS_L1[h % APPROVERS_L1.length] : '',
    approvedOnL1: l1 ? shiftStamp(r.raised, 2 + (h % 9)) : '',
    approvedByL1: l1 ? APPROVERS_L2[h % APPROVERS_L2.length] : '',
    commentL1: l1 ? COMMENTS_L1[h % COMMENTS_L1.length] : '',
    approvedOnL2: l2 ? shiftStamp(r.raised, 13 + (h % 19)) : '',
    approvedByL2: l2 ? APPROVERS_L3[Math.floor(h / 7) % APPROVERS_L3.length] : '',
    commentL2: l2 ? COMMENTS_L2[Math.floor(h / 5) % COMMENTS_L2.length] : '',
    pendingWith: r.status === 'Approved' || r.status === 'Rejected'
      ? ''
      : [APPROVERS_L1, APPROVERS_L2, APPROVERS_L3][Math.min(2, r.level - 1)][h % 3],
    detail: r.detail || '',
    duration: r.duration || '',
  }
}

const DEFAULT_GRANTS = [
  { capability: 'Sign in to the application with the requested profile', target: 'Single sign-on', sensitivity: 'low' },
  { capability: 'Read records inside the assigned business scope', target: 'Application data', sensitivity: 'medium' },
]

export const GRANTS = {
  FIN_GL_POST: [
    { capability: 'Post and reverse journal entries', target: 'Core Banking (DB2)', sensitivity: 'critical' },
    { capability: 'Open and close accounting periods', target: 'Oracle ERP', sensitivity: 'high' },
    { capability: 'Read the full general ledger', target: 'Oracle ERP', sensitivity: 'medium' },
    { capability: 'Export trial balance extracts', target: 'Analytics Warehouse', sensitivity: 'medium' },
  ],
  FIN_AP_APPROVE: [
    { capability: 'Approve accounts-payable payment batches', target: 'Billing Platform', sensitivity: 'critical' },
    { capability: 'Release payment files to the bank gateway', target: 'Core Banking (DB2)', sensitivity: 'critical' },
    { capability: 'View supplier bank details', target: 'Oracle ERP', sensitivity: 'high' },
  ],
  FIN_VENDOR_MASTER: [
    { capability: 'Create and amend vendor master records', target: 'Oracle ERP', sensitivity: 'critical' },
    { capability: 'Change supplier bank details', target: 'Oracle ERP', sensitivity: 'critical' },
    { capability: 'Approve vendor onboarding requests', target: 'Billing Platform', sensitivity: 'high' },
  ],
  ENG_PROD_DEPLOY: [
    { capability: 'Deploy releases to production', target: 'Kubernetes Console', sensitivity: 'critical' },
    { capability: 'Roll back a running production service', target: 'Kubernetes Console', sensitivity: 'high' },
    { capability: 'Read production application logs', target: 'Analytics Warehouse', sensitivity: 'medium' },
  ],
  ENG_REPO_ADMIN: [
    { capability: 'Administer source repositories and branch protection', target: 'GitHub Enterprise', sensitivity: 'high' },
    { capability: 'Manage CI secrets and deploy keys', target: 'GitHub Enterprise', sensitivity: 'critical' },
    { capability: 'Force-push to protected branches', target: 'GitHub Enterprise', sensitivity: 'high' },
  ],
  HR_PII_READ: [
    { capability: 'Read personally identifiable employee records', target: 'Workday HR', sensitivity: 'critical' },
    { capability: 'Export the employee master to CSV', target: 'Workday HR', sensitivity: 'critical' },
    { capability: 'View compensation bands', target: 'Workday HR', sensitivity: 'high' },
  ],
  HR_PAYROLL_RUN: [
    { capability: 'Execute the monthly payroll run', target: 'Workday HR', sensitivity: 'critical' },
    { capability: 'Amend payroll adjustments before submission', target: 'Workday HR', sensitivity: 'critical' },
    { capability: 'Release the payroll file to the bank', target: 'Core Banking (DB2)', sensitivity: 'critical' },
  ],
  IT_DOMAIN_ADMIN: [
    { capability: 'Full administration of the directory forest', target: 'Active Directory · Corporate', sensitivity: 'critical' },
    { capability: 'Reset any credential, including administrators', target: 'Active Directory · Corporate', sensitivity: 'critical' },
    { capability: 'Modify group policy across every organizational unit', target: 'Active Directory · Corporate', sensitivity: 'critical' },
    { capability: 'Create and delete service principals', target: 'Microsoft Entra ID', sensitivity: 'high' },
  ],
  IT_BACKUP_OPERATOR: [
    { capability: 'Run and restore backups across every target', target: 'Active Directory · Corporate', sensitivity: 'high' },
    { capability: 'Read backup archives containing production data', target: 'Analytics Warehouse', sensitivity: 'high' },
    { capability: 'Suspend a scheduled backup job', target: 'Billing Platform', sensitivity: 'medium' },
  ],
  SEC_SIEM_ANALYST: [
    { capability: 'Investigate security events across every source', target: 'Splunk', sensitivity: 'high' },
    { capability: 'Read authentication and session logs', target: 'Microsoft Entra ID', sensitivity: 'high' },
    { capability: 'Quarantine a device or session', target: 'CrowdStrike Falcon', sensitivity: 'medium' },
  ],
  SALES_CRM_ADMIN: [
    { capability: 'Administer the CRM tenant and its object model', target: 'Salesforce CRM', sensitivity: 'high' },
    { capability: 'Export the full customer contact database', target: 'Salesforce CRM', sensitivity: 'critical' },
    { capability: 'Reassign pipeline ownership in bulk', target: 'Salesforce CRM', sensitivity: 'medium' },
  ],
  SUP_TIER2: [
    { capability: 'Work the second-line support queue', target: 'Service Desk', sensitivity: 'low' },
    { capability: 'Read customer case history', target: 'Service Desk', sensitivity: 'medium' },
    { capability: 'Trigger a password reset for an end user', target: 'Active Directory · Corporate', sensitivity: 'medium' },
  ],
  NEW_IDENTITY: [
    { capability: 'Create the identity record and its directory account', target: 'Active Directory · Corporate', sensitivity: 'high' },
    { capability: 'Apply the birthright access bundle for the department', target: 'Single sign-on', sensitivity: 'medium' },
    { capability: 'Issue a single-use enrollment credential', target: 'Tanflow IDAM', sensitivity: 'high' },
  ],
  MFA_FACTORS: [
    { capability: 'Clear every enrolled authentication factor', target: 'Tanflow IDAM', sensitivity: 'critical' },
    { capability: 'Force re-enrollment at the next sign-in', target: 'Single sign-on', sensitivity: 'high' },
    { capability: 'Invalidate active sessions on every device', target: 'Microsoft Entra ID', sensitivity: 'medium' },
  ],
}
export const grantsFor = (target) => GRANTS[target] || DEFAULT_GRANTS

export const groupOf = (target) => GROUPS.find((g) => g.name === target) || null

export const sensitivityOf = (target) => {
  const rows = grantsFor(target)
  if (rows.some((r) => r.sensitivity === 'critical')) return 'critical'
  if (rows.some((r) => r.sensitivity === 'high')) return 'high'
  if (rows.some((r) => r.sensitivity === 'medium')) return 'medium'
  return 'low'
}

export const peersFor = (target) => {
  const h = hashOf(target)
  return Array.from({ length: 5 }, (_, i) => USERS[(h + i * 13) % USERS.length])
}

export const requesterProfile = (name) => {
  const h = hashOf(name || 'unknown')
  const raised = 4 + (h % 22)
  const approved = Math.max(1, Math.round(raised * (0.58 + ((h % 30) / 100))))
  return {
    role: ['Line manager', 'Project lead', 'Helpdesk operator', 'Resource owner', 'Delivery manager'][h % 5],
    department: DEPARTMENTS[h % DEPARTMENTS.length],
    raised,
    approved: Math.min(raised, approved),
    rejected: Math.max(0, raised - Math.min(raised, approved)),
    avgHours: 6 + (h % 40),
    withdrawn: h % 4,
  }
}

export const factorsFor = (u) => {
  if (!u) return []
  return MFA_METHODS.filter((m) => m.enabled).filter((m, i) => (u.id + i) % 3 !== 2)
}

export const IDENTITY_OPTIONS = USERS.slice(0, 40).map((u) => ({ value: String(u.id), label: `${u.username} · ${u.department}` }))
export const ENTITLEMENT_OPTIONS = GROUPS.map((g) => ({ value: g.name, label: g.name }))
export const MANAGER_OPTIONS = [...new Set(USERS.map((u) => u.manager).filter(Boolean))].sort().slice(0, 24)
export const APPLICATION_OPTIONS = APPLICATIONS.map((a) => a.displayName)
export const USER_ATTRS = ATTRS
export const ATTR_BY_ID = Object.fromEntries(ATTRS.map((a) => [a.id, a]))
export const ATTR_SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'professional', label: 'Professional' },
  { id: 'residential', label: 'Residential' },
  { id: 'location', label: 'Location' },
]
export const attrOptions = (a) => {
  if (!a || a.type !== 'select') return null
  if (a.src === 'organizations') return ORGS
  if (a.src === 'managers') return MANAGER_OPTIONS
  return LOOKUPS[a.src] || null
}
export const stagedChanges = (v) => {
  const u = v.userId ? userOf(v.userId) : null
  return Object.entries(v.changes || {})
    .filter(([id, val]) => String(val ?? '').trim() !== '' && (!u || String(u[id] ?? '') !== String(val)))
    .map(([id, val]) => ({
      id,
      field: ATTR_BY_ID[id] ? ATTR_BY_ID[id].label : id,
      from: u ? String(u[id] ?? '') : '',
      to: String(val),
      kind: 'modify',
    }))
}
export const MFA_FACTOR_OPTIONS = ['All factors', 'Passkey / FIDO2', 'Authenticator app', 'Push notification', 'SMS one-time code', 'Email one-time code']
export const MFA_REASONS = ['Lost device', 'Replaced device', 'Compromised factor', 'Enrollment failure', 'Helpdesk verified']
export const OTHER_CATEGORIES = ['Access', 'Account', 'Application', 'Policy exception', 'Data', 'Other']
export const URGENCIES = ['Standard', 'Elevated', 'Emergency']
export const BIRTHRIGHT = {
  Engineering: ['Google Workspace', 'GitHub Enterprise', 'Jira Service Desk', 'Slack'],
  Finance: ['Google Workspace', 'Oracle ERP (read)', 'SAP Concur', 'Slack'],
  'Human Resources': ['Google Workspace', 'Workday (self service)', 'Slack'],
  'IT Operations': ['Google Workspace', 'Service Desk', 'Jamf Pro', 'Slack'],
  Sales: ['Google Workspace', 'Salesforce (standard)', 'HubSpot', 'Slack'],
  Security: ['Google Workspace', 'Splunk (read)', 'CrowdStrike Falcon', 'Slack'],
  Compliance: ['Google Workspace', 'DocuSign', 'Slack'],
  Support: ['Google Workspace', 'Zendesk', 'Service Desk', 'Slack'],
}
export const birthrightFor = (dept) => BIRTHRIGHT[dept] || ['Google Workspace', 'Slack']

/* How a group grant's lifetime reads on a row, in a summary and to an
   approver. One function, so the three cannot disagree. */
export const grantWindow = (v) => {
  if (v.permanent) return 'Permanent'
  if (v.startDate && v.endDate) return `${v.startDate} → ${v.endDate}`
  if (v.endDate) return `Until ${v.endDate}`
  if (v.startDate) return `From ${v.startDate}`
  return 'No window set'
}

/* How a set of cleared factors reads on a register row and to an approver. */
export const factorText = (list) => {
  const f = Array.isArray(list) ? list : []
  if (f.length === 0) return 'No factor selected'
  if (f.length <= 2) return f.join(' + ')
  return `${f.length} factors`
}

export const TYPE_SPECS = {
  adduser: {
    key: 'adduser',
    label: 'Add user',
    icon: 'user',
    sub: 'Stage a joiner for approval. Nothing is provisioned until the chain clears.',
    intro: 'The identity is created and provisioned to every mapped target only after the final approver signs off. The attributes below become the seed record and drive the birthright bundle.',
    submitLabel: 'Submit joiner',
    sections: [
      {
        id: 'identity',
        title: 'Identity',
        sub: 'The person being onboarded',
        fields: [
          { id: 'firstName', label: 'First name', kind: 'text', required: true, placeholder: 'Jane' },
          { id: 'lastName', label: 'Last name', kind: 'text', required: true, placeholder: 'Doe' },
          { id: 'email', label: 'Email', kind: 'text', required: true, placeholder: 'jane.doe@tanflow.com', span: 2 },
          { id: 'mobileNo', label: 'Mobile no', kind: 'text', placeholder: '+91 9800000001' },
        ],
      },
      {
        id: 'placement',
        title: 'Placement',
        sub: 'Where the identity sits in the organization',
        fields: [
          { id: 'organization', label: 'Organization', kind: 'select', required: true, options: ORGS, value: ORGS[0] },
          { id: 'department', label: 'Department', kind: 'select', required: true, options: DEPARTMENTS, value: DEPARTMENTS[0] },
          { id: 'designation', label: 'Designation', kind: 'text', placeholder: 'Senior Engineer' },
          { id: 'officeLevel', label: 'Office level', kind: 'select', options: LOOKUPS.office_level },
          { id: 'manager', label: 'Manager', kind: 'select', options: MANAGER_OPTIONS, hint: 'Becomes the level 1 approver on every future request for this identity.', span: 2 },
        ],
      },
      {
        id: 'access',
        title: 'Access at start',
        sub: 'What the identity holds on day one',
        fields: [
          { id: 'startDate', label: 'Start date', kind: 'date', required: true },
          { id: 'endDate', label: 'Contract end date', kind: 'date', hint: 'Required for contractors and external identities.' },
        ],
      },
      {
        id: 'entitlements',
        title: 'Entitlements',
        sub: 'Access required beyond the birthright bundle — search and select every group the joiner needs',
        fields: [
          { id: 'entitlements', label: 'Requested entitlements', kind: 'groupmulti', value: [], span: 2, hint: 'Anything beyond the birthright bundle adds a resource-owner level to the chain. Privileged groups add a security review.' },
        ],
      },
      {
        id: 'why',
        title: 'Justification',
        sub: 'What approvers read before deciding',
        fields: [
          { id: 'costCenter', label: 'Cost center', kind: 'text', placeholder: 'CC-4410' },
          { id: 'justification', label: 'Business justification', kind: 'textarea', span: 2, required: true, placeholder: 'Role, start date and the business unit funding the seat.' },
        ],
      },
    ],
    build: (v) => {
      const ent = Array.isArray(v.entitlements) ? v.entitlements : []
      const sod = ent.some((name) => { const g = groupOf(name); return Boolean(g && g.sodFlags) })
      return {
        username: slug(`${v.firstName}_${v.lastName}`, 'NEW_IDENTITY'),
        userId: null,
        target: ent[0] || 'NEW_IDENTITY',
        risk: sod || v.employeeType === 'Service Account' ? 'high' : ent.length > 0 || v.employeeType !== 'Internal' ? 'medium' : 'low',
        sodConflict: sod,
        detail: `${v.employeeType || 'Internal'} · ${v.organization || 'Tanflow'} · ${v.department || 'Unassigned'}${v.startDate ? ` · starts ${v.startDate}` : ''}${ent.length ? ` · ${ent.length} requested entitlement${ent.length === 1 ? '' : 's'}` : ''}`,
        entitlements: ent,
        changes: ent.map((name) => ({ id: `ent-${name}`, field: 'Group membership', from: 'Not held', to: name, kind: 'add' })),
      }
    },
  },
  modifyuser: {
    key: 'modifyuser',
    label: 'Modify user',
    icon: 'edit',
    sub: 'Change one or more governed attributes on an existing identity in a single request.',
    intro: 'Attribute changes replay through every connector that maps the field. Organization and manager changes re-evaluate dynamic policy on the next run, which can add or remove entitlements automatically.',
    submitLabel: 'Submit change',
    sections: [
      {
        id: 'identity',
        title: 'Identity',
        sub: 'Who the change applies to',
        fields: [
          { id: 'userId', label: 'Identity', kind: 'select', required: true, options: IDENTITY_OPTIONS, placeholder: 'Search the directory', span: 2 },
        ],
      },
      {
        id: 'change',
        title: 'Changes to apply',
        sub: 'Every governed attribute with its current value — edit as many as the request needs',
        fields: [
          { id: 'changes', label: 'Attributes', kind: 'attrmulti', value: {}, span: 2 },
          { id: 'effective', label: 'Effective', kind: 'select', options: ['Immediately on approval', 'Next provisioning run', 'End of month'], value: 'Immediately on approval' },
          { id: 'notify', label: 'Notify the identity', kind: 'select', options: ['Yes', 'No'], value: 'Yes' },
        ],
      },
      {
        id: 'why',
        title: 'Justification',
        sub: 'What approvers read before deciding',
        fields: [
          { id: 'justification', label: 'Business justification', kind: 'textarea', span: 2, required: true, placeholder: 'Why the attribute is changing and who authorized it.' },
        ],
      },
    ],
    build: (v) => {
      const u = userOf(v.userId)
      const changes = stagedChanges(v)
      const risky = changes.some((c) => c.id === 'organization' || c.id === 'manager' || c.id === 'department')
      return {
        username: u ? u.username : 'UNKNOWN',
        userId: u ? u.id : null,
        target: changes.length === 1 ? slug(changes[0].field, 'ATTRIBUTE') : changes.length > 1 ? 'PROFILE_UPDATE' : 'ATTRIBUTE',
        risk: risky ? 'high' : 'medium',
        sodConflict: false,
        detail: changes.length
          ? `${changes.length} attribute${changes.length === 1 ? '' : 's'} · ${changes.map((c) => c.field).join(', ')} · ${v.effective}`
          : `No attribute staged yet · ${v.effective}`,
        changes,
      }
    },
    validate: (v, built) => (!v.userId
      ? 'Select the identity the change applies to.'
      : built.changes.length === 0 ? 'Stage at least one attribute change — edit a value in the attributes grid.' : ''),
  },
  appgroups: {
    key: 'appgroups',
    label: 'Application groups',
    icon: 'group',
    sub: 'Add and remove multiple application, access or SSO group memberships in one request.',
    intro: 'Membership is evaluated against segregation-of-duties policy before it reaches an approver. Privileged groups add a security review to the chain, and time-bound grants expire without a further request.',
    submitLabel: 'Submit request',
    sections: [
      {
        id: 'identity',
        title: 'Identity',
        sub: 'Who receives or loses the membership',
        fields: [
          { id: 'userId', label: 'Identity', kind: 'select', required: true, options: IDENTITY_OPTIONS, placeholder: 'Search the directory', span: 2 },
        ],
      },
      {
        id: 'membership',
        title: 'Membership changes',
        sub: 'Mark every group to add and every group to remove — all of it travels as one request',
        fields: [
          { id: 'groupChanges', label: 'Groups', kind: 'groupdual', value: { add: [], remove: [] }, span: 2 },
          /* "30 days / 60 days / Until project close" made the requester pick a
             label and left the approver to work out what date it meant. A grant
             is either permanent or it runs between two dates; both approver and
             provisioning read the dates directly. Removals are unaffected —
             they are always permanent. */
          { id: 'permanent', label: 'Permanent access', kind: 'checkbox', value: '', span: 2, checkboxLabel: 'This membership does not expire', hint: 'Permanent grants count against the standing-privilege posture and are attested every quarter. Leave it off to grant access for a fixed window.' },
          { id: 'startDate', label: 'Access from', kind: 'date', required: true, showIf: (v) => !v.permanent, hint: 'The membership is provisioned on this date.' },
          { id: 'endDate', label: 'Access until', kind: 'date', required: true, showIf: (v) => !v.permanent, hint: 'The membership is withdrawn automatically at the end of this day.' },
          { id: 'application', label: 'Application context', kind: 'select', options: APPLICATION_OPTIONS, placeholder: 'Optional', span: 2 },
        ],
      },
      {
        id: 'why',
        title: 'Justification',
        sub: 'What approvers read before deciding',
        fields: [
          { id: 'justification', label: 'Business justification', kind: 'textarea', span: 2, required: true, placeholder: 'The task this membership unblocks and how long it is needed.' },
        ],
      },
    ],
    build: (v) => {
      const u = userOf(v.userId)
      const gc = v.groupChanges || {}
      const adds = gc.add || []
      const rems = gc.remove || []
      const sod = adds.some((name) => { const g = groupOf(name); return Boolean(g && g.sodFlags) })
      return {
        username: u ? u.username : 'UNKNOWN',
        userId: u ? u.id : null,
        target: adds[0] || rems[0] || '',
        risk: sod ? 'high' : adds.length > 0 ? 'medium' : 'low',
        sodConflict: sod,
        detail: `Add ${adds.length} · Remove ${rems.length} · ${grantWindow(v)}${v.application ? ` · ${v.application}` : ''}`,
        addGroups: adds,
        removeGroups: rems,
        changes: [
          ...adds.map((name) => ({ id: `add-${name}`, field: 'Group membership', from: 'Not held', to: name, kind: 'add' })),
          ...rems.map((name) => ({ id: `rem-${name}`, field: 'Group membership', from: name, to: 'Removed', kind: 'remove' })),
        ],
      }
    },
    validate: (v, built) => (!v.userId
      ? 'Select the identity receiving or losing membership.'
      : built.addGroups.length + built.removeGroups.length === 0 ? 'Select at least one group to add or remove.' : ''),
  },
  mfareset: {
    key: 'mfareset',
    label: 'MFA reset',
    icon: 'shield',
    sub: 'Clear enrolled authentication factors so the identity can re-enrol.',
    intro: 'Resetting factors forces re-enrollment at the next sign-in and invalidates active sessions. A compromised factor short-circuits the chain straight to security review.',
    submitLabel: 'Submit reset',
    sections: [
      {
        id: 'identity',
        title: 'Identity',
        sub: 'Whose factors are cleared',
        fields: [
          { id: 'userId', label: 'Identity', kind: 'select', required: true, options: IDENTITY_OPTIONS, placeholder: 'Search the directory', span: 2 },
        ],
      },
      {
        id: 'factors',
        title: 'Factors to clear',
        sub: 'What is removed and why',
        fields: [
          /* Was a single select whose first option was "All factors", so
             clearing two of three was not expressible. Each enrolled factor is
             its own choice now. */
          { id: 'factors', label: 'Factors to clear', kind: 'factors', required: true, value: [], span: 2, hint: 'Only the factors this identity has actually enrolled are listed.' },
          { id: 'reason', label: 'Reason', kind: 'select', required: true, options: MFA_REASONS, value: MFA_REASONS[0] },
          { id: 'verified', label: 'Identity verification', kind: 'select', required: true, options: ['Verified in person', 'Verified by manager', 'Verified by helpdesk script', 'Not yet verified'], value: 'Verified by helpdesk script', span: 2 },
          { id: 'revokeSessions', label: 'Active sessions', kind: 'select', options: ['Revoke every session', 'Leave sessions running'], value: 'Revoke every session', span: 2 },
        ],
      },
      {
        id: 'why',
        title: 'Justification',
        sub: 'What approvers read before deciding',
        fields: [
          { id: 'justification', label: 'Business justification', kind: 'textarea', span: 2, required: true, placeholder: 'How the requester confirmed the identity of the person asking.' },
        ],
      },
    ],
    build: (v) => {
      const u = userOf(v.userId)
      return {
        username: u ? u.username : 'UNKNOWN',
        userId: u ? u.id : null,
        target: 'MFA_FACTORS',
        risk: v.reason === 'Compromised factor' || v.verified === 'Not yet verified' ? 'high' : 'medium',
        sodConflict: false,
        detail: `${factorText(v.factors)} · ${v.reason} · ${v.verified}`,
      }
    },
  },
  other: {
    key: 'other',
    label: 'Other',
    icon: 'request',
    sub: 'Anything the typed forms do not cover, routed to the same approval chain.',
    intro: 'Free-form requests still carry a risk score and a full audit trail. Be specific: approvers see only what is written here, and cannot open the originating conversation.',
    submitLabel: 'Submit request',
    sections: [
      {
        id: 'request',
        title: 'What is being asked for',
        sub: 'Enough for an approver to decide without asking',
        fields: [
          { id: 'subject', label: 'Subject', kind: 'text', required: true, placeholder: 'Short summary of the request', span: 2 },
          { id: 'category', label: 'Category', kind: 'select', required: true, options: OTHER_CATEGORIES, value: OTHER_CATEGORIES[0] },
          { id: 'system', label: 'System involved', kind: 'select', options: APPLICATION_OPTIONS, placeholder: 'Optional' },
          { id: 'userId', label: 'Username', kind: 'select', required: true, options: IDENTITY_OPTIONS, placeholder: `Defaults to ${ME.username}`, span: 2, hint: 'The identity the request is raised for.' },
        ],
      },
      {
        id: 'why',
        title: 'Justification',
        sub: 'What approvers read before deciding',
        fields: [
          { id: 'urgency', label: 'Urgency', kind: 'select', options: URGENCIES, value: URGENCIES[0], hint: 'Emergency shortens the service level to four hours and notifies security.' },
          { id: 'neededBy', label: 'Needed by', kind: 'date' },
          { id: 'justification', label: 'Request', kind: 'textarea', span: 2, required: true, placeholder: 'What is needed, why, and by when.' },
          { id: 'documents', label: 'Upload document', kind: 'file', span: 2, hint: 'Optional. Anything an approver needs in order to decide.' },
        ],
      },
    ],
    build: (v) => {
      const u = v.userId ? userOf(v.userId) : null
      return {
        username: u ? u.username : ME.username,
        userId: u ? u.id : ME.id,
        target: slug(v.subject, 'REQUEST'),
        risk: v.urgency === 'Emergency' ? 'high' : v.category === 'Policy exception' ? 'high' : v.category === 'Data' ? 'medium' : 'low',
        sodConflict: false,
        detail: `${v.category || 'Other'}${v.system ? ` · ${v.system}` : ''}${v.urgency && v.urgency !== 'Standard' ? ` · ${v.urgency}` : ''}${(v.documents || []).length ? ` · ${v.documents.length} document${v.documents.length === 1 ? '' : 's'}` : ''}`,
        documents: v.documents || [],
      }
    },
  },
}

export const TYPE_ORDER = ['adduser', 'modifyuser', 'appgroups', 'mfareset', 'other']
export const TYPE_FILTERS = [
  ...TYPE_ORDER.map((k) => TYPE_SPECS[k].label),
  'New access', 'Role change', 'Application group', 'Emergency access',
]

/* Array and object defaults (the multi-select, dual picker and attribute grid)
   are cloned so a form never shares state with the spec literal or another form. */
const cloneDefault = (v) => {
  if (Array.isArray(v)) return [...v]
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cloneDefault(x)]))
  return v || ''
}
export const defaultsFor = (spec) => Object.fromEntries(
  spec.sections.flatMap((s) => s.fields.map((f) => [f.id, cloneDefault(f.value)])),
)
export const fieldsOf = (spec) => spec.sections.flatMap((s) => s.fields)

export const policyChecks = (spec, v) => {
  const u = v.userId ? userOf(v.userId) : null
  const out = []
  if (spec.key === 'appgroups') {
    const gc = v.groupChanges || {}
    const adds = gc.add || []
    const rems = gc.remove || []
    const flagged = adds.map(groupOf).filter((g) => g && g.sodFlags)
    out.push({
      id: 'sod',
      tone: flagged.length ? 'bad' : 'ok',
      label: 'Segregation of duties',
      detail: flagged.length
        ? `${flagged.map((g) => g.name).join(', ')} participate${flagged.length === 1 ? 's' : ''} in anti-affinity rules. A conflict will be raised on submission.`
        : adds.length ? `${adds.length === 1 ? adds[0] : `None of the ${adds.length} additions`} conflict${adds.length === 1 ? 's' : ''} with anything this identity holds.` : 'Mark groups to add to run the pre-check.',
    })
    const badWindow = !v.permanent && v.startDate && v.endDate && v.endDate <= v.startDate
    out.push({
      id: 'dur',
      tone: badWindow ? 'bad' : adds.length && v.permanent ? 'warn' : 'ok',
      label: 'Grant lifetime',
      detail: adds.length === 0
        ? rems.length ? 'Removals only — nothing new is granted, and removed memberships do not return automatically.' : 'Nothing selected yet.'
        : badWindow
          ? 'The end date is on or before the start date, so the grant would expire before it began.'
          : v.permanent
            ? 'Permanent grants count against the standing-privilege posture score and must be attested every quarter.'
            : !v.startDate || !v.endDate
              ? 'Set both dates, or mark the access permanent.'
              : `${adds.length === 1 ? 'The addition runs' : `All ${adds.length} additions run`} from ${v.startDate} to ${v.endDate} and is withdrawn automatically.`,
    })
    if (rems.length) {
      out.push({
        id: 'rem',
        tone: 'ok',
        label: 'Removals',
        detail: `${rems.join(', ')} ${rems.length === 1 ? 'is' : 'are'} deprovisioned from every mapped target on approval. Least privilege is improved.`,
      })
    }
  }
  if (spec.key === 'adduser') {
    out.push({
      id: 'dup',
      tone: 'ok',
      label: 'Duplicate check',
      detail: v.email && USERS.some((x) => x.email.toLowerCase() === String(v.email).toLowerCase())
        ? 'An identity already exists with this email. Submission will be rejected by the directory.'
        : 'No existing identity matches the supplied email.',
    })
    out.push({
      id: 'contract',
      tone: (v.employeeType === 'Contractor' || v.employeeType === 'External') && !v.endDate ? 'warn' : 'ok',
      label: 'Contract end date',
      detail: (v.employeeType === 'Contractor' || v.employeeType === 'External') && !v.endDate
        ? 'External and contractor identities require an end date. Without one the 90-day expiry policy applies.'
        : 'Lifecycle end date is set or not required for this employee type.',
    })
    const ent = Array.isArray(v.entitlements) ? v.entitlements : []
    const flaggedEnt = ent.map(groupOf).filter((g) => g && g.sodFlags)
    out.push({
      id: 'ent',
      tone: flaggedEnt.length ? 'bad' : ent.length ? 'warn' : 'ok',
      label: 'Requested entitlements',
      detail: flaggedEnt.length
        ? `${flaggedEnt.map((g) => g.name).join(', ')} carr${flaggedEnt.length === 1 ? 'ies' : 'y'} segregation-of-duties rules. Security review is added to the chain.`
        : ent.length
          ? `${ent.length} entitlement${ent.length === 1 ? '' : 's'} beyond the birthright bundle. A resource-owner level is added to the chain.`
          : 'Only the birthright bundle is granted at start.',
    })
  }
  if (spec.key === 'mfareset') {
    out.push({
      id: 'verify',
      tone: v.verified === 'Not yet verified' ? 'bad' : 'ok',
      label: 'Identity verification',
      detail: v.verified === 'Not yet verified'
        ? 'Unverified resets are the most common social-engineering vector. Security review is mandatory.'
        : `${v.verified}. Recorded on the request for audit sampling.`,
    })
    out.push({
      id: 'enrolled',
      tone: 'ok',
      label: 'Current enrollment',
      detail: u
        ? `${u.username} holds ${factorsFor(u).length} active factors.`
        : 'Select an identity to read its current factors.',
    })
  }
  if (spec.key === 'modifyuser') {
    const changes = stagedChanges(v)
    const dynamic = changes.filter((c) => c.id === 'organization' || c.id === 'department' || c.id === 'manager')
    out.push({
      id: 'policy',
      tone: dynamic.length ? 'warn' : 'ok',
      label: 'Dynamic policy impact',
      detail: dynamic.length
        ? `${dynamic.map((c) => c.field).join(', ')} drive${dynamic.length === 1 ? 's' : ''} dynamic policy. The change re-evaluates every policy and can add or remove entitlements without a further request.`
        : changes.length ? 'No dynamic policy keys off the staged attributes.' : 'Stage an attribute change to run the pre-check.',
    })
    out.push({
      id: 'replay',
      tone: 'ok',
      label: 'Connector replay',
      detail: changes.length
        ? `${changes.length} attribute change${changes.length === 1 ? ' is' : 's are'} written to every connector that maps the field${changes.length === 1 ? '' : 's'} on the next provisioning run.`
        : 'Staged changes are written to every connector that maps the fields on the next provisioning run.',
    })
  }
  if (spec.key === 'other') {
    out.push({
      id: 'urg',
      tone: v.urgency === 'Emergency' ? 'warn' : 'ok',
      label: 'Service level',
      detail: v.urgency === 'Emergency'
        ? 'Emergency requests carry a four-hour decision window and notify the security on-call.'
        : 'Standard requests carry a 48-hour decision window.',
    })
  }
  return out
}
