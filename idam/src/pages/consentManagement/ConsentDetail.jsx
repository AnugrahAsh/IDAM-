import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Check from '../../components/primitives/Check'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import SearchSelect from '../../components/primitives/SearchSelect'
import Switch from '../../components/primitives/Switch'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { USERS } from '../../data/seed'
import { stampText } from '../../lib/clock'
import { num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { AUDIENCES, CONSENT_RECORDS } from '../shared/comms/commsData'
import { useState } from 'react'
import { CAPTURABLE } from './consentsData'
import {
  CONSENT_TYPES, DATA_CATEGORIES, SENSITIVE_CATEGORIES, TEMPLATE_BASE, VALIDITY_UNITS, attributeOptions,
} from './consentTemplateData'
import ConsentBodyEditor, { LANG_LABEL, stripTags } from './ConsentBodyEditor'

const RIGHTS = [
  { key: 'allowWithdrawal', label: 'Allow consent withdrawal', hint: 'The identity can withdraw consent at any time (Section 6(4), DPDP Act).' },
  { key: 'allowEvidenceDownload', label: 'Allow evidence download', hint: 'The identity can download a copy of their consent as proof.' },
  { key: 'allowViewConsent', label: 'Allow view consent', hint: 'The identity can view the full consent in the portal.' },
]

export default function ConsentDetail({ record, templates = [], onSave, onCancel, onDelete, onInitiateMenu }) {
  const { toast, navigate } = useApp()
  // A consent authored before the multi-language editor, or the DPDP
  // compliance fields, existed still opens here — every addition since then
  // falls back rather than leaving the form half-populated.
  const [form, setForm] = useState(() => ({
    ...record,
    audience: record.audience || 'All users',
    defaultLang: record.defaultLang || 'en',
    bodies: record.bodies || { en: record.body || '' },
    description: record.description || '',
    consentType: record.consentType || 'OPTIONAL',
    purpose: record.purpose || '',
    processingActivity: record.processingActivity || '',
    dataCategories: record.dataCategories || [],
    dataAttributes: record.dataAttributes || [],
    validityPeriod: record.validityPeriod || '',
    validityUnit: record.validityUnit || 'Months',
    allowWithdrawal: record.allowWithdrawal ?? false,
    allowEvidenceDownload: record.allowEvidenceDownload ?? true,
    allowViewConsent: record.allowViewConsent ?? true,
  }))
  const [tab, setTab] = useState('definition')
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState({})
  const [templateId, setTemplateId] = useState('')
  const [attrOptions] = useState(attributeOptions)
  const creating = record.id == null

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e })); setDirty(true) }
  const toggleAttr = (id) => {
    setForm((f) => ({ ...f, attributes: f.attributes.includes(id) ? f.attributes.filter((a) => a !== id) : [...f.attributes, id] }))
    setDirty(true)
  }
  const toggleCategory = (c) => {
    setForm((f) => ({ ...f, dataCategories: f.dataCategories.includes(c) ? f.dataCategories.filter((x) => x !== c) : [...f.dataCategories, c] }))
    setDirty(true)
  }

  // Selecting a template auto-fills the DPDP fields and wording it carries —
  // the identity's own name is left alone once they've started typing one, so
  // picking a template never clobbers work already in progress.
  const applyTemplate = (id) => {
    setTemplateId(id)
    if (!id) return
    const t = templates.find((x) => String(x.id) === String(id))
    if (!t) return
    setForm((f) => ({
      ...f,
      name: f.name.trim() ? f.name : t.name,
      description: t.description || f.description,
      consentType: t.consentType,
      purpose: t.purpose,
      processingActivity: t.processingActivity,
      dataCategories: t.dataCategories,
      dataAttributes: t.dataAttributes,
      validityPeriod: t.validityPeriod,
      validityUnit: t.validityUnit,
      allowWithdrawal: t.allowWithdrawal,
      allowEvidenceDownload: t.allowEvidenceDownload,
      allowViewConsent: t.allowViewConsent,
      bodies: { ...t.bodies },
      defaultLang: t.defaultLang,
    }))
    setDirty(true)
    toast('ok', 'Template applied', `DPDP fields and wording were filled in from ${t.name}. Review before saving.`)
  }

  const sensitiveCategories = form.dataCategories.filter((c) => SENSITIVE_CATEGORIES.has(c))

  const submit = () => {
    const next = {}
    if (!String(form.code).trim()) next.code = 'A consent code is required.'
    else if (!/^[A-Z0-9_]+$/.test(form.code)) next.code = 'Use upper-case letters, digits and underscores.'
    if (!String(form.name).trim()) next.name = 'A name is required.'
    if (!form.purpose.trim()) next.purpose = 'Purpose is mandatory under the DPDP Act.'
    if (!form.processingActivity.trim()) next.processingActivity = 'Processing activity is mandatory under the DPDP Act.'
    if (form.validityPeriod !== '' && !(Number(form.validityPeriod) > 0)) next.validityPeriod = 'Enter a whole number greater than zero, or leave empty for no expiry.'
    const defaultText = stripTags(form.bodies[form.defaultLang]).trim()
    if (!defaultText) next.body = `The ${LANG_LABEL[form.defaultLang] || form.defaultLang} text cannot be empty — it is what every identity without a translation is shown.`
    setErrors(next)
    if (Object.keys(next).length) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    // `body` is kept in sync with the default language so every consumer that
    // reads a single string keeps working.
    onSave({ ...form, validityPeriod: String(form.validityPeriod).trim(), body: form.bodies[form.defaultLang] })
  }

  const records = CONSENT_RECORDS.filter((r) => r.consentName === record.name)
  const total = (record.accepted || 0) + (record.pending || 0)
  const rate = total ? Math.round((record.accepted / total) * 100) : 0
  const pendingUsers = USERS.filter((_, i) => i % 5 === 0).slice(0, 12)

  return (
    <>
      <DetailHeader
        backTo="/iam/consent"
        backLabel="Consents"
        eyebrow={creating ? 'New consent' : 'Consent definition'}
        title={form.name || 'Untitled consent'}
        sub={`Captured from identities in scope and retained as evidence of lawful basis.`}
        badges={
          <>
            <Pill tone={form.status === 'Active' ? 'ok' : 'mut'} dot>{form.status}</Pill>
            <span className="code">{form.code || 'CODE'}</span>
            <Tag>{form.version}</Tag>
            {form.mandatory && <Pill tone="warn">Mandatory</Pill>}
          </>
        }
        meta={
          !creating && (
            <>
              <Fact icon="checkC" label="Accepted" value={num(record.accepted)} />
              <Fact icon="clock" label="Pending" value={num(record.pending)} />
              <Fact icon="user" label="Owner" value={form.owner} />
              <Fact icon="calendar" label="Effective" value={form.effective} />
            </>
          )
        }
        actions={
          <>
            {!creating && onInitiateMenu && <Button icon="bell" iconRight="chevD" onClick={onInitiateMenu}>Initiate</Button>}
            {!creating && <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>}
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'definition', label: 'Definition', icon: 'file' },
              { id: 'attributes', label: 'Attribute configuration', icon: 'sliders', count: form.attributes.length },
              { id: 'audience', label: 'Audience', icon: 'users' },
              { id: 'acceptance', label: 'Acceptance', icon: 'checkC', count: records.length },
              { id: 'versions', label: 'Versions', icon: 'history' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'definition' && (
          <div className="detail-cols">
            <div className="stack">
              {creating && (
                <Card title="Start from a template" sub="Only active templates can be used to start a consent.">
                  <div className="stack">
                    <Field label="Select template" hint="Fills in the DPDP fields and wording below. Everything stays editable.">
                      <Select
                        value={templateId}
                        placeholder="-- No template (fill manually) --"
                        options={templates.filter((t) => t.status === 'Active').map((t) => ({ value: t.id, label: t.name }))}
                        onChange={(e) => applyTemplate(e.target.value)}
                      />
                    </Field>
                    <Banner tone="info">
                      Draft and inactive templates aren't offered here.{' '}
                      <span className="link" onClick={() => navigate(TEMPLATE_BASE)}>Manage templates</span>
                    </Banner>
                  </div>
                </Card>
              )}
              <Card title="Consent text" sub="Exactly what the identity is shown before accepting.">
                <div className="stack">
                  <div className="grid grid-2">
                    <Field label="Consent code" required error={errors.code} hint="Immutable identifier referenced by the capture API.">
                      <TextInput value={form.code} onChange={set('code')} placeholder="PRIVACY_NOTICE" />
                    </Field>
                    <Field label="Version" hint="Increment when the wording changes materially.">
                      <TextInput value={form.version} onChange={set('version')} />
                    </Field>
                  </div>
                  <Field label="Name" required error={errors.name}><TextInput value={form.name} onChange={set('name')} /></Field>
                  <Field label="Description" hint="Internal note on when this consent should be used.">
                    <TextInput as="textarea" rows={2} value={form.description} onChange={set('description')} />
                  </Field>
                  <ConsentBodyEditor
                    bodies={form.bodies}
                    defaultLang={form.defaultLang}
                    error={errors.body}
                    onChange={(bodies) => { setForm((f) => ({ ...f, bodies })); setDirty(true) }}
                    onDefaultChange={(code) => { setForm((f) => ({ ...f, defaultLang: code })); setDirty(true) }}
                  />
                </div>
              </Card>
              <Card title="DPDP compliance fields" sub="Required by the Digital Personal Data Protection Act, 2023.">
                <div className="stack">
                  <Field label="Purpose" required error={errors.purpose} hint="Why the data is collected.">
                    <TextInput as="textarea" rows={3} value={form.purpose} placeholder="Why are we collecting your data?" onChange={set('purpose')} />
                  </Field>
                  <Field label="Processing activity" required error={errors.processingActivity} hint="What happens to the data after it is collected.">
                    <TextInput as="textarea" rows={3} value={form.processingActivity} placeholder="What happens after collecting data?" onChange={set('processingActivity')} />
                  </Field>
                  <Field label="Data categories">
                    <div className="grid grid-2" style={{ gap: 0, columnGap: 16 }}>
                      {DATA_CATEGORIES.map((c) => (
                        <label key={c} className="row" style={{ gap: 10, padding: '7px 0', borderBottom: '1px solid var(--hair)', cursor: 'pointer' }}>
                          <Check checked={form.dataCategories.includes(c)} onChange={() => toggleCategory(c)} label={c} />
                          <span className="t-sm" style={{ flex: 1 }}>{c}</span>
                          {SENSITIVE_CATEGORIES.has(c) && <Tag tone="warn">Sensitive</Tag>}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Data attributes" hint="The fields this consent covers, from the identity registry.">
                    <SearchSelect
                      multiple
                      value={form.dataAttributes}
                      options={attrOptions}
                      placeholder="Select data attributes"
                      searchPlaceholder="Search by field name…"
                      emptyLabel="No attribute matches"
                      onChange={(e) => { setForm((f) => ({ ...f, dataAttributes: e.target.value })); setDirty(true) }}
                    />
                  </Field>
                  {sensitiveCategories.length > 0 && (
                    <Banner tone="warn">
                      {sensitiveCategories.join(', ')} {sensitiveCategories.length === 1 ? 'is a sensitive category' : 'are sensitive categories'}. Explicit consent is recommended.
                    </Banner>
                  )}
                  <div className="grid grid-2">
                    <Field label="Consent type"><Select value={form.consentType} options={CONSENT_TYPES} onChange={set('consentType')} /></Field>
                    <div className="grid grid-2">
                      <Field label="Validity period" error={errors.validityPeriod}>
                        <TextInput type="number" min="1" value={form.validityPeriod} placeholder="e.g. 12" onChange={set('validityPeriod')} />
                      </Field>
                      <Field label="Validity unit"><Select value={form.validityUnit} options={VALIDITY_UNITS} onChange={set('validityUnit')} /></Field>
                    </div>
                  </div>
                  {RIGHTS.map((r, i) => (
                    <div key={r.key} className="row-between" style={{ padding: '11px 0', borderTop: i ? '1px solid var(--hair)' : 0, gap: 16 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="t-sm" style={{ fontWeight: 600 }}>{r.label}</div>
                        <div className="t-xs t-mut">{r.hint}</div>
                      </div>
                      <Switch checked={form[r.key]} onChange={(v) => { setForm((f) => ({ ...f, [r.key]: v })); setDirty(true) }} label={r.label} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="stack">
              <Card title="Publication">
                <div className="stack">
                  <Field label="Status"><Select value={form.status} options={['Draft', 'Active', 'Retired']} onChange={set('status')} /></Field>
                  <Field label="Owner"><Select value={form.owner} options={['Legal', 'Compliance', 'Security', 'Human Resources']} onChange={set('owner')} /></Field>
                  <Field label="Effective from"><TextInput value={form.effective} onChange={set('effective')} /></Field>
                  <div className="row-between" style={{ padding: '11px 0', borderTop: '1px solid var(--hair)', gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="t-sm" style={{ fontWeight: 600 }}>Mandatory</div>
                      <div className="t-xs t-mut">Identities cannot use the portal until they accept.</div>
                    </div>
                    <Switch checked={form.mandatory} onChange={(v) => { setForm((f) => ({ ...f, mandatory: v })); setDirty(true) }} label="Mandatory" />
                  </div>
                </div>
              </Card>
              {form.mandatory && (
                <Banner tone="warn">
                  A mandatory consent blocks portal access until accepted. Publishing it to
                  <b> {form.audience}</b> will interrupt everyone in scope at their next sign-in.
                </Banner>
              )}
            </div>
          </div>
        )}

        {tab === 'attributes' && (
          <div className="detail-cols">
            <Card title="Captured attributes" sub="Recorded alongside every acceptance as evidence.">
              {CAPTURABLE.map((a) => (
                <label className="row-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--hair)', cursor: 'pointer', gap: 16 }} key={a.id}>
                  <span style={{ minWidth: 0 }}>
                    <span className="t-sm" style={{ fontWeight: 600, display: 'block' }}>{a.label}</span>
                    <span className="t-xs t-mut mono">{a.id}</span>
                  </span>
                  <Check checked={form.attributes.includes(a.id)} onChange={() => toggleAttr(a.id)} label={a.label} />
                </label>
              ))}
            </Card>
            <Card title="What a record looks like" sub="Preview of a single acceptance">
              <div className="log-view">
                <div className="lg-dim">{'{'}</div>
                {form.attributes.map((a) => (
                  <div key={a} className="lg-ok">{`  "${a}": ${JSON.stringify(
                    a === 'username' ? 'SHUBHAM_JAIN'
                      : a === 'email' ? 'shubham.jain@tanflow.com'
                        : a === 'organization' ? 'Tanflow'
                          : a === 'department' ? 'Finance'
                            : a === 'ipAddress' ? '10.24.11.8'
                              : a === 'timestamp' ? stampText()
                                : a === 'browser' ? 'Chrome 128 on Windows 11'
                                  : 'Mumbai, IN',
                  )},`}</div>
                ))}
                <div className="lg-warn">{`  "consent": "${form.code || 'CODE'}",`}</div>
                <div className="lg-warn">{`  "version": "${form.version}"`}</div>
                <div className="lg-dim">{'}'}</div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'audience' && (
          <div className="grid grid-2">
            <Card title="Who must accept" sub="Scope evaluated at sign-in.">
              <div className="stack">
                <Field label="Audience"><Select value={form.audience} options={AUDIENCES} onChange={set('audience')} /></Field>
                <Banner tone="info">
                  Roughly <b>{num(form.audience === 'All users' ? 3892 : 412)}</b> identities fall in this scope.
                  Those who already accepted this version are not prompted again.
                </Banner>
              </div>
            </Card>
            <Card title="Not yet accepted" sub={`${num(record.pending || 0)} identities outstanding`} flush>
              {pendingUsers.length === 0
                ? <EmptyState icon="checkC" title="Everyone accepted" body="No outstanding acceptances in scope." size="sm" />
                : (
                  <table className="tbl">
                    <thead><tr><th>Identity</th><th>Organization</th><th>Last sign-in</th></tr></thead>
                    <tbody>
                      {pendingUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="td-main">
                            <span className="cell-id"><Avatar first={u.firstName} last={u.lastName} size="sm" />{u.username}</span>
                          </td>
                          <td>{u.organization}</td>
                          <td className="td-mono">{u.lastLogin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </Card>
          </div>
        )}

        {tab === 'acceptance' && (
          <div className="detail-cols">
            <Card title="Acceptance records" sub={`${records.length} captured for this consent`} flush>
              {records.length === 0
                ? <EmptyState icon="consent" title="No records yet" body="Nobody has been prompted for this consent." size="sm" />
                : (
                  <table className="tbl">
                    <thead><tr><th>Identity</th><th>Version</th><th>Action</th><th>IP</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td className="td-main">{r.username}</td>
                          <td className="td-mono">{r.consentVersion}</td>
                          <td><Pill tone={r.actionType === 'Accepted' ? 'ok' : r.actionType === 'Withdrawn' || r.actionType === 'Declined' ? 'bad' : 'mut'} dot>{r.actionType}</Pill></td>
                          <td className="td-mono">{r.ip}</td>
                          <td className="td-mono">{r.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </Card>
            <Card title="Acceptance" sub="Across the audience in scope">
              <div className="stat-strip">
                <div className="stat-cell"><span className="stat-k">Accepted</span><span className="stat-v">{num(record.accepted || 0)}</span></div>
                <div className="stat-cell"><span className="stat-k">Pending</span><span className="stat-v">{num(record.pending || 0)}</span></div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'versions' && (
          <Card title="Version history" sub="Every published wording, retained for evidence.">
            <div className="tl">
              <div className="tl-it" data-tone="acc">
                <span className="tl-dot"><Icon name="check" size={8} stroke={3} /></span>
                <div className="tl-t">{form.version} · current</div>
                <div className="tl-s">Effective {form.effective} · {num(record.accepted || 0)} acceptances captured.</div>
              </div>
              <div className="tl-it" data-tone="mut">
                <span className="tl-dot"><Icon name="history" size={8} stroke={3} /></span>
                <div className="tl-t">v1.0 · superseded</div>
                <div className="tl-s">Retired when {form.version} was published. Records remain queryable.</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Button icon="plus" onClick={() => toast('info', 'New version', 'Publishing a new version re-prompts everyone in scope.')}>Publish new version</Button>
            </div>
          </Card>
        )}
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{creating ? 'Create consent' : 'Save changes'}</Button>
      </StickyActions>
    </>
  )
}

