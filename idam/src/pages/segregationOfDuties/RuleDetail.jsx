import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import { num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useMemo } from 'react'
import Tabs from '../../components/primitives/Tabs'
import { BASE, exceptionsFor, metaFor, ruleLabel } from './sodData'
import { sodSeverityBadge, useSodSeverities } from '../settings/settingsStore'
import { useLoading } from '../../lib/useLoading'
import DefinitionTab from './DefinitionTab'
import ExceptionTab from './ExceptionTab'

export default function RuleDetail({ rule, tab, violations, onDelete }) {
  const { toast, confirm, navigate } = useApp()
  // Subscribed so a severity renamed in Settings re-badges this header at once.
  useSodSeverities()
  const meta = metaFor(rule)
  const open = violations.filter((v) => v.status === 'Open').length
  const active = tab === 'exception' ? 'exception' : 'information'
  const exceptions = useMemo(() => exceptionsFor(rule), [rule])
  /* One flag, keyed on the rule and the tab it is being read through. The
     masthead is chrome — it carries the tab bar the reader is steering with,
     and the kit's header skeleton has no tab row, so swapping it in would drop
     the panel by the height of that row the moment the rule landed. What
     settles is the panel under the tabs. */
  const loading = useLoading(`${rule.id}:${active}`)
  const goTab = (t) => navigate(t === 'information' ? `${BASE}/${rule.id}` : `${BASE}/${rule.id}/${t}`, { replace: true })

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Segregation of Duties"
        eyebrow="Segregation-of-duties rule"
        title={rule.name}
        sub={rule.description}
        badges={
          <>
            <SeverityBadge level={sodSeverityBadge(rule.severity)}>{rule.severity}</SeverityBadge>
            <Tag tone={rule.type === 'Anti-affinity' ? 'acc' : undefined}>{rule.type}</Tag>
            {open > 0
              ? <Pill tone="bad" dot>{num(open)} open</Pill>
              : violations.length > 0
                ? <Pill tone="viol" dot>{num(violations.length)} in register</Pill>
                : <Pill tone="ok" dot>No breaches</Pill>}
          </>
        }
        meta={
          <>
            {/* The longest fact on the header, and the first to be cut short on
                a narrower canvas — carry the full pair on the element itself. */}
            <Fact icon="sod" label="Combination" value={<span title={ruleLabel(rule)}>{ruleLabel(rule)}</span>} />
            <Fact icon="building" label="Scope" value={meta.scope} />
            <Fact icon="history" label="Last scan" value={meta.lastScan} />
          </>
        }
        actions={
          <>
            <Button variant="danger" icon="trash" onClick={() => onDelete([rule.id], `Delete ${rule.name}?`, () => navigate(BASE))}>Delete</Button>
            {/* Editing lives on the rule, not on the register: the list offers
                View and Delete, and this is where the definition is changed. */}
            <Button icon="edit" onClick={() => navigate(`${BASE}/${rule.id}/edit`)}>Edit rule</Button>
            <Button variant="pri" icon="refresh" onClick={() => confirm({
              title: `Run ${rule.name} now?`,
              body: `Every identity in ${meta.scope} is re-evaluated against ${ruleLabel(rule)}. The register is updated with whatever the scan finds.`,
              confirmLabel: 'Run scan',
              tone: 'acc',
              onConfirm: () => toast('ok', 'Scan queued', `${rule.name} is being evaluated across ${meta.scope}.`),
            })}>Run scan</Button>
          </>
        }
        tabs={(
          <Tabs
            value={active}
            onChange={goTab}
            tabs={[
              { id: 'information', label: 'Rule information', icon: 'policy' },
              { id: 'exception', label: 'Exception', icon: 'users', count: exceptions.length },
            ]}
          />
        )}
      />

      <div className="detail-body">
        {active === 'information'
          ? <DefinitionTab rule={rule} meta={meta} violations={violations} loading={loading} />
          : <ExceptionTab rule={rule} loading={loading} />}
      </div>
    </>
  )
}

