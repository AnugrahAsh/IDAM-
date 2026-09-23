export const BASE = '/iam'

/* Reached from a recertification email by someone who may not hold a console
   session, so it sits outside the sign-in gate and the console shell. */
export const RECERTIFY_LINK_BASE = `${BASE}/recertify`
export const isRecertifyLinkPath = (pathname) => String(pathname || '').startsWith(`${RECERTIFY_LINK_BASE}/`)

export const ROUTES = [
  { id: 'login', path: '/iam/login', label: 'Sign in', icon: 'lock' },
  // Reached from the sign-in screen by someone the directory does not know yet,
  // so it is public: it renders without a session and without the shell.
  { id: 'selfEnrollment', path: '/iam/selfEnrollment', label: 'Self-Enrollment', icon: 'user' },
  // The administrator's analytics overview. My Apps stays the landing page:
  // it is the one screen every identity may open.
  { id: 'dashboard', path: '/iam/dashboard', label: 'Dashboard', icon: 'dashboard', module: 'Dashboard' },
  { id: 'myapps', path: '/iam/myapps', label: 'My Apps', icon: 'apps', module: 'My Apps' },
  // Notification Center and Quick Links each own their management surface as a
  // full-page `/manage` view, so both are detail routes rather than leaves.
  { id: 'notifications', path: '/iam/notifications', label: 'Notification Center', icon: 'bell', detail: true, module: 'Notification Center' },
  { id: 'usefullinks', path: '/iam/usefullinks', label: 'Quick Links', icon: 'link', detail: true, module: 'Quick Links' },
  { id: 'users', path: '/iam/users', label: 'Users', icon: 'user', detail: true, module: 'Users' },
  { id: 'organizations', path: '/iam/organizations', label: 'Organizations', icon: 'building', detail: true, module: 'Organizations' },
  { id: 'roles', path: '/iam/roles', label: 'Roles', icon: 'roles', detail: true, module: 'Roles' },
  { id: 'approvals', path: '/iam/approvals', label: 'Approvals', icon: 'approve', detail: true, module: 'Approval' },
  { id: 'organizationHierarchy', path: '/iam/organizationHierarchy', label: 'Organization Structure', icon: 'hierarchy', module: 'Organization Structure' },
  { id: 'orphanedpolicy', path: '/iam/orphanedpolicy', label: 'Orphan Accounts', icon: 'orphan', detail: true, module: 'Orphan Accounts' },
  { id: 'requests', path: '/iam/requests', label: 'Access Requests', icon: 'request', detail: true, module: 'Access Requests' },
  { id: 'mfa', path: '/iam/mfa', label: 'Multi-Factor Authentication', icon: 'shield', detail: true, module: 'Multi-Factor Authentication' },
  { id: 'groups', path: '/iam/groups', label: 'Groups', icon: 'group', detail: true, module: 'Application Groups' },
  { id: 'dynamicPolicy', path: '/iam/dynamicPolicy', label: 'Dynamic Policies', icon: 'policy', detail: true, module: 'Dynamic Policy' },
  { id: 'segregationofduties', path: '/iam/segregationofduties/rules', label: 'Segregation of Duties', icon: 'sod', detail: true, module: 'Segregation Of Duties' },
  { id: 'signOnPolicy', path: '/iam/signOnPolicy', label: 'Sign-On Policies', icon: 'signon', detail: true, module: 'Sign-On Policy' },
  { id: 'applications', path: '/iam/applications', label: 'Applications', icon: 'provision', detail: true, module: 'Provision Applications' },
  { id: 'attributeConfigurations', path: '/iam/attributeConfigurations', label: 'Attribute Configuration', icon: 'swap', detail: true, module: 'Configurations' },
  { id: 'trustReconciliation', path: '/iam/trustReconciliation', label: 'Trust Reconciliation', icon: 'recon', detail: true, module: 'Trust Reconciliation' },
  // Directories, databases and identity services whose users federate into an
  // LDAP application. The Connector Hub (/new) and each setup form are routed.
  { id: 'externalUserFederation', path: '/iam/externalUserFederation', label: 'External User Federation', icon: 'plug', detail: true, module: 'External User Federation' },
  { id: 'ldapapplications', path: '/iam/ldapapplications', label: 'LDAP Applications', icon: 'directory', detail: true, module: 'LDAP Applications' },
  { id: 'ipRestrictionPolicy', path: '/iam/ip/restriction/policy', label: 'Network Access Policies', icon: 'noentry', detail: true, module: 'Network Access Policies' },
  { id: 'schedulers', path: '/iam/schedulers', label: 'Schedulers', icon: 'clock', detail: true, module: 'Schedulers' },
  { id: 'recertification', path: '/iam/recertification', label: 'Recertification', icon: 'certify', detail: true, module: 'Recertification' },
  { id: 'reports', path: '/iam/reports', label: 'Reports', icon: 'report', detail: true, module: 'Reports' },
  { id: 'passwordPolicy', path: '/iam/passwordPolicy', label: 'Password Policy', icon: 'lock', detail: true, module: 'Password Policy' },
  { id: 'jobs', path: '/iam/jobs', label: 'Background Jobs', icon: 'jobs', detail: true, module: 'Background Jobs' },
  { id: 'configurations', path: '/iam/configurations', label: 'Configurations', icon: 'sliders', detail: true, module: 'Configurations' },
  { id: 'ssoConfigurations', path: '/iam/ssoConfigurations', label: 'SSO Configurations', icon: 'sso', module: 'SSO Configurations' },
  { id: 'emails', path: '/iam/emails', label: 'Email Management', icon: 'mail', detail: true, module: 'Email Management' },
  { id: 'emailConfigurations', path: '/iam/emailConfigurations', label: 'Email Configuration', icon: 'sliders', module: 'Email Management' },
  { id: 'emailTemplates', path: '/iam/emailTemplates', label: 'Email Templates', icon: 'file', detail: true, module: 'Email Management' },
  { id: 'sms', path: '/iam/sms', label: 'SMS Management', icon: 'sms', detail: true, module: 'SMS Management' },
  { id: 'smsTemplates', path: '/iam/smsTemplates', label: 'SMS Templates', icon: 'file', detail: true, module: 'SMS Management' },
  { id: 'consent', path: '/iam/consent', label: 'Consent Management', icon: 'consent', detail: true, module: 'Consent Management' },
  { id: 'consentPolicies', path: '/iam/consentPolicies', label: 'Consent Policies', icon: 'policy', module: 'Consent Management' },
  { id: 'consentTemplates', path: '/iam/consentTemplates', label: 'Consent Templates', icon: 'file', module: 'Consent Template' },
  { id: 'consentRecords', path: '/iam/consentRecords', label: 'Consent Records', icon: 'file', detail: true, module: 'Consent Management' },
  { id: 'syslogs', path: '/iam/syslogs', label: 'Security Events', icon: 'logs', detail: true, module: 'Security Events' },
  // Detection rules, their alerts and the addresses they block. Tabs are routed
  // (/iam/itdr/alerts), so it is a detail route.
  { id: 'itdr', path: '/iam/itdr', label: 'Identity Threat Detection', icon: 'shieldAlert', detail: true, module: 'Identity Threat Detection' },
  { id: 'licenses', path: '/iam/licenses', label: 'License', icon: 'license', module: 'License' },
  { id: 'profile', path: '/iam/profile', label: 'My Profile', icon: 'user', module: 'My profile' },
  { id: 'settings', path: '/iam/settings', label: 'Settings', icon: 'config', module: 'Settings' },
  { id: 'addLoginPassword', path: '/iam/additional/login', label: 'Login & Password', icon: 'lock', detail: true },
  { id: 'addOtpLogin', path: '/iam/additional/otpLogin', label: 'Email & Mobile Login', icon: 'phone', detail: true },
  { id: 'addLoginMfa', path: '/iam/additional/loginMfa', label: 'Login MFA', icon: 'key', detail: true },
  { id: 'addMfa', path: '/iam/additional/mfa', label: 'MFA Enrolment & Challenge', icon: 'shield', detail: true },
  { id: 'addErrors', path: '/iam/additional/errors', label: 'Error Pages', icon: 'warn', detail: true },
  { id: 'addEmailTemplates', path: '/iam/additional/emailTemplates', label: 'Email Templates', icon: 'mail', detail: true },
  { id: 'addDesktop', path: '/iam/additional/desktop', label: 'Desktop Client', icon: 'monitor', detail: true },
]

