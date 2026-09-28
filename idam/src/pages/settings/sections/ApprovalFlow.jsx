import { useState } from 'react'
import Banner from '../../../components/primitives/Banner'
import Button from '../../../components/primitives/Button'
import Card from '../../../components/primitives/Card'
import Icon from '../../../components/primitives/Icon'
import IconButton from '../../../components/primitives/IconButton'
import Pill from '../../../components/primitives/Pill'
import Select from '../../../components/primitives/Select'
import Tag from '../../../components/primitives/Tag'
import TextInput from '../../../components/primitives/TextInput'
import EmptyState from '../../../components/primitives/EmptyState'
import { SkeletonLine } from '../../../components/primitives/Skeleton'
import { useApp } from '../../../store/AppContext'
import SectionSkeleton, { TableSkeleton } from './SectionSkeleton'
import { LOOKUPS } from '../../../data/seed'
import { writeSection } from '../settingsStore'
import { useApprovalLevels } from '../settingsStore'

/**
 * Approval flow rules.
 *
 * Two questions. First, what scopes a request and an approval at all: the
 * organization the person belongs to, or the office hierarchy they sit in.
 * Second, when it is the hierarchy, how far each side reaches from its own
 * level — which is a rule per level, per side, because a requester never
 * approves and an approver never requests.
 *
 * A level without a rule of its own falls back to the default for that side,
 * so the table holds exceptions rather than a row for every level.
 */

/* The hierarchy this tenant is organised by. Office level is the console's own
   vocabulary for it (Configurations → Lookups), so the rules are written
   against the same words the identity records carry. */
const HIERARCHY = LOOKUPS.office_level

const SIDES = [
  { id: 'requesting', label: 'Requesting', tone: 'mut', hint: 'How far a requester may raise a request' },
  { id: 'approving', label: 'Approving', tone: 'acc', hint: 'How far an approver may approve' },
]

const SCOPES = [
  { value: 'own', label: 'Own level only', needsBelow: false },
  { value: 'ownPlusBelow', label: 'Own level + levels below', needsBelow: true },
  { value: 'ownPlusAll', label: 'Own level + everything below', needsBelow: false },
  { value: 'entire', label: 'Entire hierarchy', needsBelow: false },
  { value: 'none', label: 'No access', needsBelow: false },
]

const scopeOf = (v) => SCOPES.find((s) => s.value === v) || SCOPES[0]

export const scopeText = (rule) => {
  const spec = scopeOf(rule.scope)
  if (!spec.needsBelow) return spec.label
  const n = Number(rule.below) || 0
  return `Own level + ${n} level${n === 1 ? '' : 's'} below`
}

const scopeTone = (scope) => (scope === 'none' ? 'bad' : scope === 'entire' ? 'warn' : 'acc')

const blankRule = () => ({ level: HIERARCHY[0], applies: 'requesting', scope: 'own', below: 1 })

