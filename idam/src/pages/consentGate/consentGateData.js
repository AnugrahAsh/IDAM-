import { LANG_LABEL } from '../consentManagement/ConsentBodyEditor'
import { CAPTURABLE } from '../consentManagement/consentsData'
import { CONSENT_TYPE_LABEL } from '../consentManagement/consentTemplateData'
import { EMPLOYEE_TYPES } from '../consentManagement/InitiateForm'
import { LOOKUPS, ORGS, USERS } from '../../data/seed'
import { dateText, now } from '../../lib/clock'

/**
 * The two consent screens an identity actually sees.
 *
 * Consent Management is the administrator's half: it defines notices, publishes
 * versions and initiates requests. This is the other half — the gate shown to a
 * signed-in identity who still owes an answer, and the tokenised registration
 * page opened from the mail that an initiation sends. Both read a *document*,
 * which is the same artefact Consent Templates author: a title, a version, and
 * a body per language rather than one string.
 */

const DAY = 86400000
const dayFrom = (n) => dateText(new Date(now().getTime() + n * DAY))

/* --- Languages ---------------------------------------------------------------

   The console already names the languages a tenant may publish in
   (ConsentBodyEditor.LANGUAGES), and that list is the authority for the English
   name of each. Two things are added here and nowhere else, because they belong
   to *reading* a notice rather than to authoring one: the endonym, since a
   reader looking for their own language looks for "Français" and not "French";
   and Dutch, which the tenant in the reference publishes in. */
const ENDONYM = {
  en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch',
  hi: 'हिन्दी', ar: 'العربية', ur: 'اردو', nl: 'Nederlands',
}
const EXTRA_LABEL = { nl: 'Dutch' }

/** "Français (French)" — the endonym first, then the name the console uses. */
export const languageLabel = (code) => {
  const english = LANG_LABEL[code] || EXTRA_LABEL[code] || code
  const native = ENDONYM[code]
  return native && native !== english ? `${native} (${english})` : english
}

/* Mirrors the authoring direction the body editor sets, so a right-to-left
   notice is read in the direction it was written in. */
const RTL = new Set(['ar', 'ur'])
export const isRtl = (code) => RTL.has(code)

/** The languages one document is published in — a property of that document. */
export const languagesOf = (doc) => Object.keys(doc.bodies)

/** The body in the asked-for language, falling back the way the editor promises. */
export const bodyOf = (doc, code) => doc.bodies[code] || doc.bodies[doc.defaultLang] || ''

/* --- What an acceptance record keeps ----------------------------------------- */

const CAPTURABLE_LABEL = Object.fromEntries(CAPTURABLE.map((a) => [a.id, a.label]))

/**
 * "Acceptance timestamp, Source IP address and Browser and device".
 *
 * The labels are the register's own and are left in its capitalisation: these
 * are the names of stored fields, and lowercasing them turns "Source IP
 * address" into something that reads like prose and is no longer the field.
 */
