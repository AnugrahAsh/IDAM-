import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import KeyValue from '../../components/primitives/KeyValue'
import Select from '../../components/primitives/Select'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { nextId } from '../../data/seed'
import { num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useState } from 'react'
import SearchSelect from '../../components/primitives/SearchSelect'
import { BASE, DEFAULT_META, GROUP_NAMES, RULE_TYPES, SCOPES, applicationOf, combinationOf, combinationsOverlap, listLabel, memberCount, metaFor } from './sodData'
import { sodSeverityBadge, sodSeverityOptions, useSodSeverities } from '../settings/settingsStore'

export default function RuleBuilder({ rule, rules, setRules }) {
  const { toast, navigate } = useApp()
  const base = rule ? metaFor(rule) : DEFAULT_META
  // Subscribed rather than read once: a severity added in Settings has to be
  // offered by the dropdown that is already open behind that screen.
  useSodSeverities()
  const severities = sodSeverityOptions()
  const [draft, setDraft] = useState(() => ({
    name: rule ? rule.name : '',
    description: rule ? rule.description : '',
    type: rule ? rule.type : 'Anti-affinity',
    severity: rule ? rule.severity : (sodSeverityOptions()[0] || 'high'),
    combination: rule ? combinationOf(rule) : [],
    scope: base.scope,
  }))
  const [touched, setTouched] = useState(false)
  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setTouched(true) }

  /* The combination is drawn from the application-group register. A rule saved
     before an entitlement left that register still lists it, so whatever the
     rule already holds stays selectable — editing a rule never silently drops
     one of its own entitlements. */
  const groupOptions = [...new Set([...GROUP_NAMES, ...draft.combination].filter(Boolean))]

  /* A severity the register no longer offers is kept for this rule rather than
     snapping to the first option, which would silently re-grade a control. */
  const severityOptions = severities.includes(draft.severity) ? severities : [draft.severity, ...severities]

  /* A combination of one entitlement grades nothing: there is no second thing
     for it to be held alongside. Two is the floor. */
  const nameError = touched && !draft.name.trim() ? 'A rule name is required.' : ''
  const comboError = draft.combination.length < 2
    ? 'Select at least two application groups. A combination of one grades nothing.'
    : ''
  const duplicatePair = rules.some((r) => r.id !== (rule ? rule.id : null)
    && combinationsOverlap(combinationOf(r), draft.combination))
  // Every unordered pair the set covers — what the sweep actually tests.
  const combinations = Math.max(0, (draft.combination.length * (draft.combination.length - 1)) / 2)
  const valid = draft.name.trim() && draft.combination.length >= 2

  const save = () => {
    setTouched(true)
    if (!valid) {
      toast('warn', 'Rule incomplete', 'A name and at least two application groups are required.')
      return
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || 'No description supplied.',
      type: draft.type,
      severity: draft.severity,
      groups: [...draft.combination],
    }
    if (rule) {
      setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, ...payload } : r)))
      toast('ok', 'Rule saved', `${payload.name} is evaluated on the next scan.`)
      navigate(`${BASE}/${rule.id}`)
      return
    }
    let created = null
    setRules((rs) => {
      created = { ...payload, id: nextId(rs), violations: 0 }
      return [...rs, created]
    })
    toast('ok', 'Rule created', `${payload.name} runs on the next segregation-of-duties scan.`)
    if (created) navigate(`${BASE}/${created.id}`)
  }

  return (
    <>
      <DetailHeader
        backTo={rule ? `${BASE}/${rule.id}` : BASE}
        backLabel={rule ? rule.name : 'Segregation of Duties'}
        eyebrow={rule ? 'Edit segregation-of-duties rule' : 'New segregation-of-duties rule'}
        title={draft.name || (rule ? rule.name : 'Untitled rule')}
        sub="Declare a toxic or required entitlement combination. The nightly sweep evaluates every identity in scope against it."
        badges={
          <>
            <SeverityBadge level={sodSeverityBadge(draft.severity)}>{draft.severity}</SeverityBadge>
            <Tag tone={draft.type === 'Anti-affinity' ? 'acc' : undefined}>{draft.type}</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="sod" label="Combination" value={draft.combination.join(' + ') || 'Not selected'} />
            <Fact icon="building" label="Scope" value={draft.scope} />
          </>
        }
        actions={<Button icon="x" onClick={() => navigate(rule ? `${BASE}/${rule.id}` : BASE)}>Cancel</Button>}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Control" sub="How the rule is described in the control register">
              <div className="grid grid-2">
                <Field label="Rule name" required error={nameError} span={2} htmlFor="sod-name">
                  <TextInput id="sod-name" value={draft.name} placeholder="Create and approve payment" onChange={(e) => set({ name: e.target.value })} />
                </Field>
                <Field label="Description" span={2} hint="What the control asserts, in the language of the audit." htmlFor="sod-desc">
                  <TextInput id="sod-desc" as="textarea" rows={3} value={draft.description} placeholder="A single identity must not both raise and approve a payment batch." onChange={(e) => set({ description: e.target.value })} />
                </Field>
                <Field label="Rule type" hint="Anti-affinity forbids the pair. Affinity requires it." htmlFor="sod-type">
                  <Select id="sod-type" value={draft.type} options={RULE_TYPES} onChange={(e) => set({ type: e.target.value })} />
                </Field>
                <Field label="Severity" hint="Managed in Settings → Segregation of duties severity." htmlFor="sod-sev">
                  <Select id="sod-sev" value={draft.severity} options={severityOptions} onChange={(e) => set({ severity: e.target.value })} />
                </Field>
                <Field label="Scope" span={2} hint="The population the nightly sweep evaluates against this rule." htmlFor="sod-scope">
                  <Select id="sod-scope" value={draft.scope} options={SCOPES} onChange={(e) => set({ scope: e.target.value })} />
                </Field>
              </div>
            </Card>

            <Card
              title="Entitlement combination"
              sub={`Application groups from the register. ${draft.type === 'Anti-affinity'
                ? 'No identity may hold more than one of them.'
                : 'An identity holding one of them is expected to hold all of them.'}`}
            >
              <div className="stack">
                <Field
                  label="Application groups"
                  required
                  error={touched ? comboError : ''}
                  hint="Select every application group the rule grades together. Order carries no meaning."
                  htmlFor="sod-combination"
                >
                  <SearchSelect
                    id="sod-combination"
                    multiple
                    value={draft.combination}
                    options={groupOptions}
                    placeholder="Select application groups"
                    searchPlaceholder="Search application groups…"
                    emptyLabel="No application group matches"
                    onChange={(e) => set({ combination: e.target.value })}
                  />
                </Field>

                {/* One line per group: the group and the application it is
                    provisioned to is all that is needed to read the combination
                    back. */}
                <div style={{ overflowX: 'auto' }}><table className="tbl">
                  <thead>
                    <tr>
                      <th>Application group</th>
                      <th>Application</th>
                      <th className="td-num">Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.combination.length === 0 ? (
                      <tr><td colSpan={3} className="t-mut">Nothing selected</td></tr>
                    ) : draft.combination.map((g) => (
                      <tr key={g}>
                        <td className="td-main td-mono">{g}</td>
                        <td>{applicationOf(g)}</td>
                        <td className="td-num">{num(memberCount(g))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>

                {draft.combination.length >= 2 && (
                  <Banner tone="info">
                    {draft.type === 'Anti-affinity'
                      ? <>An identity holding any two of <b>{listLabel(draft.combination)}</b> is a breach. The sweep tests {num(combinations)} {combinations === 1 ? 'pair' : 'pairs'}.</>
                      : <>An identity holding one of <b>{listLabel(draft.combination)}</b> is expected to hold the rest. Holding a partial set is a breach.</>}
                  </Banner>
                )}

                {duplicatePair && (
                  <Banner tone="warn">
                    Another rule already grades a pair inside this combination. Overlapping rules produce duplicate
                    breaches in the register for the same identity.
                  </Banner>
                )}
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card title="Detection preview" sub="Population the rule will evaluate">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Rule type', v: draft.type, icon: 'sod' },
                  { k: 'Application groups', v: `${draft.combination.length} selected · ${num(draft.combination.reduce((a, g) => a + memberCount(g), 0))} members`, icon: 'users' },
                  { k: 'Applications touched', v: [...new Set(draft.combination.map(applicationOf))].join(', ') || 'None', icon: 'provision' },
                  { k: 'Pairs graded', v: num(combinations), icon: 'layers' },
                  { k: 'Scope', v: draft.scope, icon: 'building' },
                ]}
              />
            </Card>
          </div>
        </div>

        <StickyActions dirty={touched} message={touched ? 'Unsaved changes' : 'No changes'}>
          <Button onClick={() => navigate(rule ? `${BASE}/${rule.id}` : BASE)}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={save}>{rule ? 'Save changes' : 'Create rule'}</Button>
        </StickyActions>
      </div>
    </>
  )
}

