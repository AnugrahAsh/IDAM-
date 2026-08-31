export const BASE = '/iam'

export const ROUTES = [
  { id: 'login', path: '/iam/login', label: 'Sign in', icon: 'lock' },
  { id: 'myapps', path: '/iam/myapps', label: 'My Apps', icon: 'apps' },
  { id: 'notifications', path: '/iam/notifications', label: 'Notifications', icon: 'bell' },
  { id: 'usefullinks', path: '/iam/usefullinks', label: 'Useful Links', icon: 'link' },
  { id: 'users', path: '/iam/users', label: 'Users', icon: 'user', detail: true },
  { id: 'organizations', path: '/iam/organizations', label: 'Organizations', icon: 'building', detail: true },
  { id: 'roles', path: '/iam/roles', label: 'Roles', icon: 'roles', detail: true },
  { id: 'approvals', path: '/iam/approvals', label: 'Approvals', icon: 'approve', detail: true },
  { id: 'organizationHierarchy', path: '/iam/organizationHierarchy', label: 'Organizational Hierarchy', icon: 'hierarchy' },
  { id: 'orphanedpolicy', path: '/iam/orphanedpolicy', label: 'Orphaned Accounts', icon: 'orphan', detail: true },
  { id: 'requests', path: '/iam/requests', label: 'Access Requests', icon: 'request', detail: true },
  { id: 'mfa', path: '/iam/mfa', label: 'Multi-Factor Authentication', icon: 'shield', detail: true },
  { id: 'groups', path: '/iam/groups', label: 'Groups', icon: 'group', detail: true },
  { id: 'dynamicPolicy', path: '/iam/dynamicPolicy', label: 'Dynamic Policies', icon: 'policy', detail: true },
  { id: 'segregationofduties', path: '/iam/segregationofduties/rules', label: 'Segregation of Duties', icon: 'sod', detail: true },
  { id: 'applications', path: '/iam/applications', label: 'Applications', icon: 'provision', detail: true },
  { id: 'attributeConfigurations', path: '/iam/attributeConfigurations', label: 'Attribute Configuration', icon: 'swap' },
  { id: 'trustReconciliation', path: '/iam/trustReconciliation', label: 'Trust Reconciliation', icon: 'recon', detail: true },
  { id: 'ldapapplications', path: '/iam/ldapapplications', label: 'LDAP Applications', icon: 'directory', detail: true },
  { id: 'ipRestrictionPolicy', path: '/iam/ip/restriction/policy', label: 'IP Restriction Policy', icon: 'noentry', detail: true },
  { id: 'schedulers', path: '/iam/schedulers', label: 'Schedulers', icon: 'clock', detail: true },
  { id: 'recertification', path: '/iam/recertification', label: 'Recertification', icon: 'certify', detail: true },
  { id: 'reports', path: '/iam/reports', label: 'Reports', icon: 'report' },
  { id: 'passwordPolicy', path: '/iam/passwordPolicy', label: 'Password Policy', icon: 'lock', detail: true },
  { id: 'jobs', path: '/iam/jobs', label: 'Jobs', icon: 'jobs', detail: true },
  { id: 'configurations', path: '/iam/configurations', label: 'Configurations', icon: 'sliders', detail: true },
  { id: 'ssoConfigurations', path: '/iam/ssoConfigurations', label: 'SSO Configurations', icon: 'sso' },
  { id: 'notificationManagement', path: '/iam/notifications/management', label: 'Notification Management', icon: 'bell', detail: true },
  { id: 'usefullinksManagement', path: '/iam/usefullinks/management', label: 'Useful Links Management', icon: 'link', detail: true },
  { id: 'emails', path: '/iam/emails', label: 'Email Management', icon: 'mail', detail: true },
  { id: 'emailConfigurations', path: '/iam/emailConfigurations', label: 'Email Configuration', icon: 'sliders' },
  { id: 'emailTemplates', path: '/iam/emailTemplates', label: 'Email Templates', icon: 'file', detail: true },
  { id: 'sms', path: '/iam/sms', label: 'SMS Management', icon: 'sms', detail: true },
  { id: 'smsTemplates', path: '/iam/smsTemplates', label: 'SMS Templates', icon: 'file', detail: true },
  { id: 'consent', path: '/iam/consent', label: 'Consent Management', icon: 'consent', detail: true },
  { id: 'consentPolicies', path: '/iam/consentPolicies', label: 'Consent Policies', icon: 'policy' },
  { id: 'consentTemplates', path: '/iam/consentTemplates', label: 'Consent Templates', icon: 'file' },
  { id: 'consentRecords', path: '/iam/consentRecords', label: 'Consent Records', icon: 'file', detail: true },
  { id: 'syslogs', path: '/iam/syslogs', label: 'Logging', icon: 'logs', detail: true },
  { id: 'licenses', path: '/iam/licenses', label: 'License', icon: 'license' },
  { id: 'profile', path: '/iam/profile', label: 'My Profile', icon: 'user' },
  { id: 'settings', path: '/iam/settings', label: 'Settings', icon: 'config' },
]

