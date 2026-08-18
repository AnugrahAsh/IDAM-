let s = 20260805
const rnd = () => {
  s = (s * 1103515245 + 12345) & 0x7fffffff
  return s / 0x7fffffff
}
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))

const FIRST = ['Aarav','Diya','Kabir','Mira','Rohan','Sana','Vikas','Neha','Arjun','Isha','Dev','Tara','Omar','Priya','Sameer','Ananya','Ravi','Zoya','Nikhil','Charu','Leon','Marta','Yusuf','Elena']
const LAST = ['Sharma','Mehta','Khan','Patel','Nair','Rao','Jain','Verma','Bose','Iyer','Singh','Gupta','Das','Reddy','Bhat','Kaur','Chandra','Sethi','Malhotra','Pillai','Okafor','Novak','Haddad','Ferrer']

export const ORGS = ['Tanflow','Tanflow · Finance','Tanflow · Engineering','Tanflow · HR','Tanflow · Sales','Tanflow · IT Ops','Contoso Ltd','Northwind']
export const DEPARTMENTS = ['Engineering','Finance','Human Resources','IT Operations','Sales','Security','Compliance','Support']
export const LOCATIONS = ['Mumbai','Bengaluru','New Delhi','Chennai','Dehradun','Singapore','Dubai','London']

const day = (n) => {
  const d = new Date(Date.UTC(2026, 7, 5) - n * 86400000)
  return d.toISOString().slice(0, 10)
}
const stamp = (n, h = 9) => `${day(n)} ${String(h % 24).padStart(2, '0')}:${String((n * 7) % 60).padStart(2, '0')}`
export const relTime = (n) => (n === 0 ? 'just now' : n < 60 ? `${n}m ago` : n < 1440 ? `${Math.floor(n / 60)}h ago` : `${Math.floor(n / 1440)}d ago`)

export const SECTIONS = [
  { id: 'general', name: 'General Details', internal: 'general_details', order: 1, system: true },
  { id: 'professional', name: 'Professional Details', internal: 'professional_details', order: 2, system: true },
  { id: 'residential', name: 'Residential Details', internal: 'residential_details', order: 3, system: true },
  { id: 'location', name: 'User Location', internal: 'Vlgg', order: 4, system: false },
]

export const LOOKUPS = {
  employee_type: ['Internal', 'External', 'Contractor', 'Service Account'],
  office_level: ['Corporate', 'Zonal', 'Divisional', 'Sub-Divisional', 'Field'],
  department: DEPARTMENTS,
  country: ['India', 'Singapore', 'United Arab Emirates', 'United Kingdom'],
  state: ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Uttarakhand'],
  city: LOCATIONS,
  discom: ['UPCL', 'PVVNL', 'MVVNL', 'DVVNL'],
  zone: ['North Zone', 'South Zone', 'East Zone', 'West Zone'],
  division: ['Division I', 'Division II', 'Division III'],
}

export const ATTRS = [
  { id: 'employeeType', label: 'Employee Type', type: 'select', src: 'employee_type', section: 'general', req: true, core: true, col: false, order: 1 },
  { id: 'username', label: 'Username', type: 'text', section: 'general', req: true, core: true, col: true, order: 2 },
  { id: 'firstName', label: 'First name', type: 'text', section: 'general', req: true, core: true, col: true, order: 3 },
  { id: 'lastName', label: 'Last name', type: 'text', section: 'general', req: true, core: true, col: true, order: 4 },
  { id: 'email', label: 'Email', type: 'email', section: 'general', req: true, core: true, col: true, order: 5 },
  { id: 'organization', label: 'Organization', type: 'select', src: 'organizations', section: 'general', req: true, core: true, col: false, order: 6 },
  { id: 'mobileNo', label: 'Mobile no', type: 'tel', section: 'general', req: true, core: true, col: false, order: 7 },
  { id: 'manager', label: 'Manager', type: 'select', src: 'managers', section: 'general', core: true, col: false, order: 8 },
  { id: 'retirementDate', label: 'Date of retirement', type: 'date', section: 'general', core: true, col: false, order: 9 },
  { id: 'empCode', label: 'Employee code', type: 'text', section: 'professional', col: false, order: 1 },
  { id: 'designation', label: 'Designation', type: 'text', section: 'professional', col: false, order: 2 },
  { id: 'department', label: 'Department', type: 'select', src: 'department', section: 'professional', col: true, order: 3 },
  { id: 'officeLevel', label: 'Office level', type: 'select', src: 'office_level', section: 'professional', col: false, order: 4 },
  { id: 'reportingEmpId', label: 'Reporting employee id', type: 'text', section: 'professional', col: false, order: 5 },
  { id: 'address', label: 'Address', type: 'textarea', section: 'residential', col: false, order: 1 },
  { id: 'country', label: 'Country', type: 'select', src: 'country', section: 'residential', col: false, order: 2 },
  { id: 'state', label: 'State', type: 'select', src: 'state', section: 'residential', col: false, order: 3 },
  { id: 'city', label: 'City', type: 'select', src: 'city', section: 'residential', col: false, order: 4 },
  { id: 'postalCode', label: 'Postal code', type: 'text', section: 'residential', col: false, order: 5 },
  { id: 'discom', label: 'Discom', type: 'select', src: 'discom', section: 'location', col: false, order: 1 },
  { id: 'zone', label: 'Zone', type: 'select', src: 'zone', section: 'location', col: false, order: 2 },
  { id: 'division', label: 'Division', type: 'select', src: 'division', section: 'location', col: false, order: 3 },
]