export default function ApprovalFlow({ value, loading = false }) {
  const { toast, confirm } = useApp()
  const levels = useApprovalLevels()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankRule)
  const [adding, setAdding] = useState(false)

  const flow = value || { mode: 'organization', defaults: {}, rules: [] }
  const hierarchy = flow.mode === 'hierarchy'

  const write = (patch) => writeSection('approvalFlow', (f) => ({ ...f, ...patch }))

  const setMode = (mode) => {
    write({ mode })
    toast('ok', 'Approval flow updated', mode === 'hierarchy'
      ? 'Requests and approvals now follow the office hierarchy and the rules below.'
      : 'Requests and approvals are scoped by organization again. The hierarchy rules are kept but not applied.')
  }

  const setDefault = (side, scope) => {
    write({ defaults: { ...flow.defaults, [side]: scope } })
    toast('ok', 'Default updated', `${SIDES.find((s) => s.id === side).label} falls back to “${scopeOf(scope).label}”.`)
  }

  const commit = (rule) => {
    const clean = {
      ...rule,
      below: scopeOf(rule.scope).needsBelow ? Math.max(1, Number(rule.below) || 1) : null,
    }
    if (rule.id) {
      write({ rules: flow.rules.map((r) => (r.id === rule.id ? clean : r)) })
      toast('ok', 'Rule updated', `${clean.level} · ${SIDES.find((s) => s.id === clean.applies).label} · ${scopeText(clean)}`)
    } else {
      const id = flow.rules.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1
      write({ rules: [...flow.rules, { ...clean, id }] })
      toast('ok', 'Rule added', `${clean.level} · ${SIDES.find((s) => s.id === clean.applies).label} · ${scopeText(clean)}`)
    }
    setEditing(null)
    setAdding(false)
  }

  const remove = (rule) => confirm({
    title: `Delete the ${rule.level} rule?`,
    body: `${SIDES.find((s) => s.id === rule.applies).label} at ${rule.level} falls back to the default for that side.`,
    confirmLabel: 'Delete rule',
    onConfirm: () => {
      write({ rules: flow.rules.filter((r) => r.id !== rule.id) })
      toast('ok', 'Rule deleted', `${rule.level} now uses the ${rule.applies} default.`)
    },
  })

  /* A rule being written, as the cells of the row it belongs to. */
  const editorCells = (rule, onSave, onCancel) => (
    <>
      <td>
        <Select
          value={rule.level}
          options={HIERARCHY}
          aria-label="Hierarchy level"
          onChange={(e) => setDraft({ ...rule, level: e.target.value })}
        />
      </td>
      <td>
        <Select
          value={rule.applies}
          options={SIDES.map((s) => ({ value: s.id, label: s.label }))}
          aria-label="Applies to"
          onChange={(e) => setDraft({ ...rule, applies: e.target.value })}
        />
      </td>
      <td>
        <Select
          value={rule.scope}
          options={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
          aria-label="Scope"
          onChange={(e) => setDraft({ ...rule, scope: e.target.value })}
        />
      </td>
      <td>
        <TextInput
          value={scopeOf(rule.scope).needsBelow ? String(rule.below ?? 1) : ''}
          disabled={!scopeOf(rule.scope).needsBelow}
          placeholder={scopeOf(rule.scope).needsBelow ? '2' : 'All'}
          inputMode="numeric"
          aria-label="Levels below"
          onChange={(e) => setDraft({ ...rule, below: e.target.value.replace(/[^0-9]/g, '') })}
        />
      </td>
      <td className="af-acts">
        <IconButton icon="check" label="Save rule" className="af-ok" onClick={() => onSave(rule)} />
        <IconButton icon="x" label="Cancel" onClick={onCancel} />
      </td>
    </>
  )

/* Held while Settings settles. This section is a register of stored rows, not
   a form the operator arrives already typing into: the add row above the table
   appends to rows that are still on their way, so it holds its place with
   them. */
  if (loading) {
    return (
      <div className="stack">
        {/* Scope picker and chain, the office hierarchy, then the level rules
            the brief names — three cards, in the order they land. */}
        <SectionSkeleton><SkeletonLine height={148} /></SectionSkeleton>
        <SectionSkeleton><SkeletonLine height={120} /></SectionSkeleton>
        {/* At the number of rules the stored flow holds: the configuration is
            one document and it is in hand before the settle starts, so the
            table is the height it will be. */}
        <SectionSkeleton><TableSkeleton rows={flow.rules.length || 4} cols={5} /></SectionSkeleton>
      </div>
    )
  }

  return (
    <div className="stack">
      <Card
        title="Approval flow rules"
        sub="Whether requests and approvals are scoped by organization or by the office hierarchy, and how far each side reaches."
      >
        <div className="grid grid-2 af-modes" role="radiogroup" aria-label="Approval flow scope">
          {[
            { id: 'organization', title: 'Organization based', body: 'The current flow. A requester works within their own organization, an approver approves within theirs, and an administrator covers everything.' },
            { id: 'hierarchy', title: 'Hierarchy based', body: 'Scope follows the office hierarchy below, using the rules on this page. An administrator still covers everything.' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={flow.mode === m.id}
              className="af-mode"
              data-on={flow.mode === m.id || undefined}
              onClick={() => setMode(m.id)}
            >
              <span className="af-mode-d" aria-hidden="true" />
              <span className="af-mode-m">
                <span className="af-mode-t">{m.title}</span>
                <span className="af-mode-b">{m.body}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="af-chain">
          <span className="af-chain-k">Hierarchy</span>
          {HIERARCHY.map((h, i) => (
            <span className="af-chain-it" key={h}>
              <Tag tone={hierarchy ? 'acc' : undefined}>{h}</Tag>
              {i < HIERARCHY.length - 1 && <Icon name="chevR" size={11} />}
            </span>
          ))}
        </div>

        {!hierarchy && (
          <div className="af-note">
            <Banner tone="info">
              The rules below are kept and can be prepared now, but nothing applies them while the flow is scoped by
              organization.
            </Banner>
          </div>
        )}
      </Card>

      <Card
        title="Default rules"
        sub="What a level without a rule of its own falls back to. Set a side to No access to limit it to administrators, then add a rule for any level that is an exception."
      >
        <div className="af-defaults">
          {SIDES.map((side) => (
            <div className="af-default" key={side.id}>
              <Tag tone={side.tone}>{side.label}</Tag>
              <span className="af-default-h">{side.hint}</span>
              <span className="spacer" />
              <Select
                className="af-default-sel"
                value={flow.defaults[side.id] || 'none'}
                options={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
                aria-label={`Default scope for ${side.label.toLowerCase()}`}
                onChange={(e) => setDefault(side.id, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="af-steps">
          <Icon name="approve" size={12} />
          <span>Approving applies at every step of the chain:</span>
          {levels.map((l, i) => (
            <span className="af-step" key={l.id}>
              <Tag>{l.name}</Tag>
              {i < levels.length - 1 && <Icon name="arrowRight" size={11} />}
            </span>
          ))}
        </div>
      </Card>

      <Card
        title="Level rules"
        sub="A rule is matched on the hierarchy level and the side it applies to. A rule for that level wins over the default; an approver rule applies at every approval step."
        actions={(
          <Button
            variant="pri"
            size="sm"
            icon="plus"
            disabled={adding}
            onClick={() => { setDraft(blankRule()); setAdding(true); setEditing(null) }}
          >
            Add rule
          </Button>
        )}
      >
        {flow.rules.length === 0 && !adding ? (
          <EmptyState
            icon="hierarchy"
            size="sm"
            title="No level rules"
            body="Every level uses the defaults above. Add a rule for a level that should reach further, or not as far."
          />
        ) : (
          <table className="tbl af-tbl">
            <thead>
              <tr>
                <th>Hierarchy level</th>
                <th>Applies to</th>
                <th>Scope</th>
                <th style={{ width: '7rem' }}>Levels below</th>
                <th style={{ width: '5.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flow.rules.map((rule) => (
                editing === rule.id
                  ? <tr className="af-edit" key={rule.id}>{editorCells(draft, commit, () => setEditing(null))}</tr>
                  : (
                    <tr key={rule.id}>
                      <td className="td-main">{rule.level}</td>
                      <td><Tag tone={SIDES.find((s) => s.id === rule.applies)?.tone}>{SIDES.find((s) => s.id === rule.applies)?.label}</Tag></td>
                      <td><Pill tone={scopeTone(rule.scope)}>{scopeText(rule)}</Pill></td>
                      <td>{scopeOf(rule.scope).needsBelow ? rule.below : scopeOf(rule.scope).value === 'own' ? '—' : 'All'}</td>
                      <td className="af-acts">
                        <IconButton icon="edit" label={`Edit the ${rule.level} rule`} onClick={() => { setDraft(rule); setEditing(rule.id); setAdding(false) }} />
                        <IconButton icon="trash" label={`Delete the ${rule.level} rule`} tone="bad" onClick={() => remove(rule)} />
                      </td>
                    </tr>
                  )
              ))}
              {adding && <tr className="af-edit">{editorCells(draft, commit, () => setAdding(false))}</tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