export const capturedText = (ids = []) => {
  const names = ids.map((id) => CAPTURABLE_LABEL[id] || id)
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export const consentTypeText = (doc) => CONSENT_TYPE_LABEL[doc.consentType] || doc.consentType

/** The date the identity is asked again, from the document's own validity. */
export const nextAskedOn = (doc) => {
  const n = Number(doc.validityPeriod)
  if (!n) return null
  const days = doc.validityUnit === 'Years' ? n * 365 : doc.validityUnit === 'Days' ? n : n * 30
  return dayFrom(days)
}

/* --- The documents ------------------------------------------------------------

   Seeded HTML, because that is what a published notice is: the editor stores
   markup and every reader is shown the markup that was authored. */

const GATE_EN = [
  '<h3>User Account Creation and Data Processing Consent</h3>',
  '<p>Tanflow Ventures creates an account in your name so you can reach the systems your role requires. This notice says what is recorded about you, why, for how long, and what you may ask us to do about it.</p>',
  '<h4>What is processed</h4>',
  '<ul>',
  '<li><strong>Identity.</strong> Your name, username, work email address and employee code.</li>',
  '<li><strong>Placement.</strong> The organization, office and manager you are attached to.</li>',
  '<li><strong>Access.</strong> The applications, roles and groups granted to you, and when each was granted or removed.</li>',
  '<li><strong>Evidence of this acceptance.</strong> The version you are reading, the time you accept, your source address and your browser.</li>',
  '</ul>',
  '<h4>Why</h4>',
  '<p>To administer the account, to control who reaches which system, and to be able to show an auditor that the control held. The lawful basis is the contract under which you work with us, together with the consent you give below.</p>',
  '<h4>How long</h4>',
  '<p>Account records are kept for the length of your engagement and seven years after it ends. This acceptance itself is valid for twelve months, after which you are asked again. A notice republished at a new version asks again immediately.</p>',
  '<h4>What you may ask for</h4>',
  '<p>You may see the record of this acceptance, ask for an inaccurate attribute to be corrected, and withdraw this consent from your profile at any time. Withdrawal stops further processing on this basis; it does not undo processing already carried out.</p>',
  '<h4>If you decline</h4>',
  '<p>An account cannot be operated without this consent, so declining ends the session and nothing further is recorded. You may come back and accept at any time.</p>',
].join('')

const GATE_FR = [
  '<h3>Consentement à la création de compte et au traitement des données</h3>',
  '<p>Tanflow Ventures crée un compte à votre nom afin que vous puissiez accéder aux systèmes que votre fonction exige. Cet avis indique ce qui est enregistré à votre sujet, pourquoi, pendant combien de temps, et ce que vous pouvez nous demander.</p>',
  '<h4>Données traitées</h4>',
  '<ul>',
  '<li><strong>Identité.</strong> Vos nom et prénom, votre identifiant, votre adresse professionnelle et votre matricule.</li>',
  '<li><strong>Rattachement.</strong> L’organisation, le bureau et le responsable auxquels vous êtes rattaché.</li>',
  '<li><strong>Accès.</strong> Les applications, rôles et groupes qui vous sont accordés, et la date de chaque octroi ou retrait.</li>',
  '<li><strong>Preuve de ce consentement.</strong> La version que vous lisez, l’heure de votre acceptation, votre adresse source et votre navigateur.</li>',
  '</ul>',
  '<h4>Finalité</h4>',
  '<p>Administrer le compte, contrôler qui accède à quel système, et pouvoir démontrer à un auditeur que ce contrôle a été appliqué. La base légale est le contrat qui nous lie, ainsi que le consentement que vous donnez ci-dessous.</p>',
  '<h4>Durée</h4>',
  '<p>Les enregistrements de compte sont conservés pendant la durée de votre engagement et sept ans après sa fin. Le présent consentement est valable douze mois, au terme desquels il vous sera demandé à nouveau. Un avis republié dans une nouvelle version est redemandé immédiatement.</p>',
  '<h4>Vos droits</h4>',
  '<p>Vous pouvez consulter l’enregistrement de cette acceptation, demander la correction d’un attribut inexact et retirer ce consentement à tout moment depuis votre profil. Le retrait met fin au traitement ultérieur ; il n’annule pas le traitement déjà effectué.</p>',
  '<h4>En cas de refus</h4>',
  '<p>Un compte ne peut pas fonctionner sans ce consentement : refuser met fin à la session et rien d’autre n’est enregistré. Vous pouvez revenir et accepter à tout moment.</p>',
].join('')

const GATE_ES = [
  '<h3>Consentimiento para la creación de la cuenta y el tratamiento de datos</h3>',
  '<p>Tanflow Ventures crea una cuenta a su nombre para que pueda acceder a los sistemas que su función requiere. Este aviso explica qué se registra sobre usted, por qué, durante cuánto tiempo y qué puede pedirnos.</p>',
  '<h4>Datos tratados</h4>',
  '<ul>',
  '<li><strong>Identidad.</strong> Su nombre y apellidos, su usuario, su correo profesional y su número de empleado.</li>',
  '<li><strong>Adscripción.</strong> La organización, la oficina y el responsable a los que está adscrito.</li>',
  '<li><strong>Accesos.</strong> Las aplicaciones, roles y grupos que se le conceden, y cuándo se concedió o retiró cada uno.</li>',
  '<li><strong>Prueba de esta aceptación.</strong> La versión que está leyendo, la hora en que acepta, su dirección de origen y su navegador.</li>',
  '</ul>',
  '<h4>Finalidad</h4>',
  '<p>Administrar la cuenta, controlar quién accede a cada sistema y poder demostrar ante un auditor que ese control se aplicó. La base jurídica es el contrato que nos vincula, junto con el consentimiento que presta a continuación.</p>',
  '<h4>Plazo</h4>',
  '<p>Los registros de la cuenta se conservan durante su vinculación y siete años después de que termine. Esta aceptación es válida doce meses, transcurridos los cuales se le vuelve a preguntar. Un aviso republicado en una versión nueva se vuelve a solicitar de inmediato.</p>',
  '<h4>Sus derechos</h4>',
  '<p>Puede consultar el registro de esta aceptación, pedir la corrección de un atributo inexacto y retirar este consentimiento en cualquier momento desde su perfil. La retirada detiene el tratamiento posterior; no deshace el ya realizado.</p>',
  '<h4>Si lo rechaza</h4>',
  '<p>Una cuenta no puede operarse sin este consentimiento, de modo que rechazarlo finaliza la sesión y no se registra nada más. Puede volver y aceptar cuando quiera.</p>',
].join('')

/** The notice shown after sign-in when the signed-in identity still owes an answer. */
export const GATE_DOCUMENT = {
  id: 'gate',
  tenant: 'Tanflow Ventures',
  code: 'ACCOUNT_CREATION',
  name: 'User Account Creation and Data Processing Consent',
  title: 'User Account Creation and Data Processing Consent',
  version: '1.3',
  defaultLang: 'en',
  bodies: { en: GATE_EN, fr: GATE_FR, es: GATE_ES },
  consentType: 'MANDATORY',
  owner: 'Legal',
  validityPeriod: '12',
  validityUnit: 'Months',
  attributes: ['timestamp', 'ipAddress', 'browser'],
}

const REG_EN = [
  '<h3>Registration and Identity Verification Consent</h3>',
  '<p>You have been invited to register an identity with Tanflow Ventures. This notice explains what the registration form collects and what happens to it after you submit it.</p>',
  '<h4>What you are giving us</h4>',
  '<ul>',
  '<li><strong>Contact and placement.</strong> Your name, mobile number, organization, manager and office, together with the attributes your tenant defines for its own records.</li>',
  '<li><strong>Verification.</strong> Any document you attach, held against this registration alone and shown only to the administrators reviewing it.</li>',
  '<li><strong>Evidence of this acceptance.</strong> The version you are reading, the time you agree, your source address and your browser.</li>',
  '</ul>',
  '<h4>What happens next</h4>',
  '<p>Nothing is created when you press Submit. An administrator checks what you entered and the document you attached; only then is an identity provisioned and an activation mail sent to the address this invitation was issued against.</p>',
  '<h4>How long the link lives</h4>',
  '<p>The link in your invitation is single-use and expires on the date shown on this page. Once it has been used or has expired it cannot be reopened, and a new invitation has to be issued.</p>',
  '<h4>Withdrawing</h4>',
  '<p>If you do not submit the form, nothing is retained beyond the invitation itself. After your identity exists you may withdraw this consent from your own profile at any time.</p>',
].join('')

const REG_FR = [
  '<h3>Consentement à l’inscription et à la vérification d’identité</h3>',
  '<p>Vous avez été invité à créer une identité chez Tanflow Ventures. Cet avis explique ce que le formulaire d’inscription recueille et ce qu’il en advient après l’envoi.</p>',
  '<h4>Ce que vous nous transmettez</h4>',
  '<ul>',
  '<li><strong>Coordonnées et rattachement.</strong> Vos nom et prénom, votre numéro de mobile, votre organisation, votre responsable et votre bureau, ainsi que les attributs que votre organisation définit pour ses propres registres.</li>',
  '<li><strong>Vérification.</strong> Tout document que vous joignez, conservé au titre de cette seule inscription et présenté uniquement aux administrateurs qui l’examinent.</li>',
  '<li><strong>Preuve de ce consentement.</strong> La version que vous lisez, l’heure de votre accord, votre adresse source et votre navigateur.</li>',
  '</ul>',
  '<h4>Suite donnée</h4>',
  '<p>Rien n’est créé lorsque vous cliquez sur Envoyer. Un administrateur vérifie vos informations et le document joint ; l’identité n’est provisionnée, et le courriel d’activation envoyé à l’adresse de l’invitation, qu’ensuite.</p>',
  '<h4>Durée de validité du lien</h4>',
  '<p>Le lien de votre invitation est à usage unique et expire à la date indiquée sur cette page. Une fois utilisé ou expiré, il ne peut plus être rouvert et une nouvelle invitation doit être émise.</p>',
  '<h4>Retrait</h4>',
  '<p>Si vous n’envoyez pas le formulaire, rien n’est conservé au-delà de l’invitation elle-même. Une fois votre identité créée, vous pouvez retirer ce consentement à tout moment depuis votre profil.</p>',
].join('')

const REG_NL = [
  '<h3>Toestemming voor registratie en identiteitscontrole</h3>',
  '<p>U bent uitgenodigd om een identiteit aan te maken bij Tanflow Ventures. Dit bericht legt uit wat het registratieformulier verzamelt en wat daarmee gebeurt nadat u het verzendt.</p>',
  '<h4>Wat u ons geeft</h4>',
  '<ul>',
  '<li><strong>Contact en plaatsing.</strong> Uw naam, mobiele nummer, organisatie, leidinggevende en kantoor, samen met de kenmerken die uw organisatie voor haar eigen administratie vastlegt.</li>',
  '<li><strong>Verificatie.</strong> Elk document dat u toevoegt, uitsluitend bewaard bij deze registratie en alleen zichtbaar voor de beheerders die haar beoordelen.</li>',
  '<li><strong>Bewijs van deze toestemming.</strong> De versie die u leest, het tijdstip waarop u akkoord gaat, uw bronadres en uw browser.</li>',
  '</ul>',
  '<h4>Wat er daarna gebeurt</h4>',
  '<p>Er wordt niets aangemaakt zodra u op Verzenden klikt. Een beheerder controleert uw gegevens en het bijgevoegde document; pas daarna wordt een identiteit aangemaakt en gaat er een activatiemail naar het adres waarvoor deze uitnodiging is uitgegeven.</p>',
  '<h4>Hoe lang de link geldig is</h4>',
  '<p>De link in uw uitnodiging is eenmalig te gebruiken en verloopt op de datum die op deze pagina staat. Zodra hij is gebruikt of verlopen, kan hij niet opnieuw worden geopend en moet er een nieuwe uitnodiging worden verstuurd.</p>',
  '<h4>Intrekken</h4>',
  '<p>Verzendt u het formulier niet, dan wordt er niets bewaard behalve de uitnodiging zelf. Zodra uw identiteit bestaat, kunt u deze toestemming op elk moment intrekken via uw eigen profiel.</p>',
].join('')

/** The notice the tokenised registration page opens over its form. */
export const REGISTRATION_DOCUMENT = {
  id: 'registration',
  tenant: 'Tanflow Ventures',
  code: 'REGISTRATION',
  name: 'Registration and Identity Verification Consent',
  title: 'Registration and Identity Verification Consent',
  version: '1.0',
  defaultLang: 'en',
  bodies: { en: REG_EN, fr: REG_FR, nl: REG_NL },
  consentType: 'EXPLICIT',
  owner: 'Legal',
  validityPeriod: '24',
  validityUnit: 'Months',
  attributes: ['timestamp', 'ipAddress', 'browser'],
}

/* --- The registration form ----------------------------------------------------

   The administrator's User Consent Initiative (consentManagement/InitiateForm)
   sends employee type, email and name. Everything below is what the recipient
   is asked for in return. `tenant` marks the attributes a tenant defines for
   itself rather than ones the platform requires — the form says so, because a
   recipient has no other way to tell them apart. */

export const REGISTRATION_SECTIONS = [
  {
    id: 'general',
    name: 'General',
    fields: [
      // Issued with the invitation and not the recipient's to change: an
      // initiation for an external joiner cannot be turned into an internal one
      // by the person answering it.
      { id: 'employeeType', label: 'Employee type', type: 'select', src: 'employeeType', required: true, locked: true },
      { id: 'firstName', label: 'First name', type: 'text', required: true },
      { id: 'lastName', label: 'Last name', type: 'text', required: true },
      { id: 'mobile', label: 'Mobile no', type: 'tel', required: true },
      { id: 'organization', label: 'Organization', type: 'select', src: 'organizations', required: true },
      { id: 'manager', label: 'Manager', type: 'select', src: 'managers' },
      { id: 'retirementOn', label: 'Date of retirement', type: 'date' },
      { id: 'testAttribute2', label: 'Test attribute 2', type: 'text', required: true, tenant: true },
      { id: 'region', label: 'Region', type: 'select', src: 'regions', required: true, tenant: true },
    ],
  },
  {
    id: 'office',
    name: 'Office level',
    fields: [
      { id: 'employeeCode', label: 'Employee Code', type: 'text', required: true },
      { id: 'officeCode', label: 'Office Code', type: 'select', src: 'officeCodes', required: true },
      { id: 'biharOfficeCode', label: 'Bihar office code', type: 'select', src: 'biharOfficeCodes', required: true, tenant: true },
    ],
  },
]

const FIELD_OPTIONS = {
  employeeType: EMPLOYEE_TYPES,
  organizations: ORGS,
  managers: USERS.slice(0, 12).map((u) => `${u.firstName} ${u.lastName}`),
  regions: LOOKUPS.regions,
  officeCodes: [
    'HO-MUM-01 · Mumbai head office',
    'RO-BLR-04 · Bengaluru regional',
    'RO-DEL-02 · New Delhi regional',
    'BR-PAT-07 · Patna branch',
    'BR-CHE-03 · Chennai branch',
  ],
  // A code list one tenant defines for one state. It is in the seed to show
  // that the section is extensible, not because the platform knows about Bihar.
  biharOfficeCodes: ['BR-PAT-07 · Patna', 'BR-GAY-12 · Gaya', 'BR-MUZ-04 · Muzaffarpur', 'BR-BHG-09 · Bhagalpur'],
}

export const optionsFor = (field) => FIELD_OPTIONS[field.src] || []

export const REGISTRATION_FIELDS = REGISTRATION_SECTIONS.flatMap((s) => s.fields)

/** A blank form seeded with whatever the invitation already knows. */
export const blankRegistration = (invitation) => {
  const out = {}
  REGISTRATION_FIELDS.forEach((f) => { out[f.id] = '' })
  return { ...out, ...(invitation.prefill || {}) }
}

/** Which required fields are still empty, in the order the form asks for them. */
export const missingRequired = (values) => REGISTRATION_FIELDS
  .filter((f) => f.required && !String(values[f.id] ?? '').trim())

/* --- The invitation token -----------------------------------------------------

   The mail carries a single-use link. There is no backend to verify one, so the
   states a real token can be in are seeded instead: the live invitation, one
   whose window has closed, and one that has already been answered. */

export const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-invitation'

const INVITATIONS = {
  [DEMO_TOKEN]: {
    state: 'valid',
    consentId: 1,
    email: 'priya.nair@tanflow.com',
    invitedBy: 'ANURAG',
    sentOn: dayFrom(-2),
    expiresOn: dayFrom(5),
    prefill: { employeeType: 'Internal', firstName: 'Priya', lastName: 'Nair' },
  },
  expired: {
    state: 'expired',
    email: 'alex.moore@example.com',
    invitedBy: 'NANDINI',
    sentOn: dayFrom(-21),
    expiresOn: dayFrom(-14),
  },
  used: {
    state: 'used',
    email: 'ravi.menon@tanflow.com',
    invitedBy: 'ANURAG',
    sentOn: dayFrom(-9),
    completedOn: dayFrom(-8),
  },
}

/* A signed invitation is three base64url segments with dots between them. The
   demo cannot verify a signature — there is no key and no server — so this is
   the whole of what it can honestly check: that the address carries something
   shaped like the token the product issues. */
const SIGNED = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/

/**
 * What the `?token=` in the address resolves to.
 *
 * Three cases, and the order matters. `expired` and `used` are the sentinels
 * that open those two screens, because a demo has to be able to show a link
 * that no longer works. Anything else that is shaped like an issued token opens
 * the seeded invitation: a real link pasted out of a real mail must reach the
 * form, and refusing it because this build does not hold that person's record
 * would be a bug the reader cannot tell from a broken product. Only an address
 * carrying something that is not a token at all — the shape a link truncated by
 * a mail client arrives in — is refused.
 *
 * An address with no token is the one typed by hand while the console is being
 * shown, and opens the seeded invitation too.
 */
export const resolveInvitation = (search) => {
  let token = null
  try { token = new URLSearchParams(search || '').get('token') } catch { token = null }
  if (!token) return { ...INVITATIONS[DEMO_TOKEN], token: DEMO_TOKEN }
  if (INVITATIONS[token]) return { ...INVITATIONS[token], token }
  if (SIGNED.test(token)) return { ...INVITATIONS[DEMO_TOKEN], token }
  return { state: 'invalid', token }
}

/* --- Whether the gate has been answered this session --------------------------

   Session storage, beside the sign-in flag itself and for the same reason: a
   consent answered three weeks ago must not let this tab past the gate, while a
   reload of the tab that just answered it must. Nothing here is evidence — the
   acceptance record is the evidence, and Consent Records holds it. */

export const CONSENT_GATE_KEY = 'tf-idam-consent-gate'

export const consentGateSettled = () => {
  try { return sessionStorage.getItem(CONSENT_GATE_KEY) === 'accepted' } catch { return false }
}

export const settleConsentGate = () => {
  try { sessionStorage.setItem(CONSENT_GATE_KEY, 'accepted') } catch { /* storage unavailable */ }
}

export const clearConsentGate = () => {
  try { sessionStorage.removeItem(CONSENT_GATE_KEY) } catch { /* storage unavailable */ }
}