const STATUSES = ['Active','Active','Active','Active','Locked','Disabled','Active','Pending']
export const USERS = Array.from({ length: 46 }, (_, i) => {
  const f = pick(FIRST), l = pick(LAST)
  const status = STATUSES[i % STATUSES.length]
  const type = i % 11 === 0 ? 'Service Account' : i % 7 === 0 ? 'Contractor' : i % 5 === 0 ? 'External' : 'Internal'
  return {
    id: i + 1,
    username: `${f}_${l}`.toUpperCase().replace(/[^A-Z_]/g, ''),
    firstName: f, lastName: l,
    email: `${f}.${l}`.toLowerCase() + '@tanflow.com',
    status, employeeType: type,
    organization: pick(ORGS), department: pick(DEPARTMENTS),
    mobileNo: '+91 9' + int(500000000, 999999999),
    manager: i % 4 ? `${pick(FIRST)} ${pick(LAST)}` : '',
    empCode: 'EMP' + (1000 + i),
    designation: pick(['Engineer','Senior Engineer','Manager','Director','Analyst','Architect','Lead']),
    officeLevel: pick(LOOKUPS.office_level),
    reportingEmpId: 'EMP' + (1000 + (i % 12)),
    address: `${int(1, 90)} Sector ${int(2, 18)}`,
    country: 'India', state: pick(LOOKUPS.state), city: pick(LOCATIONS), postalCode: '4000' + int(10, 89),
    discom: pick(LOOKUPS.discom), zone: pick(LOOKUPS.zone), division: pick(LOOKUPS.division),
    retirementDate: '',
    lastLogin: stamp(i % 30, 8 + (i % 10)),
    createdOn: stamp(60 + (i % 120)),
    createdBy: 'admin',
  }
})
USERS[0] = { ...USERS[0], username: 'SHUBHAM_JAIN', firstName: 'Shubham', lastName: 'Jain', email: 'shubham.jain@tanflow.com', status: 'Active', organization: 'Tanflow', employeeType: 'Internal' }
export const ME = { ...USERS[0], roleLabel: 'Global Identity Administrator', lastLoginRel: '2 hours ago' }

export const ORGANIZATIONS = ORGS.map((name, i) => ({
  id: i + 1, name,
  parent: i === 0 ? null : 'Tanflow',
  passwordPolicy: i === 0 ? 'Default Strong Policy' : i % 3 ? 'Inherited' : 'Contractor Policy',
  inherit: i !== 0,
  status: i === 5 ? 'Disabled' : 'Active',
  users: [420, 58, 132, 44, 76, 39, 210, 88][i],
  createdOn: stamp(200 - i * 12),
}))

export const PERM_MODULES = ['Access Groups','Application Linkage','Approvals','Configurations','Communications','Dynamic Policy','Jobs','LDAP Directories','License','Logging','Multi-Factor Authentication','My Apps','My Profile','Notifications','Org Hierarchy','Organizations','Orphaned Accounts','Password Policy','Provisioning','Recertification','Reports','Access Requests','Roles','Segregation of Duties','Settings','SSO Applications','Network Restrictions','Schedulers','Trust Reconciliation','Useful Links','Users']
const CRUD = ['View list', 'View', 'Create', 'Edit', 'Delete']
export const PERM_CATALOG = PERM_MODULES.map((name, i) => ({
  id: i + 1, name,
  perms: name === 'Users'
    ? [...CRUD, 'Activate', 'Deactivate', 'Lock account', 'Reset password', 'Reset MFA', 'Reset device', 'Import', 'Export', 'Bulk modify', 'Manage groups']
    : name === 'Recertification' ? [...CRUD, 'Certify', 'Revoke', 'Close campaign', 'Export']
    : name === 'Provisioning' ? [...CRUD, 'Test connection', 'Provision user', 'Deprovision user', 'Sync']
    : CRUD,
}))

export const ROLES = [
  { id: 1, name: 'Global Identity Administrator', description: 'Unrestricted administration of the identity platform and every connected target.', members: 4, system: true, risk: 'critical', scope: 'Global' },
  { id: 2, name: 'Access Approver', description: 'Reviews and approves access requests within an assigned organizational scope.', members: 26, risk: 'high', scope: 'Tanflow · Finance' },
  { id: 3, name: 'Auditor', description: 'Read-only visibility across logs, reports and attestation campaigns.', members: 9, risk: 'low', scope: 'Global' },
  { id: 4, name: 'Helpdesk Operator', description: 'Credential and MFA recovery for end users. No entitlement changes.', members: 18, risk: 'medium', scope: 'Global' },
  { id: 5, name: 'Provisioning Engineer', description: 'Manages target connectors, reconciliation and provisioning pipelines.', members: 6, risk: 'high', scope: 'Applications' },
  { id: 6, name: 'Resource Owner', description: 'Owns an application and attests to who holds access to it.', members: 31, risk: 'medium', scope: 'Delegated' },
  { id: 7, name: 'Standard User', description: 'Baseline self-service entitlements for every directory identity.', members: 3892, system: true, risk: 'low', scope: 'Global' },
]

export const ROLE_PERMS = {
  1: Object.fromEntries(PERM_CATALOG.map((m) => [m.name, m.perms.slice()])),
  2: { Approvals: ['View list', 'View', 'Edit'], 'Access Requests': ['View list', 'View'], Users: ['View list', 'View'], 'Access Groups': ['View list', 'View'] },
  3: { Logging: ['View list', 'View'], Reports: ['View list', 'View'], Recertification: ['View list', 'View', 'Export'], Users: ['View list', 'View'], Organizations: ['View list', 'View'] },
  4: { Users: ['View list', 'View', 'Reset password', 'Reset MFA', 'Reset device', 'Lock account'], 'Multi-Factor Authentication': ['View list', 'View'] },
  5: { Provisioning: ['View list', 'View', 'Create', 'Edit', 'Test connection', 'Sync', 'Provision user'], 'Trust Reconciliation': ['View list', 'View'], 'LDAP Directories': ['View list', 'View'], Jobs: ['View list', 'View'] },
  6: { Recertification: ['View list', 'View', 'Certify', 'Revoke'], Approvals: ['View list', 'View'], 'Access Groups': ['View list', 'View'] },
  7: { 'My Apps': ['View list'], 'My Profile': ['View list', 'Edit'], 'Access Requests': ['View list', 'Create'], 'Useful Links': ['View list'] },
}

