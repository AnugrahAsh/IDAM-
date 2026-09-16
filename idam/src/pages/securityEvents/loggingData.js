/* Logging module data.
 *
 * Two concerns, matching the running application: which activity is written to
 * the audit log at all, and what the platform is capable of capturing event by
 * event. Retention is not a third: it is a property of each captured event,
 * carried on the register below rather than governed table by table.
 */

/* ------------------------------------------------- audit log configuration */

// Every module can write several kinds of record. Which of them are actually
// retained is configurable, because an audit log that captures everything is
// expensive and an audit log that captures nothing is useless.
const SUB_MODULES = ['Create', 'Modify', 'Delete', 'View', 'Export']

/**
 * The five operations in the administrator's words.
 *
 * The stored row carries a module name and an operation, which says nothing
 * about what a record would contain. `line` composes the visible sentence from
 * the module's own subject, so the screen states what is recorded rather than
 * naming a flag; `detail` is the follow-up only some readers want and hangs off
 * a tooltip.
 */
export const AUDIT_OPERATIONS = [
  {
    id: 'Create',
    label: 'Create',
    icon: 'plus',
    line: (s) => `Records new ${s} as they are created, with who created them and the values set at the start.`,
    detail: 'Written the moment the record first exists. The entry keeps the actor, the time, the source address and the initial values.',
  },
  {
    id: 'Modify',
    label: 'Modify',
    icon: 'edit',
    line: (s) => `Records changes to ${s}, with the values held before and after each edit.`,
    detail: 'Written on every successful edit. Keeping the old value beside the new one is what lets a change be explained or reversed later.',
  },
  {
    id: 'Delete',
    label: 'Delete',
    icon: 'trash',
    line: (s) => `Records ${s} being deleted, with who deleted them and what the record held at the time.`,
    detail: 'Written when the record is removed. The deleted content is copied into the audit entry, because the record itself is gone.',
  },
  {
    id: 'View',
    label: 'View',
    icon: 'eye',
    line: (s) => `Records who opened ${s} to read them, and when.`,
    detail: 'Read access is the highest-volume event on the platform. Keep it where looking at the data is itself sensitive, rather than everywhere.',
  },
  {
    id: 'Export',
    label: 'Export',
    icon: 'download',
    line: (s) => `Records ${s} leaving the platform as a download or extract, with the format and the number of rows taken.`,
    detail: 'Written when data is taken out as CSV, PDF or an API extract. The entry holds what was asked for and how much came back, not the exported data itself.',
  },
]

/**
 * Audit configuration, grouped the way an operator thinks about it.
 *
 * `subject` is the thing the module keeps records about, and every operation
 * sentence is built from it. A module whose subject will not read naturally in
 * one of those sentences carries its own `ops` line for that operation instead.
 */
