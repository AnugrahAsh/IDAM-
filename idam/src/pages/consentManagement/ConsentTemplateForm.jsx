import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Check from '../../components/primitives/Check'
import Field from '../../components/primitives/Field'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { useApp } from '../../store/AppContext'
import ConsentBodyEditor, { LANG_LABEL, stripTags } from './ConsentBodyEditor'
import {
  CONSENT_TYPES, CONSENT_TYPE_LABEL, DATA_CATEGORIES, SENSITIVE_CATEGORIES, TEMPLATE_BASE,
  TEMPLATE_CATEGORIES, VALIDITY_UNITS, attributeOptions, statusTone, validityText,
} from './consentTemplateData'

const RIGHTS = [
  { key: 'allowWithdrawal', label: 'Allow consent withdrawal', hint: 'The identity can withdraw consent at any time (Section 6(4), DPDP Act).' },
  { key: 'allowEvidenceDownload', label: 'Allow evidence download', hint: 'The identity can download a copy of their consent as proof.' },
  { key: 'allowViewConsent', label: 'Allow view consent', hint: 'The identity can view the full consent in the portal.' },
]

export default function ConsentTemplateForm({ template, templates, onSave, onCancel }) {
  const { toast } = useApp()
  const creating = template.id == null
  const [form, setForm] = useState(() => ({ ...template }))
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)
  const [options] = useState(attributeOptions)

  const patch = (next) => { setForm((f) => ({ ...f, ...next })); setDirty(true) }
  const set = (k) => (e) => patch({ [k]: e && e.target ? e.target.value : e })
  const toggleCategory = (c) => patch({
    dataCategories: form.dataCategories.includes(c) ? form.dataCategories.filter((x) => x !== c) : [...form.dataCategories, c],
  })

  const languages = Object.keys(form.bodies)
  const sensitive = form.dataCategories.filter((c) => SENSITIVE_CATEGORIES.has(c))

  const submit = () => {
    const next = {}
    const name = form.name.trim()
    if (!name) next.name = 'A template name is required.'
    else if (templates.some((t) => t.id !== form.id && t.name.trim().toLowerCase() === name.toLowerCase())) next.name = 'Another template already uses this name.'
    if (!form.purpose.trim()) next.purpose = 'Purpose is mandatory under the DPDP Act.'
    if (!form.processingActivity.trim()) next.processingActivity = 'Processing activity is mandatory under the DPDP Act.'
    if (form.validityPeriod !== '' && !(Number(form.validityPeriod) > 0)) next.validityPeriod = 'Enter a whole number greater than zero, or leave empty for no expiry.'
    if (form.status === 'Active' && !stripTags(form.bodies[form.defaultLang] || '').trim()) {
      next.body = `An active template needs ${LANG_LABEL[form.defaultLang] || form.defaultLang} content — it is what consents created from it are filled with.`
    }
    setErrors(next)
    if (Object.keys(next).length) {
      toast('bad', 'Cannot save template', `Fix the ${Object.keys(next).length === 1 ? 'highlighted field' : `${Object.keys(next).length} highlighted fields`}.`)
      return
    }
    onSave({ ...form, name, validityPeriod: String(form.validityPeriod).trim() })
  }

  return (
    <>
      <DetailHeader
        backTo={TEMPLATE_BASE}
        backLabel="Consent Templates"
        eyebrow={creating ? 'Create consent template' : 'Consent template'}
        title={form.name || 'Untitled template'}
        sub="A reusable starting point for consents. Only active templates can be selected when a consent is created."
        badges={(
          <>
            <Pill tone={statusTone(form.status)} dot>{form.status}</Pill>
            {form.category && <Tag>{form.category}</Tag>}
          </>
        )}
        meta={(
          <>
            <Fact icon="consent" label="Type" value={CONSENT_TYPE_LABEL[form.consentType]} />
            <Fact icon="globe" label="Languages" value={languages.length} />
            <Fact icon="clock" label="Validity" value={validityText(form)} />
            {!creating && <Fact icon="link" label="Used by" value={`${form.usedBy} ${form.usedBy === 1 ? 'consent' : 'consents'}`} />}
          </>
        )}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Template identity" sub="How the template is found and described in the register">
              <div className="grid grid-2">
                <Field label="Template name" required error={errors.name} span={2}>
                  <TextInput value={form.name} placeholder="Employee personal data processing" onChange={set('name')} />
                </Field>
                <Field label="Category">
                  <Select value={form.category} placeholder="Select a category…" options={TEMPLATE_CATEGORIES} onChange={set('category')} />
                </Field>
                <Field label="Consent title" hint="The heading identities see above the consent text.">
                  <TextInput value={form.title} placeholder="Processing of your personal data" onChange={set('title')} />
                </Field>
                <Field label="Template description" span={2}>
                  <TextInput as="textarea" rows={3} value={form.description} placeholder="When this template should be used." onChange={set('description')} />
                </Field>
              </div>
            </Card>

            <Card title="Consent content" sub="Written per language. Consents created from this template are filled with every language below.">
              <ConsentBodyEditor
                bodies={form.bodies}
                defaultLang={form.defaultLang}
                error={errors.body}
                onChange={(bodies) => patch({ bodies })}
                onDefaultChange={(code) => patch({ defaultLang: code })}
              />
            </Card>

            <Card title="DPDP mandatory information" sub="Required by the Digital Personal Data Protection Act, 2023">
              <div className="stack">
                <Field label="Purpose" required error={errors.purpose} hint="Why the data is collected.">
                  <TextInput as="textarea" rows={3} value={form.purpose} placeholder="Why are we collecting your data?" onChange={set('purpose')} />
                </Field>
                <Field label="Processing activity" required error={errors.processingActivity} hint="What happens to the data after it is collected.">
                  <TextInput as="textarea" rows={3} value={form.processingActivity} placeholder="What happens after collecting data?" onChange={set('processingActivity')} />
                </Field>
              </div>
            </Card>

            <Card title="Data information" sub="What the consent covers">
              <div className="stack">
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
                    options={options}
                    placeholder="Select data attributes"
                    searchPlaceholder="Search by field name…"
                    emptyLabel="No attribute matches"
                    onChange={(e) => patch({ dataAttributes: e.target.value })}
                  />
                </Field>
                {sensitive.length > 0 && (
                  <Banner tone="warn">
                    {sensitive.join(', ')} {sensitive.length === 1 ? 'is a sensitive category' : 'are sensitive categories'}. Explicit consent is recommended.
                  </Banner>
                )}
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card title="Status">
              <div className="stack">
                <Field label="Status" hint="Only active templates can be used for consent creation. Deactivate or archive later from the templates list.">
                  <Select value={form.status} options={creating ? ['Draft', 'Active'] : ['Draft', 'Active', 'Inactive', 'Archived']} onChange={set('status')} />
                </Field>
              </div>
            </Card>

            <Card title="Consent behaviour">
              <div className="stack">
                <Field label="Consent type">
                  <Select value={form.consentType} options={CONSENT_TYPES} onChange={set('consentType')} />
                </Field>
                <div className="grid grid-2">
                  <Field label="Validity period" error={errors.validityPeriod}>
                    <TextInput type="number" min="1" value={form.validityPeriod} placeholder="e.g. 12" onChange={set('validityPeriod')} />
                  </Field>
                  <Field label="Validity unit">
                    <Select value={form.validityUnit} options={VALIDITY_UNITS} onChange={set('validityUnit')} />
                  </Field>
                </div>
              </div>
            </Card>

            <Card title="User rights controls">
              {RIGHTS.map((r, i) => (
                <div key={r.key} className="row-between" style={{ padding: '11px 0', borderTop: i ? '1px solid var(--hair)' : 0, gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="t-sm" style={{ fontWeight: 600 }}>{r.label}</div>
                    <div className="t-xs t-mut">{r.hint}</div>
                  </div>
                  <Switch checked={form[r.key]} onChange={(v) => patch({ [r.key]: v })} label={r.label} />
                </div>
              ))}
            </Card>

            <Card title="Summary">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Languages', v: languages.map((c) => LANG_LABEL[c] || c).join(', '), icon: 'globe' },
                  { k: 'Default language', v: LANG_LABEL[form.defaultLang] || form.defaultLang, icon: 'flag' },
                  { k: 'Data categories', v: form.dataCategories.length ? form.dataCategories.join(', ') : 'None selected', icon: 'layers' },
                  { k: 'Data attributes', v: form.dataAttributes.length ? `${form.dataAttributes.length} selected` : 'None selected', icon: 'tag' },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : creating ? 'New template' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{creating ? 'Create template' : 'Save changes'}</Button>
      </StickyActions>
    </>
  )
}