export const BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]))
export const BY_PATH = Object.fromEntries(ROUTES.map((r) => [r.path, r]))
export const DETAIL_ROUTES = ROUTES.filter((r) => r.detail).sort((a, b) => b.path.length - a.path.length)
export const TITLES = Object.fromEntries(ROUTES.map((r) => [r.id, r.label]))
export const pathFor = (id) => (BY_ID[id] ? BY_ID[id].path : `${BASE}/myapps`)

export const NAV = [
  {
    id: 'core',
    label: 'Core',
    icon: 'apps',
    items: [
      'myapps', 'notifications', 'usefullinks', 'users', 'organizations', 'roles',
      'approvals', 'organizationHierarchy', 'orphanedpolicy', 'requests', 'mfa',
    ],
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: 'group',
    items: ['groups', 'dynamicPolicy', 'segregationofduties'],
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: 'provision',
    items: [
      'applications', 'attributeConfigurations', 'trustReconciliation', 'ldapapplications',
      'ipRestrictionPolicy',
    ],
  },
  { id: 'schedulers', label: 'Schedulers', icon: 'clock', items: ['schedulers'] },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'report',
    items: [
      'recertification', 'reports', 'passwordPolicy', 'jobs',
      'configurations', 'ssoConfigurations', 'notificationManagement', 'usefullinksManagement',
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: 'mail',
    items: ['emails', 'sms', 'consent'],
  },
  { id: 'logging', label: 'Logging', icon: 'logs', items: ['syslogs', 'licenses'] },
  { id: 'system', label: 'System', icon: 'config', items: ['settings'] },
]

export const NAV_BADGES = {
  notifications: 'notifications',
  approvals: 'approvals',
  orphanedpolicy: 'orphan',
  segregationofduties: 'sod',
  applications: 'provisioning',
  recertification: 'recert',
  jobs: 'jobs',
  syslogs: 'logs',
}

export const LEGACY = {
  '/iam': '/iam/users',
  '/iam/': '/iam/users',
  // The dictionary is a tab of the Password Policy section now, not a screen
  // of its own. Existing links and bookmarks land on the tab.
  '/iam/passwordDictionary': '/iam/passwordPolicy/dictionary',
  '/iam/hierarchy': '/iam/organizationHierarchy',
  '/iam/orphaned': '/iam/orphanedpolicy',
  '/iam/policies': '/iam/dynamicPolicy',
  '/iam/sod': '/iam/segregationofduties/rules',
  '/iam/provisioning': '/iam/applications',
  '/iam/provisionapplications': '/iam/applications',
  '/iam/ssoApplications': '/iam/applications',
  '/iam/reconciliation': '/iam/trustReconciliation',
  '/iam/directories': '/iam/ldapapplications',
  '/iam/ldapConfigurations': '/iam/ldapapplications',
  '/iam/sso': '/iam/applications',
  '/iam/attributeConfiguration': '/iam/attributeConfigurations',
  '/iam/attributes': '/iam/attributeConfigurations',
  '/iam/linkage': '/iam/applications',
  '/iam/application/linkage': '/iam/applications',
  '/iam/applicationGroups': '/iam/groups',
  '/iam/accessApplicationGroups': '/iam/groups',
  '/iam/ssoAccessApplicationGroups': '/iam/groups',
  '/iam/ipPolicy': '/iam/ip/restriction/policy',
  '/iam/logs': '/iam/syslogs',
  '/iam/license': '/iam/licenses',
  '/iam/usefulLinks': '/iam/usefullinks',
  '/iam/myprofile': '/iam/profile',
  '/iam/communications': '/iam/emails',
  '/iam/emailConfigurations': '/iam/emails/configuration',
  '/iam/emailTemplates': '/iam/emails/templates',
  '/iam/smsTemplates': '/iam/sms/providers',
  '/iam/consentPolicies': '/iam/consent/policies',
  '/iam/consentTemplates': '/iam/consent/templates',
  '/iam/consentRecords': '/iam/consent/records',
}
