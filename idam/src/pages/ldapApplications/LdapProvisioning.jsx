import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { USERS } from '../../data/seed'
import ConditionBuilder from '../shared/conditions/ConditionBuilder'
import { buildAttributes } from '../shared/conditions/conditionModel'
import { OPERATORS } from '../dynamicPolicies/policyPageData'
import { childrenOf } from './directoryTree'
import { fetchDns } from './ldapModel'
import {
  blankCondition, conditionOf, expressionOf, matchesFor, ruleAttributes,
} from './rulesData'

// ---------------------------------------------------------------------------
// Provisioning rules, scoped to one directory.
//
// A rule cannot exist without a directory, so it is not created on a page that
// has to ask which one. Opening this tab has already answered that question,
// which is what lets the two hard parts of the form finally be helped: the
// organizational unit is offered from this directory's own tree rather than
// typed as a free DN, and the condition is written against the attributes this
// directory actually maps rather than from memory.
// ---------------------------------------------------------------------------

/* The containers under the base DN, read the way the Directory tab reads them.
   Two levels is enough to cover where identities are actually written without
   turning the picker into a tree of its own. */
const ouOptions = (app) => {
  const seen = new Set()
  const out = []
  const push = (dn, label) => {
    if (seen.has(dn)) return
    seen.add(dn)
    out.push({ value: dn, label })
  }
  push(app.baseDn, `${app.baseDn} · base DN`)
  fetchDns(app).forEach((dn) => push(dn, dn))
  const level1 = childrenOf(app, app.baseDn, 0).filter((e) => e.expandable)
  level1.forEach((e) => {
    push(e.dn, e.dn)
    childrenOf(app, e.dn, 1).filter((c) => c.expandable).forEach((c) => push(c.dn, c.dn))
  })
  return out
}

/* A DN belongs to this directory only if it sits at or below the base DN. The
   check is what the free-text field could never do while the directory was
   still a dropdown on the form. */
const normaliseDn = (dn) => String(dn || '').trim().split(',').map((p) => p.trim()).filter(Boolean).join(',')

const dnFault = (dn, baseDn) => {
  const v = String(dn || '').trim()
  if (!v) return 'Choose or type where matched identities are written.'
  // A DN pasted from a directory browser often carries a space after each
  // comma. That is the same DN, so it is normalised before comparison rather
  // than rejected as malformed.
  const flat = normaliseDn(v)
  if (!/^[a-z]+=[^,]+(,[a-z]+=[^,]+)*$/i.test(flat)) return 'This is not a distinguished name. Use the form ou=name,dc=example,dc=com.'
  const low = flat.toLowerCase()
  const base = normaliseDn(baseDn).toLowerCase()
  if (low !== base && !low.endsWith(`,${base}`)) return `Outside this directory. The DN must sit under ${baseDn}.`
  return ''
}

/* Where a rule writes to. A dropdown of what the directory holds, with an
   escape hatch for a container that has not been read yet — validated against
   the base DN either way, so a DN from another tree cannot be saved. */
