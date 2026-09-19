import { useRef, useState } from 'react'
import DetailHeader from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Banner from '../../components/primitives/Banner'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import KeyValue from '../../components/primitives/KeyValue'
import { num } from '../../lib/format'
import { GroupMark } from './GroupDetail'
import { CLAIM_OF, KINDS, KIND_META, ssoTargetOf } from './groupsData'

export default function GroupForm({
  mode = 'add',
  initial,
  backTo,
  backLabel,
  title,
  sub,
  registered = 0,
  onCancel,
  onSubmit,
}) {
  const base = useRef(initial)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  const meta = KIND_META[form.kind] || KIND_META.Application
  const appOptions = meta.appOptions()
  const ssoTarget = form.kind === 'SSO' ? ssoTargetOf(form.application) : null

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e && e.target ? e.target.value : e }))

  const setKind = (kind) => {
    if (mode === 'edit' || kind === form.kind) return
    setForm((f) => ({ ...f, kind, application: KIND_META[kind].appOptions()[0] }))
    setErrors((er) => ({ ...er, application: undefined }))
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(base.current)

  const submit = () => {
    const next = {}
    const name = String(form.name || '').trim()
    if (!name) next.name = 'A group name is required.'
    else if (!/^[A-Z0-9_]+$/.test(name)) next.name = 'Use upper-case letters, digits and underscores only.'
    if (!form.application) next.application = `Select the ${meta.appLabel.toLowerCase()} this group belongs to.`
    setErrors(next)
    if (Object.keys(next).length) return undefined
    return onSubmit({ ...form, name })
  }

  return (
    <>
      <DetailHeader
        backTo={backTo}
        backLabel={backLabel}
        eyebrow={`Groups · ${meta.label}`}
        title={title}
        sub={sub}
        media={<GroupMark icon={meta.icon} tone={form.privileged ? 'warn' : 'acc'} />}
        badges={
          <>
            <Pill tone={mode === 'add' ? 'acc' : 'info'} dot>{mode === 'add' ? 'New record' : 'Editing'}</Pill>
            <Pill tone={meta.tone} icon={meta.icon}>{form.kind}</Pill>
            {form.privileged && <Pill tone="warn" icon="key">Privileged</Pill>}
          </>
        }
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Definition" sub="What the group is called, which register it belongs to and what it means to a requester.">
              <div className="stack">
                <Field
                  label="Group kind"
                  required
                  hint={mode === 'edit'
                    ? 'The kind is fixed once the group is registered.'
                    : 'Determines which register the group joins and which applications it can bind to.'}
                >
                  <div className="seg" role="radiogroup" aria-label="Group kind">
                    {KINDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={form.kind === k}
                        data-on={form.kind === k}
                        disabled={mode === 'edit' && form.kind !== k}
                        onClick={() => setKind(k)}
                      >
                        <Icon name={KIND_META[k].icon} size={12} style={{ marginRight: 5 }} />
                        {k}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Group name" required error={errors.name} hint="Provisioned to the target exactly as entered. Upper-case letters, digits and underscores only." htmlFor="grp-name">
                  <TextInput id="grp-name" value={form.name} onChange={set('name')} placeholder={meta.namePlaceholder} />
                </Field>
                <Field label="Description" hint="Shown in the request catalog and in every attestation packet." htmlFor="grp-desc">
                  <TextInput id="grp-desc" as="textarea" rows={3} value={form.description} onChange={set('description')} />
                </Field>
                <Field label={meta.appLabel} required error={errors.application} hint={meta.appHint} htmlFor="grp-app">
                  <Select
                    id="grp-app"
                    value={form.application}
                    options={appOptions}
                    placeholder={form.application ? undefined : 'Select one'}
                    onChange={set('application')}
                  />
                </Field>
                {ssoTarget && (
                  <Banner tone="info">
                    {ssoTarget.displayName} federates over <b>{ssoTarget.protocol}</b>. Membership is asserted as
                    {' '}<b>{CLAIM_OF[ssoTarget.protocol]}={form.name || 'GROUP_NAME'}</b> in tokens issued to client
                    {' '}<b>{ssoTarget.clientId}</b>.
                  </Banner>
                )}
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card title="Preview" sub="What the register will hold once this is saved.">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Name', v: form.name || 'Not set', icon: 'tag' },
                  { k: 'Kind', v: meta.label, icon: meta.icon },
                  { k: meta.appLabel, v: form.application, icon: 'provision' },
                  ...(mode === 'edit' ? [
                    { k: 'Accountable owner', v: form.owner, icon: 'user' },
                    { k: 'Entitlement class', v: form.privileged ? 'Privileged' : 'Standard', icon: 'key' },
                  ] : [
                    { k: 'Members', v: 'Added on the group record', icon: 'users' },
                    { k: 'Ownership', v: 'Set on the group record', icon: 'user' },
                  ]),
                  ...(ssoTarget ? [
                    { k: 'Protocol', v: ssoTarget.protocol, icon: 'shield' },
                    { k: 'Asserted claim', v: `${CLAIM_OF[ssoTarget.protocol]}=${form.name || 'GROUP_NAME'}`, icon: 'code' },
                  ] : []),
                ]}
              />
            </Card>
            {mode === 'add' && (
              <Card title="Register">
                <div className="t-xs t-mut">
                  {num(registered)} groups are already registered across the application, access and SSO registers.
                  {' '}<Tag tone="acc">{meta.plural}</Tag>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{mode === 'add' ? 'Create group' : 'Save changes'}</Button>
      </StickyActions>
    </>
  )
}
