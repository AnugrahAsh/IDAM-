/**
 * The SSO application field register.
 *
 * Both protocols are described declaratively rather than as hand-written JSX,
 * because the same description has to drive three surfaces: the add/edit form,
 * the read-only Application Information tab, and the metadata export. Written
 * three times they drift, and a field that exists on the form but not in the
 * export is the kind of gap nobody notices until an integration fails.
 *
 * `advanced: true` sections are collapsed by default. They carry defaults that
 * are already the recommended baseline, so an operator registering a normal
 * application never has to open them — but every field in the specification is
 * present and editable for the one who does.
 */

const URL_HINT = 'Must include http:// or https://'

// ---------------------------------------------------------------- OIDC ----

const SIG_ALGS = ['RS256', 'RS384', 'RS512', 'PS256', 'PS512', 'ES256', 'ES384', 'ES512', 'HS256', 'HS512']
const ENC_KEY_ALGS = ['None', 'RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5']
const ENC_CONTENT_ALGS = ['None', 'A128GCM', 'A192GCM', 'A256GCM', 'A128CBC-HS256', 'A256CBC-HS512']
const ANY_ALGS = ['Any', 'None', ...SIG_ALGS]

export const OIDC_SECTIONS = [
  {
    id: 'general',
    title: 'General settings',
    sub: 'How the client identifies itself. The name, description and image are held once, in Basics.',
    fields: [
      { id: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'my-oidc-client', hint: 'Unique identifier for the client application.' },
      { id: 'applicationUrl', label: 'Application URL', type: 'text', required: true, placeholder: 'https://app.example.com', hint: `Primary entry URL for the application. ${URL_HINT}` },
    ],
  },
  {
    id: 'access',
    title: 'Access settings',
    sub: 'Where the platform sends a user, and the documents it links to on the consent screen.',
    fields: [
      { id: 'rootUrl', label: 'Root URL', type: 'text', placeholder: 'https://app.example.com/', hint: URL_HINT },
      { id: 'homeUrl', label: 'Home URL', type: 'text', placeholder: 'https://app.example.com/home', hint: URL_HINT },
      { id: 'adminUrl', label: 'Admin URL', type: 'text', placeholder: 'https://app.example.com/admin', hint: URL_HINT },
      { id: 'logoUrl', label: 'Logo URL', type: 'text', placeholder: 'https://app.example.com/assets/logo.png', hint: URL_HINT },
      { id: 'policyUrl', label: 'Policy URL', type: 'text', placeholder: 'https://app.example.com/privacy', hint: URL_HINT },
      { id: 'tosUrl', label: 'Terms of service URL', type: 'text', placeholder: 'https://app.example.com/terms', hint: URL_HINT },
    ],
  },
  {
    id: 'capability',
    title: 'Capability configuration',
    sub: 'Which OAuth 2.0 grants this client may run. Everything not needed should stay off.',
    toggleStyle: 'card',
    fields: [
      { id: 'clientAuthentication', label: 'Client authentication', type: 'toggle', default: true, hint: 'On for confidential clients (server backends). Off for public clients — SPAs and mobile apps.' },
      { id: 'authorization', label: 'Authorization', type: 'toggle', default: false, hint: 'Only when fine-grained RBAC/ABAC policies are managed by this platform.' },
      { id: 'standardFlow', label: 'Standard flow', type: 'toggle', default: true, hint: 'Authorization Code Flow. Recommended for web and mobile applications.' },
      { id: 'directAccessGrants', label: 'Direct access grants', type: 'toggle', default: false, hint: 'Resource Owner Password Credentials. Discouraged — it puts the password through the client.' },
      { id: 'implicitFlow', label: 'Implicit flow', type: 'toggle', default: false, hint: 'Legacy. Use the standard flow with PKCE instead.' },
      { id: 'serviceAccountsRoles', label: 'Service accounts roles', type: 'toggle', default: true, hint: 'Client Credentials Grant. Required for machine-to-machine calls.' },
      { id: 'deviceAuthGrant', label: 'OAuth 2.0 device authorization grant', type: 'toggle', default: false, hint: 'For input-constrained devices — smart TVs, CLI tools.' },
      { id: 'cibaGrant', label: 'OIDC CIBA grant', type: 'toggle', default: false, hint: 'Client Initiated Backchannel Authentication.' },
      { id: 'tokenExchange', label: 'Standard token exchange', type: 'toggle', default: false, hint: 'Token impersonation and delegation.' },
    ],
  },
  {
    id: 'logout',
    title: 'Logout settings',
    sub: 'How a session ends at the application when it ends at the platform.',
    toggleStyle: 'card',
    fields: [
      { id: 'frontChannelLogoutUrl', label: 'Front channel logout URL', type: 'text', span: 2, placeholder: 'https://app.example.com/logout/frontchannel', hint: URL_HINT },
      { id: 'backChannelLogoutUrl', label: 'Back channel logout URL', type: 'text', span: 2, placeholder: 'https://app.example.com/logout/backchannel', hint: URL_HINT },
      { id: 'frontchannelLogout', label: 'Frontchannel logout', type: 'toggle', default: true },
      { id: 'backchannelLogoutSessionRequired', label: 'Backchannel logout session required', type: 'toggle', default: true },
      { id: 'backchannelLogoutRevokeOffline', label: 'Backchannel logout revoke offline sessions', type: 'toggle', default: true },
    ],
  },
  {
    id: 'uris',
    title: 'Valid URI settings',
    sub: 'The allow-lists an authorization response may be returned to. A wildcard here is an open redirect.',
    fields: [
      { id: 'webOrigins', label: 'Web origins', type: 'list', span: 2, placeholder: 'https://app.example.com', hint: 'CORS origins permitted to call the token endpoint.' },
      { id: 'redirectUris', label: 'Redirect URIs', type: 'list', required: true, span: 2, placeholder: 'https://app.example.com/callback', hint: 'One per line. The authorization response is only returned to these.' },
      { id: 'postLogoutRedirectUris', label: 'Post logout redirect URIs', type: 'list', span: 2, placeholder: 'https://app.example.com/logged-out' },
      { id: 'validRequestUris', label: 'Valid request URIs', type: 'list', span: 2, placeholder: 'https://app.example.com/*' },
    ],
  },
  {
    id: 'fineGrain',
    title: 'Fine grain configuration',
    sub: 'Signing and encryption algorithms. The defaults are the recommended baseline.',
    advanced: true,
    fields: [
      { id: 'accessTokenSigAlg', label: 'Access token signature algorithm', type: 'select', options: SIG_ALGS, default: 'RS256' },
      { id: 'idTokenSigAlg', label: 'ID token signature algorithm', type: 'select', options: SIG_ALGS, default: 'RS256' },
      { id: 'idTokenEncKeyAlg', label: 'ID token encryption key algorithm', type: 'select', options: ENC_KEY_ALGS, default: 'None' },
      { id: 'idTokenEncContentAlg', label: 'ID token encryption content algorithm', type: 'select', options: ENC_CONTENT_ALGS, default: 'None' },
      { id: 'userInfoSigAlg', label: 'User info signed response algorithm', type: 'select', options: SIG_ALGS, default: 'RS256' },
      { id: 'userInfoEncKeyAlg', label: 'User info response encryption key algorithm', type: 'select', options: ENC_KEY_ALGS, default: 'None' },
      { id: 'userInfoEncContentAlg', label: 'User info response encryption content algorithm', type: 'select', options: ENC_CONTENT_ALGS, default: 'None' },
      { id: 'requestObjectSigAlg', label: 'Request object signature algorithm', type: 'select', options: ANY_ALGS, default: 'Any' },
      { id: 'requestObjectEncAlg', label: 'Request object encryption algorithm', type: 'select', options: ['Any', ...ENC_KEY_ALGS], default: 'Any' },
      { id: 'requestObjectContentEncAlg', label: 'Request object content encryption algorithm', type: 'select', options: ['Any', ...ENC_CONTENT_ALGS], default: 'Any' },
      { id: 'requestObjectRequired', label: 'Request object required', type: 'select', options: ['Not required', 'Request or request_uri', 'Request only', 'Request_uri only'], default: 'Not required' },
      { id: 'authzResponseSigAlg', label: 'Authorization response signature algorithm', type: 'select', options: ['None', ...SIG_ALGS], default: 'RS256' },
      { id: 'authzResponseEncKeyAlg', label: 'Authorization response encryption key algorithm', type: 'select', options: ENC_KEY_ALGS, default: 'None' },
      { id: 'authzResponseEncContentAlg', label: 'Authorization response encryption content algorithm', type: 'select', options: ENC_CONTENT_ALGS, default: 'None' },
      { id: 'allowRefreshInTokenExchange', label: 'Allow refresh token in standard token exchange', type: 'toggle', default: false, hint: 'Security hardening — leave off unless delegation requires it.' },
    ],
  },
  {
    id: 'compatibility',
    title: 'OpenID Connect compatibility modes',
    sub: 'Deviations from the default protocol behaviour, for clients that need them.',
    toggleStyle: 'card',
    advanced: true,
    fields: [
      { id: 'excludeSessionState', label: 'Exclude session state from authentication response', type: 'toggle', default: false },
      { id: 'excludeIssuer', label: 'Exclude issuer from authentication response', type: 'toggle', default: false },
      { id: 'useRefreshTokens', label: 'Use refresh tokens', type: 'toggle', default: true },
      { id: 'useRefreshTokensClientCredentials', label: 'Use refresh tokens for client credentials grant', type: 'toggle', default: false },
      { id: 'lowercaseBearer', label: 'Use lower-case bearer type in token responses', type: 'toggle', default: false },
      { id: 'parRequired', label: 'Pushed authorization request (PAR) required', type: 'toggle', default: false },
      { id: 'lightweightAccessToken', label: 'Always use lightweight access token', type: 'toggle', default: false },
      { id: 'mtlsBoundTokens', label: 'OAuth mutual TLS certificate bound access tokens', type: 'toggle', default: false },
      { id: 'jwtClaimInIntrospection', label: 'Support JWT claim in introspection response', type: 'toggle', default: true },
      { id: 'atJwtHeaderType', label: 'Use at+jwt as access token header type', type: 'toggle', default: false },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced settings',
    sub: 'PKCE and the session lifespans this client runs under.',
    advanced: true,
    fields: [
      { id: 'authenticationFlow', label: 'Authentication flow', type: 'select', options: ['Standard Flow', 'Browser Flow', 'NoAccess'], default: 'Standard Flow' },
      { id: 'directFlow', label: 'Direct flow', type: 'select', options: ['Direct Grants', 'None'], default: 'Direct Grants' },
      { id: 'pkceMethod', label: 'PKCE method', type: 'select', options: ['S256', 'plain', 'None'], default: 'S256', hint: 'Mandatory for public clients and single-page applications.' },
      { id: 'accessTokenLifespan', label: 'Access token lifespan', type: 'number', default: 300, unit: 'seconds', hint: '300 = 5 minutes.' },
      { id: 'clientSessionIdle', label: 'Client session idle', type: 'number', default: 1800, unit: 'seconds', hint: '1800 = 30 minutes.' },
      { id: 'clientSessionMax', label: 'Client session max', type: 'number', default: 36000, unit: 'seconds', hint: '36000 = 10 hours.' },
      { id: 'clientOfflineSessionIdle', label: 'Client offline session idle', type: 'number', default: 2592000, unit: 'seconds', hint: '2592000 = 30 days.' },
      { id: 'clientOfflineSessionMax', label: 'Client offline session max', type: 'number', default: 5184000, unit: 'seconds', hint: '5184000 = 60 days.' },
    ],
  },
]

// ---------------------------------------------------------------- SAML ----

export const SAML_SECTIONS = [
  {
    /* The configuration method decides how the endpoints are supplied, not
       which of them are asked for: metadata import adds an XML upload above the
       same fields and writes into them. The name and description of the
       application are collected once, in Basics, and are not repeated here. */
    id: 'general',
    title: 'General & display settings',
    sub: 'How this service provider is configured. The name, description and image are held once, in Basics.',
    fields: [
      { id: 'configMode', label: 'Configuration method', type: 'select', required: true, span: 2, options: ['Manual', 'Metadata Import'], default: 'Manual', hint: 'Metadata import fills the endpoints and certificate from the SP descriptor. Every field stays on screen either way, so what the descriptor supplied can be read and corrected.' },
    ],
  },
  {
    id: 'metadata',
    title: 'Service provider metadata',
    sub: 'Upload the SP descriptor. The entity ID, assertion consumer URL, logout URL and signing certificate are read from it and written into the fields below, where they can still be read and corrected.',
    showIf: (v) => v.configMode === 'Metadata Import',
    fields: [
      { id: 'metadataXml', label: 'Metadata XML', type: 'metadata', span: 2, required: true, hint: 'An EntityDescriptor document exported from the service provider.' },
    ],
  },
  {
    id: 'endpoints',
    title: 'Core access & endpoint settings',
    sub: 'Where assertions are sent, and where the user lands.',
    fields: [
      { id: 'clientId', label: 'Client ID', type: 'text', required: true, span: 2, placeholder: 'https://app.example.com/sp', hint: 'The service provider entity ID.' },
      { id: 'certificate', label: 'Certificate', type: 'textarea', span: 2, placeholder: '-----BEGIN CERTIFICATE-----', hint: 'X.509 public key, used to verify signed requests and encrypt assertions.' },
      { id: 'acsUrl', label: 'Consume assertion URL', type: 'text', required: true, span: 2, placeholder: 'https://app.example.com/saml/acs', hint: `The ACS endpoint. ${URL_HINT}` },
      { id: 'applicationUrl', label: 'Application URL', type: 'text', required: true, span: 2, placeholder: 'https://app.example.com', hint: URL_HINT },
      { id: 'idpInitiatedSsoRelayState', label: 'IDP initiated SSO relay state', type: 'text', placeholder: '/dashboard', hint: 'Where the user lands after an IdP-initiated sign-in.' },
      { id: 'idpInitiatedSsoUrl', label: 'IDP initiated SSO URL', type: 'text', placeholder: 'https://idp.example.com/sso/init', hint: URL_HINT },
      { id: 'homeUrl', label: 'Home URL', type: 'text', placeholder: 'https://app.example.com/home', hint: URL_HINT },
      { id: 'masterSamlProcessingUrl', label: 'Master SAML processing URL', type: 'text', placeholder: 'https://app.example.com/saml/process', hint: URL_HINT },
      { id: 'logoutPostUrl', label: 'Logout service POST binding URL', type: 'text', placeholder: 'https://app.example.com/saml/slo/post', hint: URL_HINT },
      { id: 'logoutRedirectUrl', label: 'Logout service redirect binding URL', type: 'text', placeholder: 'https://app.example.com/saml/slo/redirect', hint: URL_HINT },
    ],
  },
  {
    id: 'uris',
    /* The redirect allow-list is enforced by the platform, not read from the
       descriptor, so it is asked for whichever configuration method is chosen. */
    title: 'Valid URI settings',
    sub: 'The allow-lists a response may be returned to. Enforced by the platform whichever configuration method is used.',
    fields: [
      { id: 'redirectUris', label: 'Redirect URL', type: 'list', span: 2, required: true, placeholder: 'https://app.example.com/saml/acs', hint: 'Add as many as the service provider uses. A bare * permits any destination.' },
      { id: 'postLogoutRedirectUris', label: 'Post redirect URL', type: 'list', span: 2, placeholder: 'https://app.example.com/logged-out', hint: 'Where the browser is sent once the session has ended. Add as many as are in use.' },
    ],
  },
  {
    id: 'extended',
    title: 'Extended SAML configuration',
    sub: 'Artifact binding, alternative endpoints and the documents linked on the consent screen.',
    advanced: true,
    fields: [
      { id: 'artifactBindingUrl', label: 'Artifact binding URL', type: 'text', hint: URL_HINT },
      { id: 'artifactResolutionUrl', label: 'Artifact resolution service URL', type: 'text', hint: `Backend SOAP endpoint. ${URL_HINT}` },
      { id: 'acsRedirectUrl', label: 'Assertion consumer service redirect binding URL', type: 'text', span: 2, hint: URL_HINT },
      { id: 'logoutSoapUrl', label: 'Logout service SOAP binding URL', type: 'text', hint: URL_HINT },
      { id: 'logoutArtifactUrl', label: 'Logout service ARTIFACT binding URL', type: 'text', hint: URL_HINT },
      { id: 'rootUrl', label: 'Root URL', type: 'text', hint: `Base path for resolving relative endpoints. ${URL_HINT}` },
      { id: 'logoUrl', label: 'Logo URL', type: 'text', hint: URL_HINT },
      { id: 'policyUrl', label: 'Policy URL', type: 'text', hint: URL_HINT },
      { id: 'tosUrl', label: 'Terms of service URL', type: 'text', hint: URL_HINT },
    ],
  },
  {
    id: 'capabilities',
    title: 'SAML capabilities',
    sub: 'Protocol behaviours this service provider requires.',
    toggleStyle: 'card',
    advanced: true,
    fields: [
      { id: 'forceNameIdFormat', label: 'Force NameID format', type: 'toggle', default: false, hint: 'Use the configured format rather than negotiating it.' },
      { id: 'forcePostBinding', label: 'Force POST binding', type: 'toggle', default: true },
      { id: 'forceArtifactBinding', label: 'Force artifact binding', type: 'toggle', default: false },
      { id: 'includeAuthnStatement', label: 'Include AuthnStatement', type: 'toggle', default: true, hint: 'Adds the authentication context and timestamp to the assertion.' },
      { id: 'includeOneTimeUse', label: 'Include OneTimeUse condition', type: 'toggle', default: false, hint: 'Mitigates assertion replay.' },
      { id: 'allowEcpFlow', label: 'Allow ECP flow', type: 'toggle', default: false, hint: 'Enhanced Client or Proxy profile, for non-browser clients.' },
    ],
  },
  {
    /* Signature and encryption answer two different questions — can the
       recipient prove the assertion came from us, and can anyone in between
       read it — so they are two cards, each with its switches laid out as a
       grid of stated capabilities rather than a column of loose rows. */
    id: 'signature',
    title: 'Signature',
    sub: 'What is signed, and what the platform requires to be signed in return.',
    toggleStyle: 'card',
    fields: [
      { id: 'signDocuments', label: 'Sign documents', type: 'toggle', default: true, hint: 'Sign the whole SAML response.' },
      { id: 'signAssertions', label: 'Sign assertions', type: 'toggle', default: true, hint: 'Sign the assertion element inside the response.' },
      { id: 'clientSignature', label: 'Client signature required', type: 'toggle', default: true, hint: 'Reject unsigned authentication requests from this service provider.' },
      { id: 'optimizeRedirectSigningKeyLookup', label: 'Optimize redirect signing key lookup', type: 'toggle', default: false, hint: 'Send the key id on redirect bindings so the SP need not try every key.' },
      { id: 'signatureAlgorithm', label: 'Signature algorithm', type: 'select', options: ['RSA_SHA256', 'RSA_SHA512', 'RSA_SHA1', 'DSA_SHA1'], default: 'RSA_SHA256' },
      { id: 'samlSignatureKeyName', label: 'SAML signature key name', type: 'select', options: ['None', 'KEY_ID', 'CERT_SUBJECT'], default: 'None', hint: 'What is sent in the KeyInfo block.' },
      { id: 'canonicalizationMethod', label: 'Canonicalization method', type: 'select', options: ['Exclusive', 'Inclusive', 'Exclusive with comments', 'Inclusive with comments'], default: 'Exclusive', span: 2 },
    ],
  },
  {
    id: 'encryption',
    title: 'Encryption',
    sub: 'Confidentiality of the assertion in transit. Encryption uses the service provider certificate.',
    toggleStyle: 'card',
    fields: [
      { id: 'encryptAssertion', label: 'Encrypt assertion', type: 'toggle', default: false, hint: 'Encrypt the assertion so only the service provider can read it.' },
    ],
  },
  {
    id: 'logout',
    title: 'Logout settings',
    sub: 'How a session ends at the service provider when it ends at the platform.',
    advanced: true,
    fields: [
      { id: 'frontchannelLogout', label: 'Frontchannel logout', type: 'toggle', default: true, hint: 'Single logout through browser redirects rather than back-channel calls.' },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced settings & flow control',
    sub: 'Subject format and how long an assertion stays valid.',
    advanced: true,
    fields: [
      { id: 'authenticationFlow', label: 'Authentication flow', type: 'select', options: ['NoAccess', 'Browser Flow', 'Standard Flow'], default: 'NoAccess', hint: 'Access evaluation applied before an assertion is issued.' },
      { id: 'nameIdFormat', label: 'Name ID format', type: 'select', options: ['username', 'email', 'unspecified', 'transient', 'persistent'], default: 'username' },
      { id: 'assertionLifespan', label: 'Assertion lifespan', type: 'number', default: 300, unit: 'seconds', hint: 'How long a generated assertion stays valid.' },
    ],
  },
]

// ----------------------------------------------------------------- JWT ----

/**
 * A JWT application receives a signed token at a URL and nothing else. It has
 * no consent screen, no logout channel and no scopes, so asking for the OIDC
 * register would be asking for settings it can never use.
 */
export const JWT_SECTIONS = [
  {
    id: 'delivery',
    title: 'Token delivery',
    sub: 'Where the signed token is delivered. Everything else about this application is held in Basics.',
    fields: [
      { id: 'clientId', label: 'Client ID', type: 'text', required: true, span: 2, placeholder: 'my-jwt-client', hint: 'Unique identifier for the client application.' },
      { id: 'redirectUris', label: 'Redirect URL', type: 'list', span: 2, required: true, placeholder: 'https://app.example.com/callback', hint: 'The token is posted to these URLs and nowhere else. Add as many as the application uses.' },
    ],
  },
]

// ---------------------------------------------------------------- Link ----

/** A link application opens a URL. It asserts nothing, so it has no register of
 *  its own — the destination is edited by the link form. */
export const LINK_SECTIONS = []

export const SECTIONS_FOR = (protocol) => {
  if (protocol === 'SAML') return SAML_SECTIONS
  if (protocol === 'JWT') return JWT_SECTIONS
  if (protocol === 'Link') return LINK_SECTIONS
  return OIDC_SECTIONS
}

/** Sections currently on screen for these values. A section hidden by the
 *  configuration method is neither rendered nor validated. */
export const VISIBLE_SECTIONS = (protocol, values = {}) =>
  SECTIONS_FOR(protocol).filter((sec) => !sec.showIf || sec.showIf(values))

/** A blank record with every default from the specification already applied. */
export const defaultsFor = (protocol) => {
  const out = {}
  SECTIONS_FOR(protocol).forEach((sec) => sec.fields.forEach((f) => {
    if (f.default !== undefined) out[f.id] = f.default
    else if (f.type === 'toggle') out[f.id] = false
    else if (f.type === 'list') out[f.id] = ''
    else out[f.id] = ''
  }))
  return out
}

/** Every required field the operator has not filled in, counting only the
 *  sections the chosen configuration method actually shows. */
export const missingRequired = (protocol, values) => VISIBLE_SECTIONS(protocol, values)
  .flatMap((sec) => sec.fields.filter((f) => f.required))
  .filter((f) => !String(values[f.id] ?? '').trim())


/** Only the keys an import actually resolved. A descriptor with no logout URL
 *  must not blank the one already typed in. */
export const cleanPrefill = (patch) => Object.fromEntries(
  Object.entries(patch || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
)