export const AUDIT_GROUPS = [
  {
    id: 'identity',
    label: 'Identity lifecycle',
    icon: 'users',
    blurb: 'Who exists on the platform, which organization they belong to, and where they sit in the hierarchy.',
    modules: [
      { name: 'Users', subject: 'user accounts', covers: 'Accounts held for the people who sign in.' },
      { name: 'Organizations', subject: 'organizations', covers: 'The organizations and tenants an identity can belong to.' },
      { name: 'Org Hierarchy', subject: 'positions in the organization hierarchy', covers: 'Reporting lines and the structure identities sit in.' },
      {
        name: 'My Profile',
        subject: 'self-service profile details',
        covers: 'The screen where a person maintains their own record.',
        ops: {
          Create: 'Records a person adding details to their own profile for the first time, such as a contact number or a photograph.',
          Modify: 'Records a person editing their own profile, with the values held before and after the change.',
          Delete: 'Records a person removing details from their own profile, and what was held before they went.',
          View: 'Records a person opening their own profile. This fires in almost every session and is rarely worth keeping.',
          Export: 'Records a person downloading a copy of their own profile data, which is what a subject access request produces.',
        },
      },
    ],
  },
  {
    id: 'access',
    label: 'Entitlement and access',
    icon: 'roles',
    blurb: 'What people are entitled to: group membership, roles, the requests and approvals that grant them, and the rules that keep conflicting duties apart.',
    modules: [
      { name: 'Access Groups', subject: 'access groups and their membership', covers: 'Groups that carry entitlements, and who is in them.' },
      { name: 'Roles', subject: 'roles and the entitlements they carry', covers: 'Role definitions and what each one grants.' },
      { name: 'Access Requests', subject: 'access requests', covers: 'Requests raised for access, from submission to closure.' },
      {
        name: 'Approvals',
        subject: 'approval decisions',
        covers: 'Who approved or rejected a request, and on what authority.',
        ops: {
          Create: 'Records each approval decision as it is taken, with the approver, the outcome and any comment left.',
          Modify: 'Records an approval decision being reassigned or overturned afterwards, with the values before and after.',
        },
      },
      { name: 'Segregation of Duties', subject: 'segregation-of-duties rules', covers: 'Rules that stop one person holding two conflicting entitlements.' },
    ],
  },
  {
    id: 'applications',
    label: 'Applications and provisioning',
    icon: 'apps',
    blurb: 'Connected applications and directories, and the accounts the platform creates and reconciles on them.',
    modules: [
      { name: 'SSO Applications', subject: 'single sign-on application registrations', covers: 'Applications that trust the platform to sign users in.' },
      { name: 'Provisioning', subject: 'provisioning rules and target accounts', covers: 'Rules that push accounts out to connected systems.' },
      { name: 'LDAP Directories', subject: 'directory connections', covers: 'Connections to LDAP and Active Directory sources.' },
      { name: 'Trust Reconciliation', subject: 'reconciliation definitions and their findings', covers: 'Comparisons between platform records and what a target system actually holds.' },
    ],
  },
  {
    id: 'security',
    label: 'Security controls',
    icon: 'shield',
    blurb: 'The controls that decide whether a sign-in is allowed: second factors, password rules, network restrictions and conditional policy.',
    modules: [
      { name: 'Multi-Factor Authentication', subject: 'second-factor methods and enrolments', covers: 'Which second factors are offered, and who is enrolled on them.' },
      { name: 'Password Policy', subject: 'password rules', covers: 'Length, complexity, history and expiry rules for passwords.' },
      { name: 'Network Restrictions', subject: 'network and address restrictions', covers: 'Which addresses and ranges are allowed to reach the platform.' },
      { name: 'Dynamic Policy', subject: 'conditional access policies', covers: 'Rules that decide access from context — device, location and risk.' },
      { name: 'Sign-On Policy', subject: 'sign-on policies, their rules and attached applications', covers: 'Ordered allow and deny rules evaluated at sign-in, and the applications each policy governs.' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform administration',
    icon: 'config',
    blurb: 'Administrative work on the platform itself — configuration, scheduled work, notifications, reports, licensing and logging.',
    modules: [
      { name: 'Configurations', subject: 'platform configuration settings', covers: 'Tenant-wide settings that change how the platform behaves.' },
      { name: 'Schedulers', subject: 'schedules', covers: 'When recurring work is set to run.' },
      { name: 'Jobs', subject: 'job definitions and their runs', covers: 'Background work the platform runs, and how each run ended.' },
      { name: 'Notifications', subject: 'notification rules and templates', covers: 'What the platform notifies people about, and in what words.' },
      { name: 'Communications', subject: 'email and SMS delivery settings', covers: 'The gateways and templates used to reach people.' },
      { name: 'Reports', subject: 'report definitions', covers: 'Saved reports, and who is allowed to run them.' },
      { name: 'License', subject: 'license records and allocations', covers: 'Entitlement counts and how they are allocated.' },
      { name: 'Logging', subject: 'logging and audit configuration', covers: 'The settings on this screen, and the rest of the logging module.' },
    ],
  },
]

// Everything is on by default except the read paths, which are the noisy ones.
export const auditRows = () => AUDIT_GROUPS.flatMap((g) => g.modules
  .flatMap((m, mi) => SUB_MODULES.map((sub, si) => ({
    id: `${g.id}-${mi}-${si}`,
    group: g.id,
    module: m.name,
    sub,
    active: !(sub === 'View' || (sub === 'Export' && si % 2 === 0)),
  }))))

const AUDIT_OPERATION = Object.fromEntries(AUDIT_OPERATIONS.map((o) => [o.id, o]))
const AUDIT_MODULE = Object.fromEntries(AUDIT_GROUPS.flatMap((g) => g.modules.map((m) => [m.name, m])))

/** What one configured row records, in words an operator can act on. */
export const auditEventCopy = (row) => {
  const op = AUDIT_OPERATION[row.sub]
  const mod = AUDIT_MODULE[row.module]
  return {
    label: op.label,
    icon: op.icon,
    line: (mod.ops && mod.ops[row.sub]) || op.line(mod.subject),
    detail: op.detail,
  }
}

/** The module blurb, used both as a heading line and as filter text. */
export const auditModuleCopy = (name) => AUDIT_MODULE[name]

/* ------------------------------------------------ per-event capture register */

/**
 * What the platform is capable of capturing, event by event.
 *
 * A single "audit trail" toggle cannot express a retention rule that is
 * mandated per event class — "keep privilege changes for seven years, sign-ins
 * for ninety days" is a normal regulatory requirement. So every capturable
 * event carries its own switch and its own rotation and archival policy, and
 * the global defaults act as the baseline that an event may override.
 */
export const CAPTURE_CATEGORIES = [
  {
    id: 'audit', label: 'Audit and compliance',
    events: [
      ['ADMIN_ACTION', 'Administrator action', 2555],
      ['CONFIG_CHANGE', 'Configuration change', 2555],
      ['PERMISSION_CHANGE', 'Permission change', 2555],
      ['ROLE_CHANGE', 'Role definition change', 2555],
      ['EXPORT', 'Data export', 1825],
      ['REPORT_RUN', 'Report execution', 365],
      ['CONSENT_CAPTURED', 'Consent captured', 2555],
      ['EVIDENCE_PACK', 'Evidence pack generated', 2555],
    ],
  },
  {
    id: 'lifecycle', label: 'User lifecycle',
    events: [
      ['USER_CREATED', 'Identity created', 2555],
      ['USER_MODIFIED', 'Identity modified', 1825],
      ['USER_DELETED', 'Identity deleted', 2555],
      ['USER_ACTIVATED', 'Identity activated', 1825],
      ['USER_DEACTIVATED', 'Identity deactivated', 1825],
      ['USER_LOCKED', 'Account locked', 730],
      ['USER_IMPORTED', 'Bulk import', 1825],
      ['LEAVER_PROCESSED', 'Leaver processed', 2555],
    ],
  },
  {
    id: 'authz', label: 'Authorization and privilege changes',
    events: [
      ['GROUP_ADDED', 'Group membership granted', 2555],
      ['GROUP_REMOVED', 'Group membership revoked', 2555],
      ['ROLE_ASSIGNED', 'Role assigned', 2555],
      ['ROLE_REVOKED', 'Role revoked', 2555],
      ['PRIVILEGE_ESCALATION', 'Privilege escalation', 2555],
      ['SOD_EXCEPTION', 'Segregation-of-duties exception granted', 2555],
      ['APPROVAL_DECISION', 'Approval decision', 2555],
      ['POLICY_EVALUATION', 'Dynamic policy evaluation', 90],
    ],
  },
  {
    id: 'authn', label: 'Authentication',
    events: [
      ['SIGNIN_SUCCESS', 'Sign-in succeeded', 90],
      ['SIGNIN_FAILURE', 'Sign-in failed', 365],
      ['MFA_CHALLENGE', 'Second factor challenged', 90],
      ['MFA_ENROLLED', 'Second factor enrolled', 730],
      ['MFA_RESET', 'Second factor reset', 730],
      ['PASSWORD_CHANGED', 'Password changed', 730],
      ['PASSWORD_RESET', 'Password reset requested', 365],
      ['SESSION_REVOKED', 'Session revoked', 365],
      ['DEVICE_ENROLLED', 'Device enrolled', 365],
      ['IP_BLOCKED', 'Sign-in blocked by network policy', 365],
    ],
  },
  {
    id: 'provisioning', label: 'Provisioning and directories',
    events: [
      ['ACCOUNT_PROVISIONED', 'Account provisioned on a target', 1825],
      ['ACCOUNT_DEPROVISIONED', 'Account deprovisioned', 2555],
      ['RECON_RUN', 'Reconciliation run', 365],
      ['ORPHAN_DETECTED', 'Orphaned account detected', 730],
      ['LDAP_BIND', 'Directory bind', 30],
      ['LDAP_SYNC', 'Directory synchronization', 365],
      ['CONNECTOR_ERROR', 'Connector error', 365],
    ],
  },
  {
    id: 'comms', label: 'Communications',
    events: [
      ['EMAIL_SENT', 'Email dispatched', 180],
      ['EMAIL_FAILED', 'Email failed', 365],
      ['SMS_SENT', 'SMS dispatched', 180],
      ['SMS_OTP', 'SMS one-time code issued', 30],
      ['NOTIFICATION_PUBLISHED', 'Notification published', 180],
    ],
  },
]

export const ROTATION_TYPES = ['By size', 'By date']

/* Sensible defaults per class: high-volume operational events rotate on size,
   evidence-grade events rotate daily so a day's file is a unit of evidence. */
export const captureRows = () => CAPTURE_CATEGORIES.flatMap((c) => c.events.map(([code, label, archival], i) => ({
  id: `${c.id}:${code}`,
  code,
  label,
  category: c.id,
  categoryLabel: c.label,
  captured: !(c.id === 'provisioning' && code === 'LDAP_BIND'),
  fileSizeMb: c.id === 'authn' || c.id === 'comms' ? 100 : 50,
  maxFiles: c.id === 'audit' || c.id === 'authz' ? 40 : 20,
  rotation: c.id === 'audit' || c.id === 'authz' ? 'By date' : 'By size',
  archivalDays: archival,
  overrides: (c.id === 'audit' || c.id === 'authz') && i % 3 === 0,
})))

export const CAPTURE_CATEGORY_LABEL = Object.fromEntries(CAPTURE_CATEGORIES.map((c) => [c.id, c.label]))

export const CAPTURE_TOTAL = CAPTURE_CATEGORIES.reduce((a, c) => a + c.events.length, 0)

/** Human rendering of an archival period an auditor will read out loud. */
export const archivalLabel = (days) => {
  if (days % 365 === 0) {
    const y = days / 365
    return `${y} year${y === 1 ? '' : 's'}`
  }
  if (days >= 365) return `${(days / 365).toFixed(1)} years`
  if (days % 30 === 0) return `${days / 30} months`
  return `${days} days`
}