export const CONNECTOR_TYPES = [
  { id: 'postgres', name: 'PostgreSQL', kind: 'Database', color: '#31648C', icon: 'db' },
  { id: 'mysql', name: 'MySQL', kind: 'Database', color: '#00758F', icon: 'db' },
  { id: 'mongodb', name: 'MongoDB', kind: 'Database', color: '#13AA52', icon: 'db' },
  { id: 'oracle', name: 'Oracle', kind: 'Database', color: '#C74634', icon: 'db' },
  { id: 'db2', name: 'IBM DB2', kind: 'Database', color: '#0F62FE', icon: 'db' },
  { id: 'mssql', name: 'SQL Server', kind: 'Database', color: '#A4373A', icon: 'db' },
  { id: 'ad', name: 'Active Directory', kind: 'Directory', color: '#0078D4', icon: 'branch' },
  { id: 'ldap', name: 'LDAP', kind: 'Directory', color: '#5B6C8F', icon: 'directory' },
  { id: 'api', name: 'REST API', kind: 'Custom', color: '#6941C6', icon: 'code' },
  { id: 'msentra', name: 'Microsoft Entra ID', kind: 'Cloud', color: '#0B65B8', icon: 'cloud' },
  { id: 'scim', name: 'SCIM 2.0', kind: 'Standard', color: '#0E7D74', icon: 'swap' },
  { id: 'none', name: 'No provisioning', kind: 'Manual', color: '#5D6776', icon: 'ban' },
]

export const APPLICATIONS = [
  { id: 1, name: 'AD_CORP', displayName: 'Active Directory · Corporate', connector: 'ad', method: 'Active Directory', status: 'Healthy', accounts: 3892, orphans: 42, lastSync: stamp(0, 4), owner: 'IT Operations', host: 'dc01.tanflow.internal', port: '636' },
  { id: 2, name: 'WORKDAY_HR', displayName: 'Workday HR', connector: 'scim', method: 'SCIM 2.0', status: 'Healthy', accounts: 4120, orphans: 6, lastSync: stamp(0, 6), owner: 'Human Resources', host: 'api.workday.com', port: '443' },
  { id: 3, name: 'SALESFORCE', displayName: 'Salesforce CRM', connector: 'api', method: 'REST API', status: 'Degraded', accounts: 310, orphans: 9, lastSync: stamp(1, 22), owner: 'Sales', host: 'tanflow.my.salesforce.com', port: '443' },
  { id: 4, name: 'ENTRA_TENANT', displayName: 'Microsoft Entra ID', connector: 'msentra', method: 'Entra ID', status: 'Healthy', accounts: 1135, orphans: 3, lastSync: stamp(0, 5), owner: 'IT Operations', host: 'graph.microsoft.com', port: '443' },
  { id: 5, name: 'PG_ANALYTICS', displayName: 'Analytics Warehouse', connector: 'postgres', method: 'PostgreSQL', status: 'Failed', accounts: 88, orphans: 14, lastSync: stamp(3, 2), owner: 'Engineering', host: 'pg-analytics.tanflow.internal', port: '5432' },
  { id: 6, name: 'MYSQL_BILLING', displayName: 'Billing Platform', connector: 'mysql', method: 'MySQL', status: 'Healthy', accounts: 214, orphans: 2, lastSync: stamp(0, 3), owner: 'Finance', host: 'mysql-prod.tanflow.internal', port: '3306' },
  { id: 7, name: 'DB2_CORE', displayName: 'Core Banking (DB2)', connector: 'db2', method: 'IBM DB2', status: 'Healthy', accounts: 640, orphans: 0, lastSync: stamp(0, 2), owner: 'Finance', host: 'db2-core.tanflow.internal', port: '50000' },
  { id: 8, name: 'ORACLE_ERP', displayName: 'Oracle ERP', connector: 'oracle', method: 'Oracle', status: 'Degraded', accounts: 512, orphans: 7, lastSync: stamp(2, 11), owner: 'Finance', host: 'erp.tanflow.internal', port: '1521' },
]

export const SSO_APPS = [
  { id: 1, name: 'workspace', displayName: 'Google Workspace', protocol: 'SAML', clientId: 'tanflow-workspace', status: 'Active', enabled: true, users: 3840, signIns7d: 18420, owner: 'IT Operations', createdOn: stamp(320) },
  { id: 2, name: 'salesforce_sso', displayName: 'Salesforce', protocol: 'SAML', clientId: 'tanflow-sfdc', status: 'Active', enabled: true, users: 310, signIns7d: 2210, owner: 'Sales', createdOn: stamp(280) },
  { id: 3, name: 'confluence', displayName: 'Atlassian Cloud', protocol: 'OIDC', clientId: 'tanflow-atlassian', status: 'Active', enabled: true, users: 1180, signIns7d: 7640, owner: 'Engineering', createdOn: stamp(240) },
  { id: 4, name: 'servicedesk', displayName: 'Service Desk', protocol: 'OAuth', clientId: 'tanflow-servicedesk', status: 'Active', enabled: true, users: 2260, signIns7d: 9120, owner: 'IT Operations', createdOn: stamp(190) },
  { id: 5, name: 'analytics_portal', displayName: 'Analytics Portal', protocol: 'JWT', clientId: 'tanflow-analytics', status: 'Active', enabled: true, users: 420, signIns7d: 1180, owner: 'Engineering', createdOn: stamp(120) },
  { id: 6, name: 'vendor_portal', displayName: 'Vendor Portal', protocol: 'SAML', clientId: 'tanflow-vendor', status: 'Disabled', enabled: false, users: 96, signIns7d: 0, owner: 'Procurement', createdOn: stamp(90) },
  { id: 7, name: 'legacy_intranet', displayName: 'Legacy Intranet', protocol: 'Link', clientId: 'tanflow-intranet', status: 'Active', enabled: true, users: 3892, signIns7d: 4400, owner: 'Corporate', createdOn: stamp(410) },
]

export const DIRECTORIES = [
  { id: 1, name: 'IDAM_PRIMARY', displayName: 'Corporate Directory', url: 'ldaps://ldap-01.tanflow.internal:636', baseDn: 'dc=tanflow,dc=com', bindDn: 'cn=idam,ou=svc,dc=tanflow,dc=com', entries: 3892, tls: true, status: 'Healthy', lastSync: stamp(0, 6) },
  { id: 2, name: 'PARTNER_DMZ', displayName: 'Partner Directory (DMZ)', url: 'ldap://ldap-dmz.tanflow.io:389', baseDn: 'dc=partners,dc=tanflow,dc=io', bindDn: 'cn=bind,dc=partners,dc=tanflow,dc=io', entries: 640, tls: false, status: 'Degraded', lastSync: stamp(1, 14) },
  { id: 3, name: 'AD_FOREST', displayName: 'AD Forest', url: 'ldaps://dc01.tanflow.internal:636', baseDn: 'dc=corp,dc=tanflow,dc=com', bindDn: 'cn=svc_bind,ou=Service,dc=corp,dc=tanflow,dc=com', entries: 1135, tls: true, status: 'Healthy', lastSync: stamp(0, 5) },
]