/* Routes a visitor without a session may open. Everything else waits behind
   the sign-in gate. */
export const PUBLIC_ROUTES = ['selfEnrollment']
export const isPublicRoute = (id) => PUBLIC_ROUTES.includes(id)

export const BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]))
export const BY_PATH = Object.fromEntries(ROUTES.map((r) => [r.path, r]))
export const DETAIL_ROUTES = ROUTES.filter((r) => r.detail).sort((a, b) => b.path.length - a.path.length)
export const TITLES = Object.fromEntries(ROUTES.map((r) => [r.id, r.label]))
export const pathFor = (id) => (BY_ID[id] ? BY_ID[id].path : `${BASE}/myapps`)

/* Which permission module a route belongs to. The "view console as" switch was
   a claim the console could not keep — it announced a narrower role and then
   left all forty admin entries in the navigation — because nothing connected a
   route to the permission register. This is that connection. A route with no
   module is always reachable. */
export const moduleFor = (id) => (BY_ID[id] ? BY_ID[id].module : undefined)

export const NAV = [
  {
    id: 'core',
    label: 'Core',
    icon: 'apps',
    items: [
      'dashboard', 'myapps', 'notifications', 'usefullinks', 'users', 'organizations', 'roles',
      'approvals', 'organizationHierarchy', 'orphanedpolicy', 'requests', 'mfa',
    ],
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: 'group',
    items: ['groups', 'dynamicPolicy', 'segregationofduties', 'signOnPolicy'],
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: 'provision',
    items: [
      // Attribute Configuration is reached from the Applications toolbar: the
      // definitions exist to serve that register, and a section of their own
      // put them a level above the thing they configure.
      'applications', 'trustReconciliation', 'externalUserFederation',
      'ldapapplications', 'ipRestrictionPolicy',
    ],
  },
  { id: 'schedulers', label: 'Schedulers', icon: 'clock', items: ['schedulers'], module: 'Schedulers' },
  {
    // Notification Center and Quick Links used to hang a second "… Management"
    // entry here. Both are now the Manage view of the page they publish to, so
    // the section is the governance and platform register it always was.
    id: 'reports',
    label: 'Reports',
    icon: 'report',
    items: [
      'recertification', 'reports', 'passwordPolicy', 'jobs',
      'configurations', 'ssoConfigurations',
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: 'mail',
    items: ['emails', 'sms', 'consent'],
  },
  { id: 'logging', label: 'Logging', icon: 'logs', items: ['syslogs', 'itdr', 'licenses'] },
  { id: 'system', label: 'System', icon: 'config', items: ['settings'] },
]

export const NAV_BADGES = {
  notifications: 'notifications',
  approvals: 'approvals',
  orphanedpolicy: 'orphan',
  segregationofduties: 'sod',
  applications: 'provisioning',
  externalUserFederation: 'federation',
  recertification: 'recert',
  jobs: 'jobs',
  syslogs: 'logs',
  itdr: 'itdr',
}

export const LEGACY = {
  '/iam': '/iam/myapps',
  '/iam/': '/iam/myapps',
  // The dictionary is a tab of the Password Policy section now, not a screen
  // of its own. Existing links and bookmarks land on the tab.
  '/iam/passwordDictionary': '/iam/passwordPolicy/dictionary',
  '/iam/hierarchy': '/iam/organizationHierarchy',
  '/iam/orphaned': '/iam/orphanedpolicy',
  '/iam/policies': '/iam/dynamicPolicy',
  '/iam/sod': '/iam/segregationofduties/rules',
  // The previous console answered to both casings of this address.
  '/iam/signonpolicy': '/iam/signOnPolicy',
  '/iam/provisioning': '/iam/applications',
  '/iam/provisionapplications': '/iam/applications',
  '/iam/reconciliation': '/iam/trustReconciliation',
  '/iam/externaluserfederation': '/iam/externalUserFederation',
  '/iam/userFederation': '/iam/externalUserFederation',
  '/iam/connectorHub': '/iam/externalUserFederation/new',
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
  // SIEM transport is a Security Events tab now, not a Settings section.
  // Existing links to the section land on the tab.
  '/iam/settings/siem': '/iam/syslogs/siem',
  '/iam/license': '/iam/licenses',
  '/iam/usefulLinks': '/iam/usefullinks',
  '/iam/myprofile': '/iam/profile',
  '/iam/selfenrollment': '/iam/selfEnrollment',
  '/iam/register': '/iam/selfEnrollment',
  '/iam/signup': '/iam/selfEnrollment',
  '/iam/communications': '/iam/emails',
  // The relay settings are one provider record among several now, and the
  // outbound queue is the Messages tab. The three addresses the old Email
  // Management tabs used land on the tab that replaced each of them.
  '/iam/emailConfigurations': '/iam/emails/smtp',
  '/iam/emails/configuration': '/iam/emails/smtp',
  '/iam/emails/providers': '/iam/emails/smtp',
  '/iam/emails/clients': '/iam/emails/smtp',
  '/iam/emails/emails': '/iam/emails/messages',
  '/iam/emailTemplates': '/iam/emails/templates',
  '/iam/smsTemplates': '/iam/sms/providers',
  '/iam/consentPolicies': '/iam/consent/rules',
  '/iam/consentTemplates': '/iam/consent/templates',
  '/iam/consentRecords': '/iam/consent/records',
  // The two management screens are now the Manage view of the page they feed.
  '/iam/ssoapplications': '/iam/applications',
  '/iam/ssoApplications': '/iam/applications',
  '/iam/ssoApplications/attribute/configurations': '/iam/attributeConfigurations',
  '/iam/notifications/management': '/iam/notifications/manage',
  '/iam/notifications/management/add': '/iam/notifications/manage/add',
  '/iam/usefullinks/management': '/iam/usefullinks/manage',
  '/iam/usefullinks/management/add': '/iam/usefullinks/manage/add',
}