function OuPicker({ app, value, onChange }) {
  const options = useMemo(() => ouOptions(app), [app])
  const known = options.some((o) => o.value === value)
  const [typed, setTyped] = useState(!!value && !known)

  return (
    <div className="stack" style={{ gap: 'var(--sp-2)' }}>
      {typed ? (
        <TextInput
          id="lp-ou"
          className="mono"
          value={value}
          spellCheck="false"
          placeholder={`ou=finance,${app.baseDn}`}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Select
          id="lp-ou"
          className="mono"
          value={value}
          options={options}
          placeholder="Select an organizational unit"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <div className="lp-ou-foot">
        <button
          type="button"
          className="link"
          onClick={() => { setTyped((t) => !t); if (!typed) return; if (!options.some((o) => o.value === value)) onChange('') }}
        >
          <Icon name={typed ? 'directory' : 'edit'} size={11} />
          {typed ? 'Choose from the directory' : 'Type a DN instead'}
        </button>
        <span className="spacer" />
        <span className="t-xs t-mut">
          Scoped to <span className="mono">{app.baseDn}</span>
        </span>
      </div>
    </div>
  )
}

const blank = () => ({ name: '', ouDn: '', condition: blankCondition() })

function RuleForm({ app, catalog, initial, onChange }) {
  const [d, setD] = useState(initial)
  const [touched, setTouched] = useState(false)
  const set = (k, v) => { const next = { ...d, [k]: v }; setD(next); onChange(next) }
  const model = conditionOf(d)
  const matches = matchesFor(model)
  const fault = touched ? dnFault(d.ouDn, app.baseDn) : ''

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Field
          label="Rule name"
          required
          span={2}
          hint="Shown in this directory's rule list and in provisioning run logs."
          htmlFor="lp-name"
        >
          <TextInput
            id="lp-name"
            className="mono"
            value={d.name}
            placeholder="finance_sox_scope"
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field
          label="Organizational unit"
          required
          span={2}
          hint={`Matched identities are created below this DN, inside ${app.displayName}.`}
          htmlFor="lp-ou"
          error={fault || undefined}
        >
          <OuPicker
            app={app}
            value={d.ouDn}
            onChange={(v) => { setTouched(true); set('ouDn', v) }}
          />
        </Field>
      </div>

      <Card
        title="Condition"
        sub={`Identities matching this are written into the organizational unit above. Attributes ${app.displayName} maps are offered first.`}
      >
        {/* The same builder as Dynamic Policy and Orphan Accounts, over the same
            identity attribute registry — so an operator who can write one rule
            can write all three, and reads them the same way. */}
        <ConditionBuilder
          model={model}
          onChange={(next) => set('condition', next)}
          catalog={catalog}
          operators={OPERATORS}
          noun="condition"
          nounPlural="conditions"
          idPrefix="lp-cond"
          summary={(
            <span className="t-xs t-mut">
              <b className="num">{num(matches.length)}</b> of {num(USERS.length)} identities match right now
            </span>
          )}
        />
      </Card>
    </div>
  )
}

export default function LdapProvisioning({ app, rules, setRules, mappings }) {
  const { toast, confirm, setDrawer } = useApp()
  const draft = useState(() => ({ current: null }))[0]

  const mine = useMemo(
    () => rules.filter((r) => String(r.applicationId) === String(app.id)),
    [rules, app.id],
  )

  // The condition offers this directory's mapped attributes ahead of the rest,
  // each labelled with the LDAP attribute it lands on. A misspelled attribute
  // in a condition is a silent failure — the rule simply matches nothing — so
  // the names are worth handing over rather than asking an operator to recall.
  const catalog = useMemo(() => {
    const mapped = new Map(mappings.map((m) => [m.idam, m]))
    const all = ruleAttributes()
    const decorate = (a) => {
      const m = mapped.get(a.id)
      return m ? { ...a, label: `${a.label} → ${m.ldap}`, mapped: true } : a
    }
    const inDirectory = all.filter((a) => mapped.has(a.id)).map(decorate)
    const rest = all.filter((a) => !mapped.has(a.id))
    return buildAttributes([...inDirectory, ...rest])
  }, [mappings])

  const unmappedNames = useMemo(() => {
    const mapped = new Set(mappings.map((m) => m.idam))
    return mine
      .flatMap((r) => conditionOf(r).groups.flatMap((g) => g.rules))
      .map((r) => r.attribute)
      .filter((a) => a && !mapped.has(a))
  }, [mine, mappings])

  const rows = useMemo(() => mine.map((r) => ({
    ...r,
    expression: expressionOf(conditionOf(r)),
    matched: matchesFor(conditionOf(r)).length,
  })), [mine])

  const openForm = (rule) => {
    draft.current = rule
      ? { name: rule.name, ouDn: rule.ouDn, condition: conditionOf(rule) }
      : blank()
    setDrawer({
      title: rule ? `Edit ${rule.name}` : 'Add provisioning rule',
      sub: rule
        ? `Changes apply to ${app.displayName} from the next provisioning run.`
        : `Identities matching the condition are written into ${app.displayName}.`,
      size: 'lg',
      children: <RuleForm app={app} catalog={catalog} initial={draft.current} onChange={(v) => { draft.current = v }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="save"
            onClick={() => {
              const d = draft.current
              if (!d.name.trim()) { toast('warn', 'Name required', 'Give the rule a name.'); return }
              const fault = dnFault(d.ouDn, app.baseDn)
              if (fault) { toast('warn', 'Organizational unit not usable', fault); return }
              const entry = {
                ...d,
                id: rule ? rule.id : Math.max(0, ...rules.map((r) => r.id)) + 1,
                name: d.name.trim(),
                ouDn: normaliseDn(d.ouDn),
                // The directory is taken from context and never asked for, but
                // it is still stored — the cross-directory audit view reads it.
                applicationId: app.id,
                application: app.displayName,
                createdOn: rule ? rule.createdOn : new Date().toISOString().slice(0, 16).replace('T', ' '),
              }
              setRules((rs) => (rule ? rs.map((r) => (r.id === rule.id ? entry : r)) : [...rs, entry]))
              setDrawer(null)
              toast('ok', rule ? 'Rule saved' : 'Rule created',
                `${entry.name} · ${matchesFor(conditionOf(entry)).length} identities match.`)
            }}
          >
            {rule ? 'Save changes' : 'Create rule'}
          </Button>
        </>
      ),
    })
  }

  const remove = (rule) => confirm({
    title: `Delete ${rule.name}?`,
    body: `Identities already written into ${rule.ouDn} stay where they are, but nothing new is routed there by ${app.displayName}.`,
    confirmLabel: 'Delete rule',
    onConfirm: () => {
      setRules((rs) => rs.filter((r) => r.id !== rule.id))
      toast('ok', 'Rule deleted', rule.name)
    },
  })

  // No application column: every row on this screen belongs to this directory,
  // so a column repeating its name would say nothing.
  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Rule', locked: true, cls: 'td-main td-wide', width: 210,
      render: (r) => <span className="mono trunc">{r.name}</span>,
    },
    {
      key: 'ouDn', label: 'Organizational unit', cls: 'td-mono td-flex',
      render: (r) => (
        <span className="trunc" title={r.ouDn}>
          <span className="lp-ou-rdn">{String(r.ouDn).split(',')[0]}</span>
          <span className="lp-ou-rest">{String(r.ouDn).slice(String(r.ouDn).split(',')[0].length)}</span>
        </span>
      ),
    },
    {
      key: 'expression', label: 'Condition', cls: 'td-flex',
      render: (r) => <code className="mono trunc rule-code">{r.expression}</code>,
    },
    {
      key: 'matched', label: 'Matches', align: 'right', width: 104,
      render: (r) => (r.matched ? num(r.matched) : <Pill tone="warn">0</Pill>),
    },
    { key: 'createdOn', label: 'Created on', cls: 'td-mono', width: 132 },
  ]

  const rowActions = (r) => [
    { id: 'edit', label: 'View / edit', icon: 'edit', onSelect: () => openForm(r) },
    {
      id: 'preview',
      label: 'Preview matches',
      icon: 'users',
      onSelect: () => toast('info', `${r.name} matches ${matchesFor(conditionOf(r)).length} identities`, r.expression),
    },
    {
      id: 'browse',
      label: 'Open the target OU',
      icon: 'directory',
      onSelect: () => toast('info', 'Target organizational unit', r.ouDn),
    },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => remove(r) },
  ]

  const totalMatched = rows.reduce((a, r) => a + r.matched, 0)
  const dead = rows.filter((r) => !r.matched).length

  return (
    <div className="stack">
      <StatCards
        label="Provisioning rule summary"
        items={[
          {
            key: 'rules',
            icon: 'policy',
            label: 'Rules on this directory',
            value: mine.length,
            chip: mine.length ? 'active' : 'none yet',
            sub: `writing into ${app.displayName}`,
          },
          {
            key: 'matched',
            icon: 'users',
            label: 'Identities routed',
            value: totalMatched,
            chip: 'matched now',
            chipTone: 'ok',
            sub: `of ${num(USERS.length)} in the identity store`,
          },
          {
            key: 'dead',
            icon: 'warn',
            label: 'Rules matching nothing',
            value: dead,
            chip: dead ? 'check the condition' : 'all matching',
            chipTone: dead ? 'warn' : undefined,
            sub: 'no identity satisfies them',
          },
          {
            key: 'ous',
            icon: 'directory',
            label: 'Target OUs',
            value: new Set(mine.map((r) => r.ouDn)).size,
            chip: 'destinations',
            sub: `under ${app.baseDn}`,
          },
        ]}
      />

      {unmappedNames.length > 0 && (
        <Banner tone="warn">
          <b>
            {new Set(unmappedNames).size} attribute
            {new Set(unmappedNames).size === 1 ? ' is' : 's are'} referenced by a condition but not mapped on this
            directory
          </b>
          {': '}
          {[...new Set(unmappedNames)].map((n) => <Tag key={n}>{n}</Tag>)}
          {' '}A rule reading an unmapped attribute still evaluates against the identity store, but the value never
          reaches {app.displayName}. Add the mapping on the Attributes tab.
        </Banner>
      )}

      <DataWorkbench
        id={`ldap-rules-${app.id}`}
        rows={rows}
        columns={columns}
        rowActions={rowActions}
        onRowClick={openForm}
        searchPlaceholder="Search by rule, organizational unit or condition…"
        toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => openForm(null)}>Add rule</Button>}
        emptyTitle={mine.length === 0 ? 'No provisioning rule on this directory' : 'No provisioning rule matches'}
        emptyBody={mine.length === 0
          ? `Nothing is routed into ${app.displayName} yet. A rule decides which identities are written into which organizational unit under ${app.baseDn}.`
          : 'Adjust the search above.'}
        emptyIcon="policy"
        footNote={`Evaluated in order on every provisioning run against ${app.baseDn}`}
      />
    </div>
  )
}
