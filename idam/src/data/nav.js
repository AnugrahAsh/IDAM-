export const BASE = '/iam'

// Packet 1 ships exactly the routes below. Any other path resolves to the
// placeholder page rather than a blank screen.
export const ROUTES = [
  { id: 'myapps', path: '/iam/myapps', label: 'My Apps', icon: 'apps' },
  { id: 'users', path: '/iam/users', label: 'Users', icon: 'user', detail: true },
  { id: 'mfa', path: '/iam/mfa', label: 'MFA', icon: 'shield', detail: true },
  { id: 'organizations', path: '/iam/organizations', label: 'Organization', icon: 'building', detail: true },
  { id: 'roles', path: '/iam/roles', label: 'Roles', icon: 'roles', detail: true },
  { id: 'ssoConfigurations', path: '/iam/ssoConfigurations', label: 'SSO Configurations', icon: 'sso' },
  { id: 'reports', path: '/iam/reports', label: 'Reports', icon: 'report' },
  { id: 'jobs', path: '/iam/jobs', label: 'Jobs', icon: 'jobs', detail: true },
  { id: 'emails', path: '/iam/emails', label: 'Email Management', icon: 'mail', detail: true },
  { id: 'sms', path: '/iam/sms', label: 'SMS Management', icon: 'sms', detail: true },
  { id: 'licenses', path: '/iam/licenses', label: 'License', icon: 'license' },
]

export const BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]))
export const BY_PATH = Object.fromEntries(ROUTES.map((r) => [r.path, r]))
export const DETAIL_ROUTES = ROUTES.filter((r) => r.detail).sort((a, b) => b.path.length - a.path.length)
export const TITLES = Object.fromEntries(ROUTES.map((r) => [r.id, r.label]))

// Ids the full console owns that this packet folds into a page it does ship.
// navigate() is called with a bare id in places, which never reaches LEGACY.
const ALIAS = {
  emailConfigurations: '/iam/emails/configuration',
  emailTemplates: '/iam/emails/templates',
  smsTemplates: '/iam/sms/providers',
  ssoApplications: '/iam/ssoConfigurations',
  emailManagement: '/iam/emails',
  smsManagement: '/iam/sms',
}

export const pathFor = (id) => {
  if (BY_ID[id]) return BY_ID[id].path
  if (ALIAS[id]) return ALIAS[id]
  return BASE + '/myapps'
}

export const NAV = [
  { id: 'core', label: 'Core', icon: 'apps', items: ['myapps', 'users', 'organizations', 'roles', 'mfa'] },
  { id: 'applications', label: 'Applications', icon: 'provision', items: ['ssoConfigurations'] },
  { id: 'reports', label: 'Reports', icon: 'report', items: ['reports', 'jobs'] },
  {
    id: 'emailsGroup',
    label: 'Emails',
    icon: 'mail',
    links: [
      { label: 'Emails', path: '/iam/emails' },
      { label: 'Email Configuration', path: '/iam/emails/configuration' },
      { label: 'Email Templates', path: '/iam/emails/templates' },
    ],
  },
  {
    id: 'smsGroup',
    label: 'SMS',
    icon: 'sms',
    links: [
      { label: 'SMS', path: '/iam/sms' },
      { label: 'Providers', path: '/iam/sms/providers' },
      { label: 'Templates', path: '/iam/sms/templates' },
      { label: 'Clients', path: '/iam/sms/clients' },
    ],
  },
  { id: 'licensing', label: 'Licensing', icon: 'license', items: ['licenses'] },
]

export const NAV_BADGES = {
  jobs: 'jobs',
}

export const LEGACY = {
  '/iam': '/iam/myapps',
  '/iam/': '/iam/myapps',
  '/iam/directories': '/iam/users',
  '/iam/myprofile': '/iam/myapps',
  '/iam/communications': '/iam/emails',
  '/iam/emailConfigurations': '/iam/emails/configuration',
  '/iam/emailTemplates': '/iam/emails/templates',
  '/iam/smsTemplates': '/iam/sms/providers',
  '/iam/license': '/iam/licenses',
  '/iam/ssoApplications': '/iam/ssoConfigurations',
}
