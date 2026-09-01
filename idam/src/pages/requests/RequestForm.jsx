import { duration } from '../../lib/format'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import EmptyState from '../../components/primitives/EmptyState'
import FileDrop from '../../components/primitives/FileDrop'
import IconButton from '../../components/primitives/IconButton'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { ME } from '../../data/seed'
import {
  useChain, TYPE_ORDER, TYPE_SPECS,
  birthrightFor, defaultsFor, factorsFor, fieldsOf, grantsFor, groupOf, policyChecks, sensitivityOf, slug, userOf,
} from './data'
import {
  AttributeChangeEditor, DiffList, GroupDualPicker, GroupMultiSelect,
} from './FormControls'

const CHECK_ICON = { ok: 'checkC', warn: 'warn', bad: 'warn' }
const CUSTOM_KINDS = new Set(['groupmulti', 'groupdual', 'attrmulti', 'file'])

function FieldControl({ f, value, v, onChange }) {
  const id = `req-${f.id}`
  if (f.kind === 'groupmulti') {
    return (
      <GroupMultiSelect
        value={Array.isArray(value) ? value : []}
        onChange={(list) => onChange(f.id, list)}
      />
    )
  }
  if (f.kind === 'groupdual') {
    return (
      <GroupDualPicker
        value={value && typeof value === 'object' ? value : { add: [], remove: [] }}
        onChange={(gc) => onChange(f.id, gc)}
      />
    )
  }
  if (f.kind === 'attrmulti') {
    return (
      <AttributeChangeEditor
        user={v.userId ? userOf(v.userId) : null}
        value={value && typeof value === 'object' ? value : {}}
        onChange={(o) => onChange(f.id, o)}
      />
    )
  }
  if (f.kind === 'file') {
    const files = Array.isArray(value) ? value : []
    return (
      <div className="stack" style={{ gap: 8 }}>
        <FileDrop
          accept={f.accept || '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv'}
          multiple
          label="Drag supporting documents here, or browse"
          hint={f.hint2 || 'Attached to the request and visible to every approver in the chain.'}
          onFiles={(list) => onChange(f.id, [...files, ...list.map((x) => ({ name: x.name, size: x.size }))])}
        />
        {files.length > 0 && (
          <div className="stack" style={{ gap: 4 }}>
            {files.map((x, i) => (
              <div className="row-between req-doc" key={`${x.name}-${i}`}>
                <span className="row" style={{ gap: 7, minWidth: 0 }}>
                  <Icon name="file" size={13} />
                  <span className="trunc t-sm">{x.name}</span>
                  <span className="t-xs t-mut">{Math.max(1, Math.round(x.size / 1024))} KB</span>
                </span>
                <IconButton
                  icon="x"
                  size="sm"
                  label={`Remove ${x.name}`}
                  onClick={() => onChange(f.id, files.filter((_, ix) => ix !== i))}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  if (f.kind === 'select') {
    return (
      <Select
        id={id}
        value={value}
        options={f.options}
        placeholder={f.placeholder || 'Select…'}
        onChange={(e) => onChange(f.id, e.target.value)}
      />
    )
  }
  if (f.kind === 'textarea') {
    return (
      <TextInput
        id={id}
        as="textarea"
        rows={4}
        value={value}
        placeholder={f.placeholder}
        onChange={(e) => onChange(f.id, e.target.value)}
      />
    )
  }
  return (
    <TextInput
      id={id}
      type={f.kind === 'date' ? 'date' : 'text'}
      value={value}
      placeholder={f.placeholder}
      onChange={(e) => onChange(f.id, e.target.value)}
    />
  )
}

function ContextRail({ spec, v, built }) {
  const chain = useChain()
  const u = v.userId ? userOf(v.userId) : null

  if (spec.key === 'adduser') {
    const bundle = birthrightFor(v.department)
    const ent = built.entitlements || []
    return (
      <Card
        title="Birthright bundle"
        sub={v.department ? `Applied automatically to every ${v.department} joiner` : 'Choose a department to resolve the bundle'}
      >
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {bundle.map((b) => <span className="tag" key={b}>{b}</span>)}
        </div>
        <KeyValue
          cols={1}
          rows={[
            { k: 'Generated username', v: slug(`${v.firstName}_${v.lastName}`, 'NEW_IDENTITY'), icon: 'user' },
            { k: 'Applications at start', v: `${bundle.length}${ent.length ? ` + ${ent.length} requested entitlement${ent.length === 1 ? '' : 's'}` : ''}`, icon: 'apps' },
            { k: 'Credential delivery', v: 'Single-use enrollment link, 24 hour expiry', icon: 'key' },
            { k: 'Lifecycle policy', v: v.employeeType === 'Contractor' ? 'Contractor 90-day expiry' : 'Standard leaver policy', icon: 'policy' },
          ]}
        />
        {ent.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="t-micro t-mut" style={{ marginBottom: 6 }}>Requested beyond the bundle</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {ent.map((n) => (
                <span className="tag" key={n}>
                  {n}
                  <SeverityBadge level={sensitivityOf(n)}>{sensitivityOf(n)}</SeverityBadge>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    )
  }

  if (spec.key === 'modifyuser') {
    const changes = built.changes || []
    return (
      <Card
        title="Changed values"
        sub={u ? `${u.username} · old value → new value` : 'Select an identity to read its current values'}
        actions={u ? <Tag>{changes.length} staged</Tag> : null}
      >
        {u ? (
          <>
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              <Avatar first={u.firstName} last={u.lastName} size="lg" />
              <div style={{ minWidth: 0 }}>
                <div className="t-h3 trunc">{u.username}</div>
                <div className="t-xs t-mut trunc">{u.email}</div>
              </div>
            </div>
            <DiffList changes={changes} empty="Nothing staged yet. Edit any attribute in the grid to stage a change." />
          </>
        ) : (
          <div className="t-sm t-mut">Nothing to compare yet.</div>
        )}
      </Card>
    )
  }

  if (spec.key === 'appgroups') {
    const adds = built.addGroups || []
    const rems = built.removeGroups || []
    const focus = adds[0] || ''
    const g = groupOf(focus)
    const grants = focus ? grantsFor(focus) : []
    return (
      <Card
        title="What this changes"
        sub={adds.length + rems.length > 0
          ? `${adds.length} addition${adds.length === 1 ? '' : 's'} · ${rems.length} removal${rems.length === 1 ? '' : 's'}`
          : 'Mark groups to add or remove to see what the request carries'}
        actions={focus ? <SeverityBadge level={sensitivityOf(focus)}>{sensitivityOf(focus)}</SeverityBadge> : null}
      >
        {adds.length + rems.length === 0 ? (
          <div className="t-sm t-mut">Nothing selected.</div>
        ) : (
          <>
            <DiffList changes={built.changes} />
            {focus && (
              <div style={{ marginTop: 12 }}>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="t-micro t-mut">What {focus} grants</span>
                  {g && <Tag>{g.kind}</Tag>}
                  {g && <span className="t-xs t-mut">{num(g.members)} current holders</span>}
                </div>
                <div className="feed">
                  {grants.map((x) => (
                    <div className="feed-it" key={x.capability}>
                      <span className="feed-ic" data-tone={x.sensitivity === 'critical' ? 'bad' : x.sensitivity === 'high' ? 'warn' : 'mut'}>
                        <Icon name="bolt" size={13} />
                      </span>
                      <div className="feed-m">
                        <div className="feed-t">{x.capability}</div>
                        <div className="feed-s"><span>{x.target}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    )
  }

  if (spec.key === 'mfareset') {
    const factors = factorsFor(u)
    return (
      <Card title="Current factors" sub={u ? `${u.username} enrollment state` : 'Select an identity to read its factors'}>
        {!u ? (
          <div className="t-sm t-mut">Nothing to clear yet.</div>
        ) : factors.length === 0 ? (
          <div className="banner" data-tone="warn">
            <Icon name="warn" size={15} />
            <div>{u.username} holds no enrolled factor. There is nothing to reset — enrollment is already forced at the next sign-in.</div>
          </div>
        ) : (
          <div className="feed">
            {factors.map((m) => (
              <div className="feed-it" key={m.id}>
                <span className="feed-ic" data-tone={m.strength === 'strongest' ? 'ok' : m.strength === 'weak' || m.strength === 'weakest' ? 'warn' : 'acc'}>
                  <Icon name={m.icon} size={13} />
                </span>
                <div className="feed-m">
                  <div className="feed-t">{m.name}</div>
                  <div className="feed-s"><span>{m.sub}</span></div>
                </div>
                <span className="feed-time">{m.strength}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    )
  }

  return null
}

export default function RequestForm({ type, onSubmit }) {
  const chain = useChain()
  const { toast, navigate } = useApp()
  const spec = TYPE_SPECS[type]
  const [v, setV] = useState(() => (spec ? defaultsFor(spec) : {}))
  const [touched, setTouched] = useState(false)

  const checks = useMemo(() => (spec ? policyChecks(spec, v) : []), [spec, v])

  if (!spec) {
    return (
      <>
        <PageBar title="Unknown request type" crumbs={[{ label: 'Access Requests', to: '/iam/requests' }, { label: String(type) }]} />
        <EmptyState
          icon="request"
          title={`No request form for "${type}"`}
          body={`Supported types are ${TYPE_ORDER.join(', ')}. Open the requester and choose a type from the New request menu.`}
          actions={<Button variant="pri" icon="chevL" onClick={() => navigate('/iam/requests')}>Back to requests</Button>}
        />
      </>
    )
  }

  const fields = fieldsOf(spec)
  const missing = fields.filter((f) => f.required && !CUSTOM_KINDS.has(f.kind) && !String(v[f.id] || '').trim())
  const built = spec.build(v)
  const specError = spec.validate ? spec.validate(v, built) : ''
  const customDirty = Boolean(
    (built.changes && built.changes.length)
    || (built.entitlements && built.entitlements.length),
  )
  const dirty = customDirty || fields.some((f) => !CUSTOM_KINDS.has(f.kind) && String(v[f.id] || '') !== String(f.value || ''))
  const routedLevels = built.sodConflict || built.risk === 'high' ? 3 : 2

  const set = (id, value) => setV((s) => ({ ...s, [id]: value }))

  const submit = () => {
    setTouched(true)
    if (missing.length > 0) {
      toast('warn', 'Incomplete request', `${missing.map((f) => f.label).join(', ')} ${missing.length === 1 ? 'is' : 'are'} required.`)
      return
    }
    if (specError) {
      toast('warn', 'Incomplete request', specError)
      return
    }
    onSubmit(spec, v, built, routedLevels)
  }

  return (
    <>
      <DetailHeader
        backTo="/iam/requests"
        backLabel="Access Requests"
        eyebrow="New request"
        title={spec.label}
        sub={spec.intro}
        badges={(
          <>
            <Pill tone="mut" dot>Draft</Pill>
            <Tag>{routedLevels} approval levels</Tag>
            <SeverityBadge level={built.risk}>{built.risk} risk</SeverityBadge>
            {built.sodConflict && <Pill tone="bad" icon="sod">Conflict detected</Pill>}
          </>
        )}
        meta={(
          <>
            <Fact icon="user" label="Requester" value={`${ME.firstName} ${ME.lastName}`} />
            <Fact icon="users" label="For identity" value={built.username === 'UNKNOWN' ? 'Not selected' : built.username} />
            <Fact icon="group" label="Target" value={built.target || 'Not selected'} />
            <Fact icon="clock" label="Service level" value="48 hours" />
            <Fact icon="approve" label="Routing" value={chain.slice(0, routedLevels).map((s) => s.title).join(' → ')} />
          </>
        )}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            {spec.sections.map((section) => (
              <Card key={section.id} title={section.title} sub={section.sub}>
                <div className="grid grid-2">
                  {section.fields.map((f) => (
                    <Field
                      key={f.id}
                      label={f.label}
                      required={f.required}
                      hint={f.hint}
                      span={f.span}
                      htmlFor={`req-${f.id}`}
                      error={touched && f.required && !String(v[f.id] || '').trim() ? `${f.label} is required` : undefined}
                    >
                      <FieldControl f={f} value={CUSTOM_KINDS.has(f.kind) ? v[f.id] : (v[f.id] || '')} v={v} onChange={set} />
                    </Field>
                  ))}
                </div>
              </Card>
            ))}

            {(spec.key === 'modifyuser' || spec.key === 'appgroups' || spec.key === 'adduser') && (
              <Card
                title="Change summary"
                sub="Exactly what approvers see before deciding — old value → new value"
                actions={<Tag>{(built.changes || []).length} change{(built.changes || []).length === 1 ? '' : 's'}</Tag>}
              >
                <DiffList
                  changes={built.changes}
                  empty={spec.key === 'modifyuser'
                    ? 'Nothing staged yet. Edit attribute values above to build the change set.'
                    : spec.key === 'appgroups'
                      ? 'Nothing staged yet. Mark groups to add or remove above.'
                      : 'No entitlement requested beyond the birthright bundle.'}
                />
              </Card>
            )}

            <Card title="What happens on approval" sub="The provisioning plan the platform executes once the chain clears">
              <div className="feed">
                {grantsFor(built.target).map((x, i) => (
                  <div className="feed-it" key={x.capability}>
                    <span className="feed-ic" data-tone="mut"><Icon name="provision" size={13} /></span>
                    <div className="feed-m">
                      <div className="feed-t">Step {i + 1} · {x.capability}</div>
                      <div className="feed-s">
                        <span>{x.target}</span>
                        <SeverityBadge level={x.sensitivity}>{x.sensitivity}</SeverityBadge>
                      </div>
                    </div>
                    <span className="feed-time">queued</span>
                  </div>
                ))}
              </div>
              <div className="t-xs t-faint" style={{ marginTop: 10 }}>
                Nothing in this plan runs until the final approver commits. Every step is written to the job log with
                its target, result and duration.
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card title="Routing" sub="Where this request goes and who decides">
              <div className="chain">
                {chain.slice(0, routedLevels).map((step, i) => (
                  <div className="chain-step" key={step.title} data-state={i === 0 ? 'current' : 'future'}>
                    <span className="cs-n" style={{ background: i === 0 ? 'var(--warn-core)' : 'var(--mut)' }}>{i + 1}</span>
                    <div className="cs-m">
                      <div className="cs-t">Level {i + 1} · {step.title}</div>
                      <div className="cs-s">{step.detail}. Target {step.sla}h.</div>
                    </div>
                  </div>
                ))}
              </div>
              {routedLevels === 3 && (
                <div className="banner" data-tone="warn" style={{ marginTop: 12 }}>
                  <Icon name="shield" size={15} />
                  <div>
                    A security review was added because this request is
                    {built.sodConflict ? ' in conflict with existing access' : ' high risk'}.
                  </div>
                </div>
              )}
            </Card>

            <Card
              title="Policy pre-check"
              sub="Run live as you type, before an approver ever sees this"
              actions={<Pill tone={checks.some((c) => c.tone === 'bad') ? 'bad' : checks.some((c) => c.tone === 'warn') ? 'warn' : 'ok'} dot>
                {checks.some((c) => c.tone === 'bad') ? 'Blocking' : checks.some((c) => c.tone === 'warn') ? 'Warnings' : 'Clear'}
              </Pill>}
            >
              {checks.length === 0 ? (
                <div className="t-sm t-mut">No policy applies to this request type.</div>
              ) : (
                <div className="feed">
                  {checks.map((c) => (
                    <div className="feed-it" key={c.id}>
                      <span className="feed-ic" data-tone={c.tone === 'bad' ? 'bad' : c.tone === 'warn' ? 'warn' : 'ok'}>
                        <Icon name={CHECK_ICON[c.tone]} size={13} />
                      </span>
                      <div className="feed-m">
                        <div className="feed-t">{c.label}</div>
                        <div className="feed-s"><span>{c.detail}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <ContextRail spec={spec} v={v} built={built} />

            <Card title="After submission" sub="What the requester and the identity see">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Request id', v: 'Assigned on submit', icon: 'request' },
                  { k: 'First approver notified', v: 'Immediately, by mail and in-console', icon: 'mail' },
                  { k: 'Reminder', v: 'Every 12 hours until decided', icon: 'bell' },
                  { k: 'Escalation', v: 'Line manager at 48 hours', icon: 'trendUp' },
                  { k: 'Withdrawal', v: 'Possible at any point before the final decision', icon: 'ban' },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        message={missing.length > 0
          ? `${missing.length} required ${missing.length === 1 ? 'field' : 'fields'} outstanding`
          : specError || `Ready to submit · ${routedLevels} approval levels`}
      >
        <Button onClick={() => navigate('/iam/requests')}>Cancel</Button>
        <Button variant="pri" icon="request" onClick={submit}>{spec.submitLabel}</Button>
      </StickyActions>
    </>
  )
}
