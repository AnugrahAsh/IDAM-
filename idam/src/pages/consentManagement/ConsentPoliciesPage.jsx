import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { CONSENT_DEFS } from '../shared/comms/commsData'
import ConditionBuilder from '../shared/conditions/ConditionBuilder'
import { blankModel, buildAttributes, modelText } from '../shared/conditions/conditionModel'
import { OPERATORS, attributes as identityAttributes, matchUsers } from '../dynamicPolicies/policyPageData'
import { USERS } from '../../data/seed'
import './ConsentPoliciesPage.css'

export const TRIGGERS = [
  'First sign-in',
  'First sign-in and material change',
  'Every 12 months',
  'Every 24 months',
  'On every sign-in',
]

const cond = (attribute, operator, value) => ({
  join: 'AND',
  groups: [{ join: 'AND', rules: [{ attribute, operator, value }] }],
})

/**
 * Which consent is presented, to whom, and when it must be captured again.
 *
 * The audience used to be a free-text word — "Employees" — that nothing
 * evaluated. It is a condition over the identity registry now, written in the
 * same builder as Dynamic Policy, LDAP provisioning rules and orphaned-account
 * detection, so the population a policy reaches can be counted before it is
 * saved rather than discovered afterwards.
 */
const INITIAL_POLICIES = [
  {
    id: 1,
    name: 'Mandatory workforce privacy',
    trigger: 'First sign-in and material change',
    audience: cond('employeeType', '=', 'Internal'),
    notice: 'Privacy notice',
    mandatory: true,
    status: 'Active',
    updated: '2026-08-09',
  },
  {
    id: 2,
    name: 'Contractor data processing',
    trigger: 'First sign-in',
    audience: cond('employeeType', '=', 'Contractor'),
    notice: 'Acceptable use policy',
    mandatory: true,
    status: 'Active',
    updated: '2026-08-07',
  },
  {
    id: 3,
    name: 'Analytics preference refresh',
    trigger: 'Every 12 months',
    audience: cond('status', '=', 'Active'),
    notice: 'Biometric consent',
    mandatory: false,
    status: 'Draft',
    updated: '2026-08-03',
  },
]

const TODAY = '2026-08-05'