export const ATTR_MAPPINGS = [
  { id: 1, idam: 'username', ldap: 'uid', objectClass: 'inetOrgPerson', directory: 'Corporate Directory', description: 'Login identifier' },
  { id: 2, idam: 'email', ldap: 'mail', objectClass: 'inetOrgPerson', directory: 'Corporate Directory', description: 'Primary email' },
  { id: 3, idam: 'firstName', ldap: 'givenName', objectClass: 'inetOrgPerson', directory: 'Corporate Directory', description: 'Given name' },
  { id: 4, idam: 'lastName', ldap: 'sn', objectClass: 'inetOrgPerson', directory: 'Corporate Directory', description: 'Surname' },
  { id: 5, idam: 'department', ldap: 'ou', objectClass: 'organizationalPerson', directory: 'AD Forest', description: 'Department / OU' },
  { id: 6, idam: 'mobileNo', ldap: 'mobile', objectClass: 'inetOrgPerson', directory: 'Corporate Directory', description: 'Mobile number' },
]

const GROUP_NAMES = ['FIN_GL_POST','FIN_AP_APPROVE','FIN_VENDOR_MASTER','ENG_PROD_DEPLOY','ENG_REPO_ADMIN','HR_PII_READ','HR_PAYROLL_RUN','IT_DOMAIN_ADMIN','IT_BACKUP_OPERATOR','SEC_SIEM_ANALYST','SALES_CRM_ADMIN','SUP_TIER2']
export const GROUPS = GROUP_NAMES.map((name, i) => ({
  id: i + 1, name,
  kind: i % 3 === 0 ? 'Access' : i % 3 === 1 ? 'Application' : 'SSO',
  description: pick(['Grants posting rights in the general ledger.','Approves accounts-payable batches.','Maintains vendor master records.','Deploys to production environments.','Administers source repositories.','Reads personally identifiable HR data.','Executes the payroll run.','Full domain administration.','Runs and restores backups.','Investigates SIEM alerts.','Administers the CRM tenant.','Second-line support queue.']),
  application: pick(APPLICATIONS).displayName,
  members: int(3, 180),
  sodFlags: i % 5 === 0 ? int(1, 4) : 0,
  owner: pick(['IT Operations','Finance','Human Resources','Engineering','Security']),
  createdOn: stamp(140 - i * 8),
}))

export const POLICIES = [
  { id: 1, name: 'Contractor 90-day expiry', description: 'Revokes contractor entitlements 90 days after start unless renewed.', condition: "employeeType = 'Contractor' AND days_since(startDate) > 90", groupType: 'Access', group: 'SUP_TIER2', active: true, matched: 38, lastRun: stamp(0, 3) },
  { id: 2, name: 'Finance read baseline', description: 'Every Finance identity receives ledger read access.', condition: "department = 'Finance'", groupType: 'Application', group: 'FIN_GL_POST', active: true, matched: 58, lastRun: stamp(0, 3) },
  { id: 3, name: 'Engineering repository access', description: 'Engineering staff receive repository access on join.', condition: "department = 'Engineering' AND status = 'Active'", groupType: 'Application', group: 'ENG_REPO_ADMIN', active: true, matched: 132, lastRun: stamp(0, 3) },
  { id: 4, name: 'Field staff onboarding', description: 'Field-level identities in UPCL receive the field bundle.', condition: "discom = 'UPCL' AND officeLevel = 'Field'", groupType: 'SSO', group: 'SUP_TIER2', active: false, matched: 76, lastRun: stamp(6, 3) },
]

export const SOD_RULES = [
  { id: 1, name: 'Create and approve payment', description: 'A single identity must not both raise and approve a payment batch.', type: 'Anti-affinity', groups: ['FIN_GL_POST', 'FIN_AP_APPROVE'], violations: 7, severity: 'critical', framework: 'SOX 404', owner: 'Finance' },
  { id: 2, name: 'Vendor master and payment', description: 'Vendor master maintenance conflicts with payment execution.', type: 'Anti-affinity', groups: ['FIN_VENDOR_MASTER', 'FIN_AP_APPROVE'], violations: 3, severity: 'critical', framework: 'SOX 404', owner: 'Finance' },
  { id: 3, name: 'Develop and deploy to production', description: 'Repository administration conflicts with production deployment.', type: 'Anti-affinity', groups: ['ENG_REPO_ADMIN', 'ENG_PROD_DEPLOY'], violations: 4, severity: 'high', framework: 'ITGC', owner: 'Engineering' },
  { id: 4, name: 'Administer and audit', description: 'Domain administration conflicts with security audit review.', type: 'Anti-affinity', groups: ['IT_DOMAIN_ADMIN', 'SEC_SIEM_ANALYST'], violations: 1, severity: 'high', framework: 'ISO 27001', owner: 'Security' },
  { id: 5, name: 'Payroll requires HR data', description: 'Payroll execution requires HR data access to function.', type: 'Affinity', groups: ['HR_PAYROLL_RUN', 'HR_PII_READ'], violations: 0, severity: 'low', framework: 'Operational', owner: 'Human Resources' },
]

export const SOD_VIOLATIONS = Array.from({ length: 15 }, (_, i) => {
  const rule = SOD_RULES[i % 4]
  const u = USERS[(i * 7) % USERS.length]
  return { id: i + 1, rule: rule.name, severity: rule.severity, framework: rule.framework, userId: u.id, username: u.username, department: u.department, groups: rule.groups.join(' + '), detected: stamp(i * 2), status: i % 4 === 0 ? 'Accepted risk' : i % 3 === 0 ? 'Remediating' : 'Open', age: i * 2 }
})

