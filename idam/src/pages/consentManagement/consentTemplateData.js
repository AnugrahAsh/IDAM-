import { dateText } from '../../lib/clock'
import { attributes as identityAttributes } from '../dynamicPolicies/policyPageData'
import { CAPTURABLE } from './consentsData'

export const TEMPLATE_BASE = '/iam/consent/templates'

export const TEMPLATE_CATEGORIES = ['Employee', 'Customer', 'Marketing', 'Security', 'Third Party Sharing', 'Other']
export const TEMPLATE_STATUSES = ['Draft', 'Active', 'Inactive', 'Archived']

export const CONSENT_TYPES = [
  { value: 'EXPLICIT', label: 'Explicit consent' },
  { value: 'OPTIONAL', label: 'Optional consent' },
  { value: 'MANDATORY', label: 'Mandatory consent' },
  { value: 'PURPOSE_BASED', label: 'Purpose based consent' },
]
export const CONSENT_TYPE_LABEL = Object.fromEntries(CONSENT_TYPES.map((t) => [t.value, t.label]))

export const DATA_CATEGORIES = [
  'Personal', 'Identity', 'Contact', 'Financial', 'Employment', 'Health', 'Biometric', 'Behavioral Information',
]
/* Categories the DPDP Act treats as carrying heightened risk. */
export const SENSITIVE_CATEGORIES = new Set(['Financial', 'Health', 'Biometric'])

export const VALIDITY_UNITS = ['Days', 'Months', 'Years']

/** The fields a consent (or template) can be scoped to, from the identity registry. */
export const attributeOptions = () => {
  const seen = new Set()
  return [...CAPTURABLE, ...identityAttributes()]
    .filter((a) => (seen.has(a.id) ? false : seen.add(a.id)))
    .map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` }))
}

export const statusTone = (s) => (s === 'Active' ? 'ok' : s === 'Draft' ? 'info' : s === 'Inactive' ? 'warn' : 'mut')

export const validityText = (t) => (t.validityPeriod ? `${t.validityPeriod} ${t.validityUnit}` : 'No expiry')

export const blankTemplate = () => ({
  id: null,
  name: '',
  category: '',
  status: 'Draft',
  description: '',
  title: '',
  defaultLang: 'en',
  bodies: { en: '' },
  purpose: '',
  processingActivity: '',
  dataCategories: [],
  dataAttributes: [],
  consentType: 'EXPLICIT',
  validityPeriod: '',
  validityUnit: 'Months',
  allowWithdrawal: true,
  allowEvidenceDownload: true,
  allowViewConsent: true,
  createdOn: dateText(),
  createdBy: 'you',
  usedBy: 0,
})

const body = (title, lines) => `<h3>${title}</h3>${lines.map((l) => `<p>${l}</p>`).join('')}`

export const SEED_TEMPLATES = [
  {
    ...blankTemplate(),
    id: 1,
    name: 'Employee personal data processing',
    category: 'Employee',
    status: 'Active',
    description: 'Baseline notice for every workforce identity at onboarding.',
    title: 'Processing of your employee personal data',
    bodies: {
      en: body('Processing of your employee personal data', [
        'Tanflow processes your personal data to administer your employment, grant access to the systems you need and meet its legal obligations.',
        'You may withdraw this consent at any time from your profile. Withdrawal does not affect processing already carried out.',
      ]),
      hi: body('आपके कर्मचारी व्यक्तिगत डेटा का प्रसंस्करण', [
        'टैनफ्लो आपके रोजगार के प्रशासन और आवश्यक सिस्टम तक पहुँच देने के लिए आपके व्यक्तिगत डेटा का प्रसंस्करण करता है।',
      ]),
    },
    purpose: 'Administer employment and provision access to workplace systems.',
    processingActivity: 'Stored in the identity registry, shared with connected applications, retained for the period of employment plus seven years.',
    dataCategories: ['Personal', 'Identity', 'Contact', 'Employment'],
    dataAttributes: ['username', 'email', 'organization', 'department'],
    consentType: 'MANDATORY',
    validityPeriod: '12',
    validityUnit: 'Months',
    createdOn: '2026-06-12',
    createdBy: 'ANURAG',
    usedBy: 2,
  },
  {
    ...blankTemplate(),
    id: 2,
    name: 'Marketing communications opt-in',
    category: 'Marketing',
    status: 'Draft',
    description: 'Optional opt-in for product news and event invitations.',
    title: 'Stay informed',
    bodies: { en: body('Stay informed', ['We would like to send you product updates and event invitations. You can opt out at any time.']) },
    purpose: 'Send product updates and event invitations.',
    processingActivity: 'Email address shared with the campaign platform; removed within 30 days of opt-out.',
    dataCategories: ['Contact', 'Behavioral Information'],
    dataAttributes: ['email'],
    consentType: 'OPTIONAL',
    validityPeriod: '24',
    validityUnit: 'Months',
    createdOn: '2026-07-20',
    createdBy: 'NANDINI',
  },
  {
    ...blankTemplate(),
    id: 3,
    name: 'Biometric authentication',
    category: 'Security',
    status: 'Inactive',
    description: 'Fingerprint and face templates used for passwordless sign-in.',
    title: 'Use of your biometric data',
    bodies: { en: body('Use of your biometric data', ['A mathematical template of your fingerprint or face is stored on your device and used only to verify your identity.']) },
    purpose: 'Verify identity for passwordless authentication.',
    processingActivity: 'Template is stored on the enrolled device only and never leaves it.',
    dataCategories: ['Biometric', 'Identity'],
    dataAttributes: ['username', 'browser'],
    consentType: 'EXPLICIT',
    createdOn: '2026-05-02',
    createdBy: 'ANURAG',
    usedBy: 1,
  },
]