export default function ConsentPoliciesPage({ embedded }) {
  const { toast, confirm, setDrawer } = useApp()
  const [rows, setRows] = useState(INITIAL_POLICIES)

  const catalog = useMemo(() => buildAttributes(identityAttributes()), [])
  const notices = useMemo(() => CONSENT_DEFS.map((c) => c.name), [])

  const reach = (policy) => (policy.status === 'Active' ? matchUsers(policy.audience).length : 0)

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'Active')
    const covered = new Set(active.flatMap((r) => matchUsers(r.audience).map((u) => u.id)))
    return {
      total: rows.length,
      active: active.length,
      mandatory: rows.filter((r) => r.mandatory).length,
      covered: covered.size,
      uncovered: USERS.length - covered.size,
    }
  }, [rows])

  const openEditor = (policy) => {
    const ref = {
      current: policy || {
        id: null,
        name: '',
        trigger: TRIGGERS[0],
        audience: blankModel(identityAttributes()[0].id),
        notice: notices[0],
        mandatory: true,
        status: 'Draft',
      },
    }

    const render = () => {
      const d = ref.current
      const matched = matchUsers(d.audience)
      setDrawer({
        title: policy ? 'Edit assignment rule' : 'Add assignment rule',
        sub: 'Which consent is presented, to whom, and how often it must be captured again.',
        children: (
          <div className="stack">
            <Field label="Rule name" required htmlFor="cp-name">
              <TextInput
                id="cp-name"
                value={d.name}
                placeholder="Mandatory workforce privacy"
                onChange={(e) => { ref.current = { ...d, name: e.target.value }; render() }}
              />
            </Field>
            <div className="grid grid-2">
              <Field label="Consent presented" required hint="The notice this rule presents." htmlFor="cp-notice">
                <Select
                  id="cp-notice"
                  value={d.notice}
                  options={notices}
                  onChange={(e) => { ref.current = { ...d, notice: e.target.value }; render() }}
                />
              </Field>
              <Field label="Capture trigger" required hint="When the identity is asked again." htmlFor="cp-trigger">
                <Select
                  id="cp-trigger"
                  value={d.trigger}
                  options={TRIGGERS}
                  onChange={(e) => { ref.current = { ...d, trigger: e.target.value }; render() }}
                />
              </Field>
            </div>

            <Card title="Audience" sub="The identities this rule reaches. Evaluated live against the directory.">
              <ConditionBuilder
                model={d.audience}
                onChange={(next) => { ref.current = { ...d, audience: next }; render() }}
                catalog={catalog}
                operators={OPERATORS}
                noun="condition"
                nounPlural="conditions"
                idPrefix="cp-cond"
                summary={(
                  <span className="t-xs t-mut">
                    <b className="num">{num(matched.length)}</b> of {num(USERS.length)}{' '}
                    {matched.length === 1 ? 'identity is' : 'identities are'} in scope
                  </span>
                )}
              />
            </Card>

            <div className="row" style={{ gap: 10 }}>
              <Switch
                checked={d.mandatory}
                label="Mandatory"
                onChange={(v) => { ref.current = { ...d, mandatory: v }; render() }}
              />
              <span className="t-sm">
                Mandatory — the identity cannot enter the application catalog until this consent is accepted
              </span>
            </div>

            <Field label="Status" hint="A draft rule is never evaluated." htmlFor="cp-status">
              <Select
                id="cp-status"
                value={d.status}
                options={['Draft', 'Active', 'Retired']}
                onChange={(e) => { ref.current = { ...d, status: e.target.value }; render() }}
              />
            </Field>

            {d.status === 'Active' && d.mandatory && matched.length > 0 && (
              <Banner tone="warn">
                Activating this rule interrupts <b>{num(matched.length)}</b>{' '}
                {matched.length === 1 ? 'identity' : 'identities'} at their next sign-in until they accept{' '}
                <b>{d.notice}</b>.
              </Banner>
            )}
            {matched.length === 0 && (
              <Banner tone="warn">
                No identity matches this audience, so the rule would never fire.
              </Banner>
            )}
          </div>
        ),
        footer: (
          <>
            <Button onClick={() => setDrawer(null)}>Cancel</Button>
            <Button
              variant="pri"
              icon="save"
              disabled={!ref.current.name.trim()}
              onClick={() => {
                const next = { ...ref.current, name: ref.current.name.trim(), updated: TODAY }
                setRows((rs) => (policy
                  ? rs.map((r) => (r.id === policy.id ? next : r))
                  : [...rs, { ...next, id: rs.reduce((m, r) => Math.max(m, r.id), 0) + 1 }]))
                setDrawer(null)
                toast(
                  'ok',
                  policy ? 'Rule saved' : 'Rule created',
                  `${next.name} reaches ${num(matchUsers(next.audience).length)} identities${next.status === 'Active' ? ' and is evaluated from the next sign-in.' : ' once it is activated.'}`,
                )
              }}
            >
              {policy ? 'Save rule' : 'Create rule'}
            </Button>
          </>
        ),
      })
    }

    render()
  }

  const columns = [
    serialColumn('S.No'),
    { key: 'name', label: 'Rule', locked: true, cls: 'td-main' },
    { key: 'notice', label: 'Consent presented' },
    { key: 'trigger', label: 'Capture trigger', optional: true },
    {
      // The condition is the substance of the row; squeezed to eight characters
      // it says nothing, so it gets room and the trigger gives some back.
      key: 'audience', label: 'Audience', cls: 'td-flex', width: 260,
      value: (r) => modelText(r.audience),
      render: (r) => (
        <span className="cell-stack">
          <span className="trunc mono t-xs" title={modelText(r.audience)}>{modelText(r.audience) || 'Everyone'}</span>
          <span className="cell-sub">{num(matchUsers(r.audience).length)} identities in scope</span>
        </span>
      ),
    },
    {
      key: 'mandatory', label: 'Mandatory', width: 120,
      value: (r) => (r.mandatory ? 1 : 0),
      render: (r) => (r.mandatory ? <Pill tone="warn">Mandatory</Pill> : <span className="t-faint">Optional</span>),
    },
    { key: 'status', label: 'Status', render: (r) => <Pill dot tone={r.status === 'Active' ? 'ok' : 'mut'}>{r.status}</Pill> },
    { key: 'updated', label: 'Last updated', cls: 'td-mono' },
  ]

  return (
    <div className="consent-policies-page">
      {!embedded && (
        <PageBar
          title="Assignment Rules"
          sub="Rules that decide which consent is presented, to whom, and when it must be captured again."
          crumbs={[{ label: 'Consents', to: '/iam/consent' }, { label: 'Assignment Rules' }]}
          actions={<Button variant="pri" icon="plus" onClick={() => openEditor(null)}>Add rule</Button>}
        />
      )}

      <StatCards
        label="Assignment rule summary"
        items={[
          { key: 'total', icon: 'policy', label: 'Rules', value: stats.total, chip: `${num(stats.active)} active`, sub: 'deciding when consent is captured' },
          { key: 'mandatory', icon: 'warn', label: 'Mandatory', value: stats.mandatory, chip: 'block the catalog', chipTone: stats.mandatory ? 'warn' : undefined, sub: 'cannot be skipped' },
          { key: 'covered', icon: 'users', label: 'Identities in scope', value: stats.covered, chip: `of ${num(USERS.length)}`, chipTone: 'ok', sub: 'reached by an active rule' },
          { key: 'uncovered', icon: 'ban', label: 'Reached by nothing', value: stats.uncovered, chip: stats.uncovered ? 'no consent captured' : 'none', chipTone: stats.uncovered ? 'warn' : undefined, sub: 'no active rule matches' },
        ]}
      />

      <DataWorkbench
        id="consent-policies"
        toolbar={embedded
          ? <Button size="sm" variant="pri" icon="plus" onClick={() => openEditor(null)}>Add rule</Button>
          : undefined}
        rows={rows}
        columns={columns}
        searchPlaceholder="Search rules by name, consent or trigger…"
        onRowClick={openEditor}
rowActions={(r) => [
          { id: 'edit', label: 'Edit rule', icon: 'edit', onSelect: () => openEditor(r) },
          {
            id: 'status',
            label: r.status === 'Active' ? 'Deactivate' : 'Activate',
            icon: r.status === 'Active' ? 'ban' : 'checkC',
            onSelect: () => {
              setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: x.status === 'Active' ? 'Draft' : 'Active', updated: TODAY } : x)))
              toast('ok', r.status === 'Active' ? 'Rule deactivated' : 'Rule activated',
                r.status === 'Active'
                  ? `${r.name} is no longer evaluated.`
                  : `${r.name} reaches ${num(reach({ ...r, status: 'Active' }))} identities from the next sign-in.`)
            },
          },
          {
            id: 'dup',
            label: 'Duplicate',
            icon: 'copy',
            onSelect: () => {
              setRows((rs) => [...rs, { ...r, id: rs.reduce((m, x) => Math.max(m, x.id), 0) + 1, name: `${r.name} (copy)`, status: 'Draft', updated: TODAY }])
              toast('ok', 'Rule duplicated', `${r.name} (copy) was created as a draft.`)
            },
          },
          { divider: true },
          {
            id: 'del',
            label: 'Delete rule',
            icon: 'trash',
            danger: true,
            onSelect: () => confirm({
              title: `Delete ${r.name}?`,
              body: 'The consent stops being captured for this audience. Acceptance records already held are retained as evidence.',
              confirmLabel: 'Delete rule',
              onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Rule deleted', r.name) },
            }),
          },
        ]}
        emptyTitle="No assignment rules"
        emptyBody="Create a rule to determine when consent is captured."
        emptyIcon="consent"
        footNote="An identity reached by no active rule is never asked for consent"
      />
    </div>
  )
}