export const ORPHANS = Array.from({ length: 22 }, (_, i) => {
  const app = APPLICATIONS[i % APPLICATIONS.length]
  return { id: i + 1, account: pick(['svc_backup','root','admin_legacy','tmp_import','sa_ora','netadmin','deploy_bot','test_acct','svc_etl','pg_admin','ldap_bind','batch_run']) + '_' + (i + 1), application: app.displayName, applicationId: app.id, rule: pick(['No matching identity','Owner deactivated','Retired employee','Never reconciled']), discovered: stamp(i * 3), lastUsed: i % 4 === 0 ? stamp(i * 3 + 200) : stamp(i * 3 + 5), risk: i % 4 === 0 ? 'critical' : i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low', status: i % 6 === 0 ? 'Suppressed' : 'Open' }
})

const REQ_TYPES = ['New access', 'Role change', 'Application group', 'MFA reset', 'Emergency access']
export const REQUESTS = Array.from({ length: 34 }, (_, i) => {
  const u = USERS[(i * 5) % USERS.length]
  const status = ['Pending', 'Pending', 'Approved', 'Rejected', 'Pending', 'Escalated'][i % 6]
  const risk = i % 7 === 0 ? 'critical' : i % 4 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low'
  return { id: `REQ-${2400 + i}`, type: REQ_TYPES[i % REQ_TYPES.length], userId: u.id, username: u.username, requester: `${pick(FIRST)} ${pick(LAST)}`, target: pick(GROUP_NAMES), status, risk, level: (i % 3) + 1, levels: 3, sla: i % 5 === 0 ? 'breached' : i % 3 === 0 ? 'at-risk' : 'ok', raised: stamp(i % 14), justification: pick(['Quarter-end close support.','Covering for a colleague on leave.','New project assignment.','Incident response escalation.','Onboarding to the finance team.']) }
})

export const CAMPAIGNS = [
  { id: 1, name: 'Q3 2026 Finance Access Review', scope: 'Tanflow · Finance', auditor: 'Vansh Makhija', status: 'Active', progress: 62, items: 1284, decided: 796, revoked: 71, dueIn: 9, levels: 'Manager → Resource Owner → Auditor', started: stamp(21) },
  { id: 2, name: 'Privileged Access Attestation', scope: 'Privileged identities', auditor: 'Shubham Jain', status: 'Active', progress: 34, items: 412, decided: 140, revoked: 22, dueIn: 4, levels: 'Manager → Security', started: stamp(14) },
  { id: 3, name: 'SOX Quarterly Certification', scope: 'SOX-in-scope applications', auditor: 'Vansh Makhija', status: 'Active', progress: 88, items: 640, decided: 563, revoked: 34, dueIn: 2, levels: 'Manager → Auditor', started: stamp(30) },
  { id: 4, name: 'Q2 2026 Access Review', scope: 'All organizations', auditor: 'Shubham Jain', status: 'Closed', progress: 100, items: 3892, decided: 3892, revoked: 210, dueIn: 0, levels: 'Manager → Auditor', started: stamp(120) },
]

export const CERT_ITEMS = Array.from({ length: 26 }, (_, i) => {
  const u = USERS[(i * 3) % USERS.length]
  return { id: i + 1, userId: u.id, username: u.username, department: u.department, entitlement: pick(GROUP_NAMES), application: pick(APPLICATIONS).displayName, lastUsed: i % 5 === 0 ? `${int(120, 300)}d ago` : `${int(1, 20)}d ago`, risk: i % 6 === 0 ? 'critical' : i % 3 === 0 ? 'high' : 'medium', decision: i % 4 === 0 ? 'Certified' : i % 7 === 0 ? 'Revoked' : 'Pending', recommendation: i % 5 === 0 ? 'Revoke' : 'Certify' }
})

export const JOBS = Array.from({ length: 31 }, (_, i) => {
  const status = ['Succeeded', 'Succeeded', 'Failed', 'Running', 'Succeeded', 'Succeeded'][i % 6]
  const total = int(40, 4200)
  const failed = status === 'Failed' ? int(3, 90) : status === 'Running' ? 0 : i % 5 === 0 ? int(1, 6) : 0
  return { id: i + 1, jobId: 'JOB-' + (7100 + i), module: pick(['Provisioning', 'Reconciliation', 'Recertification', 'Policy', 'Directory Sync', 'Notification']), operation: pick(['Full sync', 'Delta sync', 'Evaluate policy', 'Dump attestation', 'Deprovision batch', 'Send digest']), target: pick(APPLICATIONS).displayName, status, progress: status === 'Running' ? int(20, 85) : 100, total, succeeded: total - failed, failed, durationMs: int(1200, 900000), started: stamp(i % 7, 3 + (i % 18)), triggeredBy: i % 3 === 0 ? 'Scheduler' : 'admin' }
})

export const SCHEDULERS = [
  { id: 1, name: 'Nightly directory reconciliation', service: 'reconcileAllQueue', cron: '0 1 * * *', status: 'Active', lastRun: stamp(0, 1), nextRun: stamp(-1, 1), lastResult: 'Succeeded', avgMins: 14 },
  { id: 2, name: 'Deactivate retired identities', service: 'deactivateUsersQueue', cron: '0 2 * * *', status: 'Active', lastRun: stamp(0, 2), nextRun: stamp(-1, 2), lastResult: 'Succeeded', avgMins: 3 },
  { id: 3, name: 'Dynamic policy evaluation', service: 'dynamicPolicyQueue', cron: '0 */6 * * *', status: 'Active', lastRun: stamp(0, 6), nextRun: stamp(0, 12), lastResult: 'Succeeded', avgMins: 6 },
  { id: 4, name: 'Attestation reminders', service: 'recertReminderQueue', cron: '0 9 * * 1', status: 'Active', lastRun: stamp(3, 9), nextRun: stamp(-4, 9), lastResult: 'Succeeded', avgMins: 1 },
  { id: 5, name: 'Orphan detection sweep', service: 'orphanDetectQueue', cron: '30 3 * * *', status: 'Paused', lastRun: stamp(5, 3), nextRun: null, lastResult: 'Failed', avgMins: 22 },
]

export const LOGS = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  ts: stamp(Math.floor(i / 9), 23 - (i % 22)),
  level: ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'INFO', 'DEBUG'][i % 7],
  category: pick(['Authentication', 'Provisioning', 'Policy', 'Directory', 'Approval', 'Configuration', 'Session']),
  actor: i % 4 === 0 ? 'system' : USERS[(i * 3) % USERS.length].username,
  action: pick(['Sign-in succeeded', 'Sign-in failed', 'Entitlement granted', 'Entitlement revoked', 'Connector sync completed', 'Policy evaluated', 'Role modified', 'Password reset', 'MFA factor removed', 'Configuration changed']),
  target: pick([...GROUP_NAMES, ...APPLICATIONS.map((a) => a.displayName)]),
  ip: '10.' + int(0, 40) + '.' + int(0, 250) + '.' + int(2, 250),
  outcome: i % 11 === 0 ? 'Denied' : 'Allowed',
}))

