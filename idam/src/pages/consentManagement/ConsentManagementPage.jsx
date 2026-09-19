import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Tabs from '../../components/primitives/Tabs'
import ConsentsPage from './ConsentsPage'
import ConsentPoliciesPage from './ConsentPoliciesPage'
import ConsentTemplatesPage from './ConsentTemplatesPage'
import ConsentRecordsPage from './ConsentRecordsPage'
import { SEED_TEMPLATES } from './consentTemplateData'
import { CONSENT_DEFS } from '../shared/comms/commsData'
import { useApp } from '../../store/AppContext'

// Three sub-sections on one page — the same shape as Email and SMS
// Management — rather than three separate sidebar entries. Assignment rules
// (which consent an identity is presented, and when) are reached from the
// Consents tab rather than being a fourth tab of their own: they configure
// consents, they aren't a third kind of thing alongside them.
const SECTIONS = [
  { id: 'consent', label: 'Consents', icon: 'consent' },
  { id: 'templates', label: 'Consent Templates', icon: 'file' },
  { id: 'records', label: 'Consent Records', icon: 'logs' },
]

export default function ConsentManagementPage({ segments = [] }) {
  const { navigate } = useApp()
  // The section owns the template register — and the consent register and its
  // user mappings below — so a record created or edited on its own page is
  // still there when the list is shown again. Add/Edit/View screens return
  // early (see `rest.length > 0` below) as the page's whole output rather
  // than nested under the tab strip, which changes the tree React sees and
  // remounts the section's own component; state owned there alone would be
  // lost the moment that happens.
  const [templates, setTemplates] = useState(() => SEED_TEMPLATES.map((t) => ({ ...t })))
  const [rows, setRows] = useState(() => CONSENT_DEFS.map((c) => ({ ...c })))
  const [mapped, setMapped] = useState({})

  // A leading segment that names a section is the tab; anything else is a
  // record id or "add" belonging to the default section.
  const isTab = SECTIONS.some((s) => s.id === segments[0]) && segments[0] !== 'consent'
  const tab = isTab ? segments[0] : 'consent'
  const rest = isTab ? segments.slice(1) : segments

  // A consent, a template, an acceptance record or the assignment-rule
  // register is a level below the section, and those screens carry their own
  // breadcrumb, title and back link. Keeping the shell around them would stack
  // a second header on top of theirs.
  if (rest.length > 0) {
    if (tab === 'consent' && rest[0] === 'rules') return <ConsentPoliciesPage />
    if (tab === 'templates') return <ConsentTemplatesPage segments={rest} templates={templates} setTemplates={setTemplates} />
    if (tab === 'records') return <ConsentRecordsPage segments={rest} embedded />
    return <ConsentsPage segments={rest} embedded templates={templates} rows={rows} setRows={setRows} mapped={mapped} setMapped={setMapped} />
  }

  return (
    <>
      <PageBar
        title="Consent Management"
        crumbs={[{ label: 'Consents' }, { label: 'Consent Management' }]}
        sub="Consent definitions, the wording shown, the rules that assign them, and the evidence retained."
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={(id) => navigate(id === 'consent' ? '/iam/consent' : `/iam/consent/${id}`)}
          tabs={SECTIONS}
        />
        {tab === 'consent' && <ConsentsPage segments={rest} embedded templates={templates} rows={rows} setRows={setRows} mapped={mapped} setMapped={setMapped} />}
        {tab === 'templates' && <ConsentTemplatesPage templates={templates} setTemplates={setTemplates} />}
        {tab === 'records' && <ConsentRecordsPage segments={rest} embedded />}
      </div>
    </>
  )
}
