/* ---------------------------------------------------------------------------
   The seeded register of external user federation providers.

   Kept free of heavier imports: the navigation badge reads this on every page
   (lib/useBadges), so it must not pull the provider model into the console's
   first load. That is why the vendor list, the defaults and the records live
   here as plain data and everything that reasons about them lives next door in
   federationData.

   `status` is the verdict the directory last gave a provider. Nothing on the
   provider card shows it — the client's screens carry the Enabled toggle and
   four facts, and no more — but the badge reads it, and the connection and
   authentication tests on the form reproduce it against the same demo
   directories, so the amber dot in the sidebar and the failure the form
   reports are always the same failure.
   ------------------------------------------------------------------------- */

/* The vendors the client's Select Option offers, in the order it offers them. */
export const VENDORS = [
  { value: 'ad', label: 'Active Directory' },
  { value: 'rhds', label: 'Red Hat Directory Server' },
  { value: 'tivoli', label: 'Tivoli' },
  { value: 'edirectory', label: 'Novell eDirectory' },
  { value: 'other', label: 'Other' },
]

export const vendorLabel = (v) => {
  const hit = VENDORS.find((o) => o.value === v)
  return hit ? hit.label : ''
}

/* The four fields Select Option governs. Named once, here, because three
   places have to agree on the list: the defaults below, the patch that
   re-shapes them when the vendor changes, and the guard that refuses to
   overwrite one the operator has already typed into. */
export const VENDOR_ATTR_KEYS = ['usernameAttr', 'rdnAttr', 'uuidAttr', 'userObjectClasses']

/* What each product calls those four. This is why Select Option sits in the
   header of the form rather than being a label on the card: it is an input,
   and answering it answers four questions further down the page.

   Each row is that vendor's own convention. Active Directory names an entry by
   cn and identifies it for life by objectGUID; eDirectory uses guid, Red Hat
   Directory Server nsuniqueid, Tivoli uniqueidentifier. A server nobody has
   named is taken to be a standards-following LDAPv3 one, which is what
   entryUUID and inetOrgPerson are. */
export const VENDOR_DEFAULTS = {
  ad: {
    usernameAttr: 'cn',
    rdnAttr: 'cn',
    uuidAttr: 'objectGUID',
    userObjectClasses: 'person, organizationalPerson, user',
  },
  rhds: {
    usernameAttr: 'uid',
    rdnAttr: 'uid',
    uuidAttr: 'nsuniqueid',
    userObjectClasses: 'inetOrgPerson, organizationalPerson',
  },
  tivoli: {
    usernameAttr: 'uid',
    rdnAttr: 'uid',
    uuidAttr: 'uniqueidentifier',
    userObjectClasses: 'inetOrgPerson, organizationalPerson',
  },
  edirectory: {
    usernameAttr: 'uid',
    rdnAttr: 'uid',
    uuidAttr: 'guid',
    userObjectClasses: 'inetOrgPerson, organizationalPerson',
  },
  other: {
    usernameAttr: 'uid',
    rdnAttr: 'uid',
    uuidAttr: 'entryUUID',
    userObjectClasses: 'inetOrgPerson, organizationalPerson',
  },
}

/* What a blank Add Provider form starts as — the client's defaults for a
   provider nobody has configured yet, vendor Other.

   These belong to a provider that does not exist. One that does renders its
   own saved values: every record below carries all of these keys, so spreading
   this underneath a record in `draftOf` only ever fills a gap, never replaces
   an answer somebody already gave. Correcting a default here must not move a
   saved provider, and it does not.

   Edit mode starts empty so the control can show `Select Edit Mode`: a
   preselected WRITABLE is a decision about somebody else's directory that
   nobody made. Batch size starts empty for the same reason — the server's own
   limit is not this form's to guess. */
export const PROVIDER_DEFAULTS = {
  enabled: true,
  status: 'Healthy',
  lastError: '',

  connectionUrl: '',
  startTls: false,
  truststoreSpi: 'Always',
  connectionPooling: true,
  connectionTimeout: '',
  bindType: 'simple',
  bindDn: '',
  /* The credential itself is never held in the record. The directory keeps it;
     this only remembers that one was set, which is what the form's "the stored
     credential is hidden" note is telling the operator. */
  credentialStored: false,

  editMode: '',
  usersDn: '',
  relativeCreationDn: '',
  ...VENDOR_DEFAULTS.other,
  userLdapFilter: '',
  searchScope: 'One Level',
  readTimeout: '',
  pagination: true,
  referral: '',

  importUsers: true,
  syncRegistrations: false,
  batchSize: '',
  removeInvalid: true,
  periodicFullSync: false,
  periodicChangedSync: false,

  allowKerberos: false,
  kerberosPasswordAuth: false,

  cachePolicy: 'DEFAULT',

  ldapv3PasswordModify: false,
  validatePasswordPolicy: false,
  trustEmail: false,
  connectionTrace: false,
}

