import { useState } from 'react'
import DetailHeader from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Switch from '../../components/primitives/Switch'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import { statusTone } from '../../lib/format'
import { LOCATIONS, PASSWORD_POLICIES } from '../../data/seed'
import { NETWORK_RULES, TIMEZONES, autoCode, profileFor, resolvePolicy } from './orgModel'

export default function OrgForm({ org, orgs, onSave, onCancel }) {
  const prof = org ? profileFor(org) : null
  const initial = {
    name: org ? org.name : '',
    code: prof ? prof.code : '',
    description: prof ? prof.description : '',
    parent: org && org.parent ? org.parent : '',
    region: prof ? prof.region : 'Global',
    timezone: prof ? prof.timezone : 'Asia/Kolkata',
    contact: prof ? prof.contact : '',
    status: org ? org.status : 'Active',
    passwordPolicy: org ? org.passwordPolicy : 'Inherited',
    inherit: org ? org.inherit : true,
    mfaRequired: prof ? prof.mfaRequired : true,
    ipPolicy: prof ? prof.ipPolicy : 'None',
  }
  const [draft, setDraft] = useState(initial)
  const [touched, setTouched] = useState(false)
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const clash = orgs.some((o) => (!org || o.id !== org.id) && o.name.toLowerCase() === draft.name.trim().toLowerCase())
  const nameError = touched && !draft.name.trim()
    ? 'An organization name is required.'
    : clash ? 'Another organization already uses this name.' : null

  const parents = orgs.filter((o) => !org || o.id !== org.id).map((o) => o.name)
  const parentOrg = orgs.find((o) => o.name === draft.parent)
  const inheritedPolicy = parentOrg ? resolvePolicy(parentOrg, orgs).name : 'Default Strong Policy'

  const submit = () => {
    setTouched(true)
    if (!draft.name.trim() || clash) return
    onSave({ ...draft, name: draft.name.trim() })
  }

  return (
    <>
      <DetailHeader
        backTo={org ? `/iam/organizations/${org.id}` : '/iam/organizations'}
        backLabel={org ? org.name : 'Organizations'}
        eyebrow={org ? 'Edit organization' : 'New organization'}
        title={draft.name.trim() || 'Untitled organization'}
        sub="Organizations are the tenant scoping boundary. They decide which password policy applies, who may administer an identity, and which provisioning targets that identity can reach."
        media={(
          <span className="feed-ic" data-tone="acc" style={{ width: 44, height: 44 }}>
            <Icon name="building" style={{ width: 20, height: 20 }} />
          </span>
        )}
        badges={<><Tag tone="acc">{draft.code || autoCode(draft.name)}</Tag><Pill tone={statusTone(draft.status)} dot>{draft.status}</Pill></>}
        actions={(
          <>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="pri" icon="save" onClick={submit}>{org ? 'Save organization' : 'Create organization'}</Button>
          </>
        )}
      />

      <div className="detail-body">
        <div className="stack">
          <Card title="Identity" sub="How the organization is recognized across the console, exports and audit records.">
            <div className="grid grid-2">
              <Field label="Organization name" required span={2} htmlFor="org-name" error={nameError}>
                <TextInput
                  id="org-name"
                  value={draft.name}
                  onBlur={() => setTouched(true)}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Tanflow · Procurement"
                />
              </Field>
              <Field label="Short code" hint="Used on exports and provisioning payloads." htmlFor="org-code">
                <TextInput id="org-code" value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder={autoCode(draft.name)} />
              </Field>
              <Field label="Status" htmlFor="org-status" hint="Disabling blocks sign-in for every identity in scope.">
                <Select id="org-status" value={draft.status} onChange={(e) => set('status', e.target.value)} options={['Active', 'Disabled']} />
              </Field>
              <Field label="Description" span={2} htmlFor="org-desc">
                <TextInput
                  as="textarea"
                  id="org-desc"
                  value={draft.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="What this organization covers and who it belongs to."
                />
              </Field>
            </div>
          </Card>

          <Card title="Placement" sub="Where the organization sits in the hierarchy, and the regional defaults applied beneath it.">
            <div className="grid grid-2">
              <Field label="Parent organization" hint="Leave empty to create a root organization." htmlFor="org-parent">
                <Select id="org-parent" value={draft.parent} onChange={(e) => set('parent', e.target.value)} placeholder="None (root)" options={parents} />
              </Field>
              <Field label="Primary region" htmlFor="org-region">
                <Select id="org-region" value={draft.region} onChange={(e) => set('region', e.target.value)} options={['Global', ...LOCATIONS]} />
              </Field>
              <Field label="Time zone" hint="Drives scheduler windows and report cut-off times." htmlFor="org-tz">
                <Select id="org-tz" value={draft.timezone} onChange={(e) => set('timezone', e.target.value)} options={TIMEZONES} />
              </Field>
              <Field label="Contact mailbox" span={2} htmlFor="org-contact">
                <TextInput id="org-contact" type="email" value={draft.contact} onChange={(e) => set('contact', e.target.value)} placeholder="identity@tanflow.com" />
              </Field>
            </div>
          </Card>

          <Card title="Security posture" sub="Credential and network rules applied to every identity created beneath this organization.">
            <div className="stack">
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <Switch checked={draft.inherit} onChange={(v) => set('inherit', v)} label="Inherit parent configuration" />
                <div>
                  <div className="t-sm" style={{ fontWeight: 'var(--w-semi)' }}>Inherit parent configuration</div>
                  <div className="t-xs t-mut" style={{ marginTop: 2, lineHeight: 1.5 }}>
                    Password policy, authentication requirements and network restrictions follow{' '}
                    <b>{draft.parent || 'the tenant root'}</b>. Turn this off to pin an explicit policy on this organization.
                  </div>
                </div>
              </div>

              <div className="grid grid-2">
                <Field label="Password policy" hint={draft.inherit ? `Resolves to ${inheritedPolicy}.` : 'Applied directly to this organization.'} htmlFor="org-policy">
                  <Select
                    id="org-policy"
                    value={draft.passwordPolicy}
                    disabled={draft.inherit}
                    onChange={(e) => set('passwordPolicy', e.target.value)}
                    options={['Inherited', ...PASSWORD_POLICIES.map((p) => p.name)]}
                  />
                </Field>
                <Field label="Network restriction" hint="Evaluated before any sign-in is accepted." htmlFor="org-ip">
                  <Select id="org-ip" value={draft.ipPolicy} disabled={draft.inherit} onChange={(e) => set('ipPolicy', e.target.value)} options={NETWORK_RULES} />
                </Field>
              </div>

              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <Switch checked={draft.mfaRequired} onChange={(v) => set('mfaRequired', v)} label="Require multi-factor authentication" />
                <div>
                  <div className="t-sm" style={{ fontWeight: 'var(--w-semi)' }}>Require multi-factor authentication</div>
                  <div className="t-xs t-mut" style={{ marginTop: 2 }}>
                    Identities without a registered factor are prompted to enrol at the next sign-in.
                  </div>
                </div>
              </div>

              <div className="banner" data-tone="info">
                <Icon name="info" size={15} />
                <div>
                  Changing the policy does not force an immediate reset. Existing credentials remain valid until their
                  next expiry, and the change is written to the organization audit trail.
                </div>
              </div>
            </div>
          </Card>
        </div>

        <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={submit}>{org ? 'Save changes' : 'Create organization'}</Button>
        </StickyActions>
      </div>
    </>
  )
}