export const PASSWORD_POLICIES = [
  { id: 1, name: 'Default Strong Policy', description: 'Baseline for internal employees.', minLength: 14, history: 8, expiryDays: 90, lockoutAttempts: 5, lockoutMins: 15, dictionary: true, mfaRequired: true, orgs: ['Tanflow', 'Tanflow · Engineering', 'Tanflow · Finance'], users: 3210 },
  { id: 2, name: 'Contractor Policy', description: 'Shorter lifetime for external contractors.', minLength: 16, history: 10, expiryDays: 30, lockoutAttempts: 3, lockoutMins: 30, dictionary: true, mfaRequired: true, orgs: ['Contoso Ltd', 'Northwind'], users: 298 },
  { id: 3, name: 'Service Account Policy', description: 'Long non-expiring credentials for service principals.', minLength: 32, history: 2, expiryDays: 0, lockoutAttempts: 10, lockoutMins: 5, dictionary: false, mfaRequired: false, orgs: ['Tanflow · IT Ops'], users: 84 },
]

export const MFA_METHODS = [
  { id: 'passkey', name: 'Passkey / FIDO2', sub: 'Phishing-resistant hardware or platform authenticator.', icon: 'key', enabled: true, enrolled: 2840, strength: 'strongest' },
  { id: 'totp', name: 'Authenticator app', sub: 'Time-based one-time passcode.', icon: 'device', enabled: true, enrolled: 3120, strength: 'strong' },
  { id: 'push', name: 'Push notification', sub: 'Approve a prompt in the Tanflow mobile app.', icon: 'bell', enabled: true, enrolled: 1980, strength: 'strong' },
  { id: 'email', name: 'Email one-time code', sub: 'Code delivered to the registered mailbox.', icon: 'mail', enabled: true, enrolled: 3892, strength: 'weak' },
  { id: 'sms', name: 'SMS one-time code', sub: 'Code delivered by SMS. Not recommended.', icon: 'sms', enabled: false, enrolled: 410, strength: 'weakest' },
]

export const IP_POLICIES = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1, name: pick(['Corporate egress', 'Finance VDI', 'Partner VPN', 'Admin bastion', 'Field devices']) + ' ' + (i + 1),
  cidr: pick(['10.0.0.0/8', '192.168.44.0/24', '203.0.113.0/24', '172.16.0.0/12', '198.51.100.7/32']),
  action: i % 4 === 0 ? 'Deny' : 'Allow',
  appliesTo: pick(['All identities', 'Privileged identities', 'Contractors', 'Service accounts']),
  application: pick(SSO_APPS).displayName,
  status: i % 5 === 0 ? 'Disabled' : 'Active',
  hits7d: int(0, 8400),
  createdOn: stamp(60 - i * 4),
}))

export const NOTIFICATIONS = [
  { id: 1, title: 'SOX certification closes in 2 days', body: '77 entitlements remain undecided in the SOX Quarterly Certification campaign.', severity: 'high', category: 'Governance', ts: stamp(0, 8), unread: true, route: 'recertification' },
  { id: 2, title: 'Analytics Warehouse connector failed', body: 'Three consecutive sync failures. Last successful sync was 3 days ago.', severity: 'critical', category: 'Operations', ts: stamp(0, 6), unread: true, route: 'provisionapplications' },
  { id: 3, title: '7 new segregation-of-duties conflicts', body: 'Detected during the nightly policy evaluation across Finance.', severity: 'high', category: 'Compliance', ts: stamp(0, 2), unread: true, route: 'segregationofduties' },
  { id: 4, title: 'Passkey enrollment passed 70%', body: '2,840 of 3,892 identities now hold a phishing-resistant factor.', severity: 'info', category: 'Security', ts: stamp(1, 15), unread: false, route: 'mfa' },
  { id: 5, title: 'Scheduled maintenance window', body: 'Provisioning connectors pause on 12 Aug, 01:00–03:00 UTC.', severity: 'info', category: 'Platform', ts: stamp(2, 9), unread: false, route: 'schedulers' },
]

export const USEFUL_LINKS = [
  { id: 1, url: 'https://docs.tanflow.com/idam', label: 'Administrator guide', description: 'Full platform documentation.', order: 1 },
  { id: 2, url: 'https://status.tanflow.io', label: 'Service status', description: 'Live availability for every Tanflow service.', order: 2 },
  { id: 3, url: 'https://support.tanflow.com', label: 'Support portal', description: 'Raise and track support tickets.', order: 3 },
  { id: 4, url: 'https://kb.tanflow.com/idam', label: 'Knowledge base', description: 'How-to articles and runbooks.', order: 4 },
]

