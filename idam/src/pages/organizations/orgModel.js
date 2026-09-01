import { USERS, LOGS, PASSWORD_POLICIES } from '../../data/seed'

export const TIMEZONES = ['Asia/Kolkata', 'Asia/Singapore', 'Asia/Dubai', 'Europe/London', 'UTC']
export const NETWORK_RULES = ['None', 'Corporate egress only', 'Corporate egress and VPN', 'Bastion only']
export const TODAY = '2026-08-05 09:00'

const ORG_PROFILE = {
  Tanflow: {
    code: 'TF-ROOT', owner: 'Shubham Jain', region: 'Global', timezone: 'Asia/Kolkata',
    contact: 'identity@tanflow.com', domains: ['tanflow.com'],
    targets: ['AD_CORP', 'WORKDAY_HR', 'ENTRA_TENANT'],
    bundles: ['IT_DOMAIN_ADMIN', 'SEC_SIEM_ANALYST'],
    ipPolicy: 'Corporate egress and VPN',
    description: 'Tenant root. Every organization inherits its baseline authentication and password rules from this node unless it overrides them.',
  },
  'Tanflow · Finance': {
    code: 'TF-FIN', owner: 'Priya Nair', region: 'Mumbai', timezone: 'Asia/Kolkata',
    contact: 'finance.iam@tanflow.com', domains: ['tanflow.com'],
    targets: ['DB2_CORE', 'ORACLE_ERP', 'MYSQL_BILLING'],
    bundles: ['FIN_GL_POST', 'FIN_AP_APPROVE', 'FIN_VENDOR_MASTER'],
    ipPolicy: 'Corporate egress only',
    description: 'SOX-in-scope organization. Entitlements granted here are sampled by the external auditor every quarter.',
  },
  'Tanflow · Engineering': {
    code: 'TF-ENG', owner: 'Arjun Iyer', region: 'Bengaluru', timezone: 'Asia/Kolkata',
    contact: 'eng.iam@tanflow.com', domains: ['tanflow.com'],
    targets: ['PG_ANALYTICS', 'ENTRA_TENANT'],
    bundles: ['ENG_PROD_DEPLOY', 'ENG_REPO_ADMIN'],
    ipPolicy: 'Corporate egress and VPN',
    description: 'Product and platform engineering. Holds the production deployment path, so change and deploy rights are separated by policy.',
  },
  'Tanflow · HR': {
    code: 'TF-HR', owner: 'Ananya Bose', region: 'New Delhi', timezone: 'Asia/Kolkata',
    contact: 'people.iam@tanflow.com', domains: ['tanflow.com'],
    targets: ['WORKDAY_HR'],
    bundles: ['HR_PII_READ', 'HR_PAYROLL_RUN'],
    ipPolicy: 'Corporate egress only',
    description: 'Source of truth for joiner, mover and leaver events. Identity records flow from Workday into this organization first.',
  },
  'Tanflow · Sales': {
    code: 'TF-SLS', owner: 'Neha Verma', region: 'Chennai', timezone: 'Asia/Kolkata',
    contact: 'sales.iam@tanflow.com', domains: ['tanflow.com'],
    targets: ['SALESFORCE'],
    bundles: ['SALES_CRM_ADMIN'],
    ipPolicy: 'None',
    description: 'Field and inside sales. Largely CRM-scoped, with a high share of mobile sign-ins.',
  },
  'Tanflow · IT Ops': {
    code: 'TF-ITO', owner: 'Vikas Rao', region: 'Dehradun', timezone: 'Asia/Kolkata',
    contact: 'itops.iam@tanflow.com', domains: ['tanflow.com'],
    targets: ['AD_CORP', 'ENTRA_TENANT'],
    bundles: ['IT_DOMAIN_ADMIN', 'IT_BACKUP_OPERATOR'],
    ipPolicy: 'Bastion only',
    description: 'Runs the directory and the connector estate. Every service account in the tenant is scoped here.',
  },
  'Contoso Ltd': {
    code: 'CONTOSO', owner: 'Marta Novak', region: 'London', timezone: 'Europe/London',
    contact: 'identity@contoso.example', domains: ['contoso.example'],
    targets: ['ENTRA_TENANT'],
    bundles: ['SUP_TIER2'],
    ipPolicy: 'Corporate egress and VPN',
    description: 'Acquired entity operating under its own domain. Federated inbound, provisioned outbound.',
  },
  Northwind: {
    code: 'NORTHWIND', owner: 'Yusuf Haddad', region: 'Dubai', timezone: 'Asia/Dubai',
    contact: 'identity@northwind.example', domains: ['northwind.example'],
    targets: [],
    bundles: ['SUP_TIER2'],
    ipPolicy: 'Corporate egress only',
    description: 'Partner organization. Contractor lifecycle is enforced by the 90-day expiry policy.',
  },
}

export const autoCode = (name) => String(name || '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 14) || 'ORG'

export const profileFor = (org) => {
  const preset = ORG_PROFILE[org.name] || {}
  return {
    code: org.code || preset.code || autoCode(org.name),
    description: org.description || preset.description
      || 'Scopes password policy, delegated administration and provisioning reach for every identity created beneath it.',
    owner: org.owner || preset.owner || 'Unassigned',
    region: org.region || preset.region || 'Global',
    timezone: org.timezone || preset.timezone || 'Asia/Kolkata',
    contact: org.contact || preset.contact || 'identity@tanflow.com',
    domains: preset.domains || [],
    targets: preset.targets || [],
    bundles: preset.bundles || [],
    ipPolicy: org.ipPolicy || preset.ipPolicy || 'None',
    mfaRequired: org.mfaRequired != null ? org.mfaRequired : preset.mfaRequired !== false,
  }
}

export const resolvePolicy = (org, all) => {
  const chain = [org.name]
  let cursor = org
  let guard = 0
  while (cursor && cursor.passwordPolicy === 'Inherited' && guard < 8) {
    const parent = all.find((o) => o.name === cursor.parent)
    if (!parent) break
    chain.push(parent.name)
    cursor = parent
    guard += 1
  }
  const name = cursor && cursor.passwordPolicy !== 'Inherited' ? cursor.passwordPolicy : 'Default Strong Policy'
  return {
    name,
    chain,
    inheritedFrom: cursor && cursor.name !== org.name ? cursor.name : null,
    policy: PASSWORD_POLICIES.find((p) => p.name === name) || PASSWORD_POLICIES[0],
  }
}

export const membersOf = (name) => USERS.filter((u) => u.organization === name)
export const auditFor = (org) => LOGS.filter((l) => (l.id + org.id) % 7 === 0).slice(0, 9)