export const FEDERATIONS = [
  {
    id: 1,
    name: 'ldap',
    vendor: 'other',
    enabled: true,
    status: 'Healthy',
    lastError: '',

    connectionUrl: 'ldap://10.0.0.231:389',
    startTls: false,
    truststoreSpi: 'Always',
    connectionPooling: true,
    connectionTimeout: '',
    bindType: 'simple',
    bindDn: 'cn=Manager,dc=tanflow,dc=com',
    credentialStored: true,

    editMode: 'WRITABLE',
    usersDn: 'ou=demo1,dc=tanflow,dc=com',
    relativeCreationDn: '',
    usernameAttr: 'uid',
    rdnAttr: 'uid',
    uuidAttr: 'entryUUID',
    userObjectClasses: 'inetOrgPerson, posixAccount',
    userLdapFilter: '',
    searchScope: 'Subtree',
    readTimeout: '',
    pagination: false,
    referral: '',

    importUsers: true,
    syncRegistrations: true,
    batchSize: '200',
    removeInvalid: true,
    periodicFullSync: true,
    periodicChangedSync: true,

    allowKerberos: false,
    kerberosPasswordAuth: false,

    cachePolicy: 'DEFAULT',

    ldapv3PasswordModify: false,
    validatePasswordPolicy: false,
    trustEmail: false,
    connectionTrace: false,
    rev: 0,
  },
  {
    id: 2,
    name: 'corp-ad',
    vendor: 'ad',
    enabled: true,
    status: 'Healthy',
    lastError: '',

    connectionUrl: 'ldaps://dc01.corp.tanflow.com:636',
    startTls: false,
    truststoreSpi: 'Always',
    connectionPooling: true,
    connectionTimeout: '5000',
    bindType: 'simple',
    bindDn: 'cn=svc_idam,ou=Service Accounts,dc=corp,dc=tanflow,dc=com',
    credentialStored: true,

    /* Read only: the corporate forest is mastered by the Windows team, so the
       console reads it and writes nothing back. */
    editMode: 'READ_ONLY',
    usersDn: 'ou=people,dc=corp,dc=tanflow,dc=com',
    relativeCreationDn: '',
    /* sAMAccountName rather than Active Directory's own default of cn: this
       forest signs people in by their pre-Windows-2000 name. It is exactly the
       hand-set value a vendor change must leave alone. */
    usernameAttr: 'sAMAccountName',
    rdnAttr: 'cn',
    uuidAttr: 'objectGUID',
    userObjectClasses: 'person, organizationalPerson, user',
    userLdapFilter: '',
    searchScope: 'Subtree',
    readTimeout: '10000',
    pagination: true,
    referral: 'ignore',

    importUsers: true,
    syncRegistrations: false,
    batchSize: '1000',
    removeInvalid: true,
    periodicFullSync: true,
    periodicChangedSync: true,

    allowKerberos: true,
    kerberosPasswordAuth: false,

    cachePolicy: 'DEFAULT',

    ldapv3PasswordModify: false,
    validatePasswordPolicy: true,
    trustEmail: true,
    connectionTrace: false,
    rev: 0,
  },
  {
    id: 3,
    name: 'partner-ds',
    vendor: 'rhds',
    /* Switched off because it cannot bind: the service account it was given
       is no longer in the partner directory. The form's Test authentication
       reports exactly this, and the sidebar badge is red for the same reason. */
    enabled: false,
    status: 'Failed',
    lastError: 'Invalid credentials (LDAP result 49) — the bind account was removed from the partner directory.',

    connectionUrl: 'ldap://ds-partners.tanflow.io:389',
    startTls: true,
    truststoreSpi: 'Always',
    connectionPooling: false,
    connectionTimeout: '3000',
    bindType: 'simple',
    bindDn: 'cn=svc_partner,ou=Services,dc=partners,dc=tanflow,dc=io',
    credentialStored: true,

    editMode: 'UNSYNCED',
    usersDn: 'ou=people,dc=partners,dc=tanflow,dc=io',
    relativeCreationDn: 'ou=federated',
    usernameAttr: 'uid',
    rdnAttr: 'uid',
    uuidAttr: 'nsuniqueid',
    userObjectClasses: 'inetOrgPerson, organizationalPerson',
    userLdapFilter: '(objectClass=inetOrgPerson)',
    searchScope: 'One Level',
    readTimeout: '',
    pagination: false,
    referral: 'follow',

    importUsers: true,
    syncRegistrations: true,
    batchSize: '200',
    removeInvalid: false,
    periodicFullSync: false,
    periodicChangedSync: false,

    allowKerberos: false,
    kerberosPasswordAuth: false,

    cachePolicy: 'NO_CACHE',

    ldapv3PasswordModify: false,
    validatePasswordPolicy: false,
    trustEmail: false,
    connectionTrace: true,
    rev: 0,
  },
]