export const MY_APPS = [
  { id: 1,  brand: 'gmail',       name: 'Google Workspace',   type: 'SAML',  category: 'Productivity', owner: 'IT Operations',     lastUsed: '2 hours ago',  favorite: true },
  { id: 2,  brand: 'slack',       name: 'Slack',              type: 'OIDC',  category: 'Collaboration',owner: 'IT Operations',     lastUsed: '12 minutes ago', favorite: true },
  { id: 3,  brand: 'salesforce',  name: 'Salesforce',         type: 'SAML',  category: 'Sales',        owner: 'Sales',             lastUsed: 'yesterday',    favorite: true },
  { id: 4,  brand: 'atlassian',   name: 'Atlassian Cloud',    type: 'OIDC',  category: 'Engineering',  owner: 'Engineering',       lastUsed: '3 days ago' },
  { id: 5,  brand: 'jira',        name: 'Jira Service Desk',  type: 'OIDC',  category: 'Engineering',  owner: 'Engineering',       lastUsed: 'today',        favorite: true },
  { id: 6,  brand: 'confluence',  name: 'Confluence',         type: 'OIDC',  category: 'Collaboration',owner: 'Engineering',       lastUsed: '4 hours ago' },
  { id: 7,  brand: 'workday',     name: 'Workday',            type: 'SAML',  category: 'HR',           owner: 'Human Resources',   lastUsed: 'last week' },
  { id: 8,  brand: 'servicenow',  name: 'ServiceNow',         type: 'SAML',  category: 'IT Service',   owner: 'IT Operations',     lastUsed: 'today' },
  { id: 9,  brand: 'sap',         name: 'SAP S/4HANA',        type: 'SAML',  category: 'Finance',      owner: 'Finance',           lastUsed: '2 days ago' },
  { id: 10, brand: 'oracle',      name: 'Oracle ERP',         type: 'SAML',  category: 'Finance',      owner: 'Finance',           lastUsed: '5 days ago' },
  { id: 11, brand: 'netsuite',    name: 'NetSuite',           type: 'SAML',  category: 'Finance',      owner: 'Finance',           lastUsed: '3 weeks ago' },
  { id: 12, brand: 'concur',      name: 'SAP Concur',         type: 'SAML',  category: 'Finance',      owner: 'Finance',           lastUsed: 'last month' },
  { id: 13, brand: 'microsoft',   name: 'Microsoft 365',      type: 'OIDC',  category: 'Productivity', owner: 'IT Operations',     lastUsed: '1 hour ago',   favorite: true },
  { id: 14, brand: 'azure',       name: 'Microsoft Azure',    type: 'OIDC',  category: 'Cloud',        owner: 'IT Operations',     lastUsed: 'today' },
  { id: 15, brand: 'aws',         name: 'Amazon Web Services',type: 'SAML',  category: 'Cloud',        owner: 'Engineering',       lastUsed: 'today',        favorite: true },
  { id: 16, brand: 'gcp',         name: 'Google Cloud',       type: 'SAML',  category: 'Cloud',        owner: 'Engineering',       lastUsed: '6 days ago' },
  { id: 17, brand: 'github',      name: 'GitHub Enterprise',  type: 'SAML',  category: 'Engineering',  owner: 'Engineering',       lastUsed: '30 minutes ago', favorite: true },
  { id: 18, brand: 'gitlab',      name: 'GitLab',             type: 'OIDC',  category: 'Engineering',  owner: 'Engineering',       lastUsed: '2 days ago' },
  { id: 19, brand: 'docker',      name: 'Docker Hub',         type: 'OAuth', category: 'Engineering',  owner: 'Engineering',       lastUsed: 'last week' },
  { id: 20, brand: 'jenkins',     name: 'Jenkins',            type: 'SAML',  category: 'Engineering',  owner: 'Engineering',       lastUsed: 'yesterday' },
  { id: 21, brand: 'kubernetes',  name: 'Kubernetes Console', type: 'OIDC',  category: 'Cloud',        owner: 'Engineering',       lastUsed: 'today' },
  { id: 22, brand: 'datadog',     name: 'Datadog',            type: 'SAML',  category: 'Observability',owner: 'Engineering',       lastUsed: '3 hours ago' },
  { id: 23, brand: 'grafana',     name: 'Grafana',            type: 'OIDC',  category: 'Observability',owner: 'Engineering',       lastUsed: 'yesterday' },
  { id: 24, brand: 'splunk',      name: 'Splunk',             type: 'SAML',  category: 'Security',     owner: 'Security',          lastUsed: 'today' },
  { id: 25, brand: 'pagerduty',   name: 'PagerDuty',          type: 'SAML',  category: 'Observability',owner: 'Engineering',       lastUsed: '8 hours ago' },
  { id: 26, brand: 'snowflake',   name: 'Snowflake',          type: 'SAML',  category: 'Data',         owner: 'Engineering',       lastUsed: '2 days ago' },
  { id: 27, brand: 'tableau',     name: 'Tableau',            type: 'SAML',  category: 'Data',         owner: 'Finance',           lastUsed: 'last week' },
  { id: 28, brand: 'looker',      name: 'Looker',             type: 'SAML',  category: 'Data',         owner: 'Engineering',       lastUsed: '4 days ago' },
  { id: 29, brand: 'mongodb',     name: 'MongoDB Atlas',      type: 'SAML',  category: 'Data',         owner: 'Engineering',       lastUsed: '5 days ago' },
  { id: 30, brand: 'mssql',       name: 'SQL Server Reporting',type:'Link',  category: 'Data',         owner: 'IT Operations',     lastUsed: '2 weeks ago' },
  { id: 31, brand: 'zoom',        name: 'Zoom',               type: 'SAML',  category: 'Collaboration',owner: 'IT Operations',     lastUsed: '3 hours ago' },
  { id: 32, brand: 'box',         name: 'Box',                type: 'SAML',  category: 'Storage',      owner: 'IT Operations',     lastUsed: 'last week' },
  { id: 33, brand: 'dropbox',     name: 'Dropbox Business',   type: 'SAML',  category: 'Storage',      owner: 'IT Operations',     lastUsed: '3 weeks ago' },
  { id: 34, brand: 'notion',      name: 'Notion',             type: 'SAML',  category: 'Collaboration',owner: 'Engineering',       lastUsed: 'yesterday' },
  { id: 35, brand: 'figma',       name: 'Figma',              type: 'SAML',  category: 'Design',       owner: 'Engineering',       lastUsed: '2 days ago' },
  { id: 36, brand: 'miro',        name: 'Miro',               type: 'SAML',  category: 'Design',       owner: 'Engineering',       lastUsed: 'last week' },
  { id: 37, brand: 'asana',       name: 'Asana',              type: 'SAML',  category: 'Collaboration',owner: 'Sales',             lastUsed: '6 days ago' },
  { id: 38, brand: 'trello',      name: 'Trello',             type: 'OAuth', category: 'Collaboration',owner: 'Sales',             lastUsed: 'last month' },
  { id: 39, brand: 'smartsheet',  name: 'Smartsheet',         type: 'SAML',  category: 'Collaboration',owner: 'Finance',           lastUsed: '2 weeks ago' },
  { id: 40, brand: 'airtable',    name: 'Airtable',           type: 'OAuth', category: 'Collaboration',owner: 'Sales',             lastUsed: '9 days ago' },
  { id: 41, brand: 'linear',      name: 'Linear',             type: 'OIDC',  category: 'Engineering',  owner: 'Engineering',       lastUsed: 'today' },
  { id: 42, brand: 'zendesk',     name: 'Zendesk',            type: 'SAML',  category: 'Support',      owner: 'Support',           lastUsed: 'today' },
  { id: 43, brand: 'freshworks',  name: 'Freshservice',       type: 'SAML',  category: 'Support',      owner: 'Support',           lastUsed: '4 hours ago' },
  { id: 44, brand: 'intercom',    name: 'Intercom',           type: 'OAuth', category: 'Support',      owner: 'Support',           lastUsed: '2 days ago' },
  { id: 45, brand: 'hubspot',     name: 'HubSpot',            type: 'SAML',  category: 'Sales',        owner: 'Sales',             lastUsed: 'yesterday' },
  { id: 46, brand: 'docusign',    name: 'DocuSign',           type: 'SAML',  category: 'Legal',        owner: 'Compliance',        lastUsed: 'last week' },
  { id: 47, brand: 'adobe',       name: 'Adobe Creative Cloud',type:'SAML',  category: 'Design',       owner: 'Engineering',       lastUsed: '3 weeks ago' },
  { id: 48, brand: 'qualtrics',   name: 'Qualtrics',          type: 'SAML',  category: 'HR',           owner: 'Human Resources',   lastUsed: 'last month' },
  { id: 49, brand: 'okta',        name: 'Okta Verify',        type: 'OIDC',  category: 'Security',     owner: 'Security',          lastUsed: 'today' },
  { id: 50, brand: 'crowdstrike', name: 'CrowdStrike Falcon', type: 'SAML',  category: 'Security',     owner: 'Security',          lastUsed: 'today' },
  { id: 51, brand: 'zscaler',     name: 'Zscaler',            type: 'SAML',  category: 'Security',     owner: 'Security',          lastUsed: '5 hours ago' },
  { id: 52, brand: 'proofpoint',  name: 'Proofpoint',         type: 'SAML',  category: 'Security',     owner: 'Security',          lastUsed: 'yesterday' },
  { id: 53, brand: 'jamf',        name: 'Jamf Pro',           type: 'SAML',  category: 'Security',     owner: 'IT Operations',     lastUsed: '2 days ago' },
  { id: 54, brand: 'cloudflare',  name: 'Cloudflare',         type: 'SAML',  category: 'Cloud',        owner: 'Engineering',       lastUsed: 'last week' },
  { id: 55, brand: 'stripe',      name: 'Stripe',             type: 'OAuth', category: 'Finance',      owner: 'Finance',           lastUsed: '3 days ago' },
  { id: 56, brand: 'twilio',      name: 'Twilio',             type: 'OAuth', category: 'Platform',     owner: 'Engineering',       lastUsed: 'last week' },
]

export const APP_CATEGORIES = [...new Set(MY_APPS.map((a) => a.category))].sort()

export const LICENSE = {
  product: 'Tanflow Identity & Access Management',
  edition: 'Enterprise',
  licensedTo: 'Tanflow Corp',
  key: 'TFLW-IDAM-ENT-8842-XR91-2K6D',
  issued: '2026-01-01',
  expires: '2026-12-31',
  daysRemaining: 148,
  seats: 5000,
  seatsUsed: 3892,
  modules: ['Lifecycle', 'RBAC', 'Provisioning', 'Single Sign-On', 'Governance', 'MFA', 'Reporting', 'Consent'],
}

export const SIGNIN_SERIES = Array.from({ length: 24 }, (_, i) => ({
  t: `${String(i).padStart(2, '0')}:00`,
  success: Math.round(300 + 1900 * Math.exp(-Math.pow(i - 10, 2) / 26) + 220 * Math.exp(-Math.pow(i - 15, 2) / 14) + int(0, 90)),
  failed: Math.round(12 + 60 * Math.exp(-Math.pow(i - 10, 2) / 30) + int(0, 14)),
  blocked: Math.round(2 + 18 * Math.exp(-Math.pow(i - 3, 2) / 8) + int(0, 5)),
}))

export const EMAIL_TEMPLATES = [
  { id: 1, name: 'Welcome', subject: 'Your Tanflow account is ready', event: 'user.created', status: 'Active', updated: stamp(20) },
  { id: 2, name: 'Set password', subject: 'Set your Tanflow password', event: 'password.set', status: 'Active', updated: stamp(18) },
  { id: 3, name: 'MFA reset', subject: 'Your MFA factors were reset', event: 'mfa.reset', status: 'Active', updated: stamp(14) },
  { id: 4, name: 'Attestation reminder', subject: 'Action required: access review closes soon', event: 'recert.reminder', status: 'Active', updated: stamp(9) },
  { id: 5, name: 'Account locked', subject: 'Your Tanflow account has been locked', event: 'user.locked', status: 'Inactive', updated: stamp(40) },
]

export const DELIVERY_LOG = Array.from({ length: 26 }, (_, i) => {
  const u = USERS[(i * 4) % USERS.length]
  return { id: i + 1, ts: stamp(Math.floor(i / 6), 20 - (i % 18)), channel: i % 4 === 0 ? 'SMS' : 'Email', event: pick(['user.created', 'password.set', 'mfa.reset', 'recert.reminder']), recipient: i % 4 === 0 ? u.mobileNo : u.email, username: u.username, status: i % 9 === 3 ? 'Failed' : 'Delivered', detail: i % 9 === 3 ? '550 mailbox unavailable' : '250 OK' }
})

export const CONSENTS = [
  { id: 1, name: 'Privacy notice', version: 'v3.1', mandatory: true, status: 'Active', accepted: 3690, pending: 202, effective: stamp(60) },
  { id: 2, name: 'Acceptable use policy', version: 'v2.0', mandatory: true, status: 'Active', accepted: 3540, pending: 352, effective: stamp(90) },
  { id: 3, name: 'Biometric consent', version: 'v1.2', mandatory: false, status: 'Active', accepted: 1860, pending: 2032, effective: stamp(30) },
]

export const nextId = (arr) => arr.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1
