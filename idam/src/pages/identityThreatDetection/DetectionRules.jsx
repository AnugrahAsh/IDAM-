import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import Switch from '../../components/primitives/Switch'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Banner from '../../components/primitives/Banner'
import KeyValue from '../../components/primitives/KeyValue'
import Icon from '../../components/primitives/Icon'
import Toggle from '../settings/Toggle'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { since } from '../../lib/clock'
import { PARAM_META, RESPONSES, durationText, paramValueText } from './itdrData'

export const SEV_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }
export const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1 }

const STATUS_FILTERS = [
  { id: 'all', label: 'All', icon: 'layers' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Disabled' },
]

/* What a matching rule does, as three glyphs in a fixed order — bell, ban,
   envelope — lit when the response is on. A reader scanning eleven rows is
   looking for the shape, so the order never changes and an off response keeps
   its place rather than collapsing the row. */
export function ResponseIcons({ actions }) {
  return (
    <span className="itdr-resp">
      {RESPONSES.map((r) => (
        <span
          key={r.id}
          className="itdr-resp-i"
          data-on={actions[r.id] ? 'true' : undefined}
          role="img"
          aria-label={actions[r.id] ? r.on : r.off}
          title={actions[r.id] ? r.on : r.off}
        >
          <Icon name={r.icon} size={14} />
        </span>
      ))}
    </span>
  )
}

export function ParamChips({ params }) {
  const keys = Object.keys(params)
  if (!keys.length) return <span className="t-faint">No thresholds</span>
  return (
    <span className="itdr-params">
      {keys.map((k) => (
        <Tag key={k}>{PARAM_META[k].short}<b>{paramValueText(k, params[k])}</b></Tag>
      ))}
    </span>
  )
}

/**
 * The detection rules.
 *
 * The engine defines what can be detected; this register is where an operator
 * decides which detectors run, how sensitive each one is, and what it does
 * when it matches. A row opens its configuration — the register is read far
 * more than it is edited, so the switch is the only control on the row itself.
 */
export default function DetectionRules({ rules, setRules }) {
  const { toast, setDrawer } = useApp()
  const [status, setStatus] = useState('all')

  const visible = useMemo(() => rules.filter((r) => (
    status === 'all' || (status === 'enabled' ? r.enabled : !r.enabled)
  )), [rules, status])

  const counts = {
    all: rules.length,
    enabled: rules.filter((r) => r.enabled).length,
    disabled: rules.filter((r) => !r.enabled).length,
  }

  const setEnabled = (list, enabled) => {
    const ids = new Set(list.map((r) => String(r.id)))
    setRules((rs) => rs.map((r) => (ids.has(String(r.id)) ? { ...r, enabled } : r)))
    toast(
      'ok',
      enabled ? 'Detection enabled' : 'Detection disabled',
      list.length === 1
        ? `${list[0].name} ${enabled ? 'evaluates sign-in events again from now.' : 'stops evaluating — it raises, blocks and sends nothing until it is switched back on.'}`
        : `${list.length} rules ${enabled ? 'evaluate sign-in events again from now.' : 'stop evaluating until they are switched back on.'}`,
    )
  }

  const configure = (rule) => {
    const ref = {
      current: { enabled: rule.enabled, params: { ...rule.params }, actions: { ...rule.actions } },
      errors: {},
    }

    const validate = () => {
      const errors = {}
      Object.entries(ref.current.params).forEach(([k, v]) => {
        const m = PARAM_META[k]
        const n = Number(v)
        if (String(v).trim() === '' || !Number.isInteger(n)) errors[k] = 'Enter a whole number.'
        else if (n < m.min || n > m.max) errors[k] = `Between ${num(m.min)} and ${num(m.max)} ${m.unit}.`
      })
      return errors
    }

    const save = () => {
      const errors = validate()
      if (Object.keys(errors).length) {
        ref.errors = errors
        render()
        return
      }
      const d = ref.current
      const params = Object.fromEntries(Object.entries(d.params).map(([k, v]) => [k, Number(v)]))
      setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, enabled: d.enabled, params, actions: { ...d.actions } } : r)))
      setDrawer(null)
      toast(
        'ok',
        'Rule saved',
        d.enabled
          ? `${rule.name} runs with the new configuration from the engine's next evaluation.`
          : `${rule.name} is saved switched off.`,
      )
    }

    const render = () => {
      const d = ref.current
      const keys = Object.keys(d.params)
      const silent = d.enabled && !Object.values(d.actions).some(Boolean)

      setDrawer({
        title: rule.name,
        sub: `${rule.code} · use case #${rule.id}`,
        children: (
          <div className="stack">
            <Toggle
              title="Rule enabled"
              body="Turns detection on or off. A disabled rule evaluates nothing and raises nothing."
              checked={d.enabled}
              badge={d.enabled ? 'Detecting' : 'Off'}
              badgeTone={d.enabled ? 'ok' : undefined}
              onChange={(v) => { ref.current = { ...d, enabled: v }; render() }}
            />

            <p className="itdr-lede">
              <span className="t-sm">{rule.summary}</span>
              <span className="t-xs t-mut">{rule.response}</span>
            </p>

            <section className="section">
              <div className="section-head">
                <span className="section-title"><Icon name="sliders" size={14} />Detection thresholds</span>
              </div>
              {keys.length ? (
                <div className="grid grid-2 itdr-thresholds">
                  {keys.map((k) => {
                    const m = PARAM_META[k]
                    const v = d.params[k]
                    const reading = k === 'window' && Number(v) > 0 ? ` (${durationText(v)})` : ''
                    return (
                      <Field key={k} label={m.label} required hint={`${m.hint}${reading}`} error={ref.errors[k]} htmlFor={`itdr-${k}`}>
                        <div className="itdr-affix">
                          <TextInput
                            id={`itdr-${k}`}
                            type="number"
                            inputMode="numeric"
                            min={m.min}
                            max={m.max}
                            value={v}
                            onChange={(e) => {
                              ref.current = { ...ref.current, params: { ...ref.current.params, [k]: e.target.value } }
                              ref.errors = { ...ref.errors, [k]: undefined }
                              render()
                            }}
                          />
                          <span className="itdr-affix-u">{m.unit}</span>
                        </div>
                      </Field>
                    )
                  })}
                </div>
              ) : (
                <div className="t-sm t-mut">
                  This rule fires on a single matching event, so it has no thresholds — only whether it runs and what it does.
                </div>
              )}
            </section>

            <section className="section">
              <div className="section-head">
                <span className="section-title"><Icon name="bolt" size={14} />Response actions</span>
              </div>
              <div className="itdr-opts">
                {RESPONSES.map((r) => (
                  <Toggle
                    key={r.id}
                    title={r.label}
                    body={r.body}
                    checked={d.actions[r.id]}
                    onChange={(v) => { ref.current = { ...ref.current, actions: { ...ref.current.actions, [r.id]: v } }; render() }}
                  />
                ))}
              </div>
              {silent && (
                <Banner tone="warn">
                  With every response switched off the rule still detects, but nothing is raised, blocked or sent — nobody hears about it.
                </Banner>
              )}
            </section>

            <KeyValue
              dense
              cols={2}
              rows={[
                { k: 'Severity', v: <SeverityBadge level={rule.severity}>{SEV_LABEL[rule.severity]}</SeverityBadge>, icon: 'warn' },
                { k: 'Category', v: rule.category, icon: 'layers' },
                { k: 'Last triggered', v: rule.lastTriggered ? `${rule.lastTriggered} · ${since(rule.lastTriggered)}` : 'Never', icon: 'clock' },
                { k: 'Matches (7 days)', v: num(rule.hits7d), icon: 'activity' },
              ]}
            />
          </div>
        ),
        footer: (
          <>
            <Button onClick={() => setDrawer(null)}>Cancel</Button>
            <Button variant="pri" icon="save" onClick={save}>Save changes</Button>
          </>
        ),
      })
    }

    render()
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Rule', locked: true, cls: 'td-main', width: 330,
      value: (r) => `${r.name} ${r.code} ${r.summary}`,
      render: (r) => (
        <span className="cell-id">
          <Icon name="shield" size={13} style={{ color: r.enabled ? 'var(--accent)' : 'var(--faint)' }} />
          <span className="cell-stack">
            <span className="trunc" title={r.summary}>{r.name}</span>
            <span className="cell-sub mono t-xs">{r.code}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'params', label: 'Detection parameters', cls: 'td-flex',
      value: (r) => Object.entries(r.params).map(([k, v]) => `${PARAM_META[k].short} ${v}`).join(' '),
      render: (r) => <ParamChips params={r.params} />,
    },
    {
      key: 'severity', label: 'Severity', width: 120,
      value: (r) => SEV_RANK[r.severity],
      render: (r) => <SeverityBadge level={r.severity}>{SEV_LABEL[r.severity]}</SeverityBadge>,
    },
    {
      key: 'response', label: 'Response', width: 112,
      value: (r) => RESPONSES.filter((x) => r.actions[x.id]).length,
      render: (r) => <ResponseIcons actions={r.actions} />,
    },
    { key: 'hits7d', label: 'Matches (7d)', align: 'right', width: 124, render: (r) => num(r.hits7d) },
    {
      key: 'lastTriggered', label: 'Last triggered', width: 132,
      value: (r) => r.lastTriggered || '',
      render: (r) => (r.lastTriggered
        ? <span className="t-mut" title={r.lastTriggered}>{since(r.lastTriggered)}</span>
        : <span className="t-faint">Never</span>),
    },
    {
      key: 'enabled', label: 'Status', width: 92,
      value: (r) => (r.enabled ? 1 : 0),
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch checked={r.enabled} label={`${r.enabled ? 'Disable' : 'Enable'} ${r.name}`} onChange={(v) => setEnabled([r], v)} />
        </span>
      ),
    },
  ]

  return (
    <DataWorkbench
      id="itdr-rules"
      rows={visible}
      columns={columns}
      selectable
      searchPlaceholder="Search rules by name or code…"
      onRowClick={configure}
      filters={(
        <>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip"
              data-on={status === f.id ? 'true' : undefined}
              aria-pressed={status === f.id}
              onClick={() => setStatus(f.id)}
            >
              {f.icon && <Icon name={f.icon} size={12} />}
              {f.label}
              <b className="chip-n num">{counts[f.id]}</b>
            </button>
          ))}
        </>
      )}
      bulkActions={(ids, clear) => {
        const list = rules.filter((r) => ids.map(String).includes(String(r.id)))
        return (
          <>
            <Button size="sm" icon="play" onClick={() => { setEnabled(list, true); clear() }}>Enable</Button>
            <Button size="sm" icon="ban" onClick={() => { setEnabled(list, false); clear() }}>Disable</Button>
          </>
        )
      }}
      rowActions={(r) => [
        { id: 'cfg', label: 'Configure', icon: 'sliders', onSelect: () => configure(r) },
        { divider: true },
        r.enabled
          ? { id: 'off', label: 'Disable rule', icon: 'ban', onSelect: () => setEnabled([r], false) }
          : { id: 'on', label: 'Enable rule', icon: 'play', onSelect: () => setEnabled([r], true) },
      ]}
      emptyTitle="No rules match"
      emptyBody="No detection rule is in this state. Choose All to see every rule the engine provides."
      emptyIcon="shield"
      footNote="Rules are predefined by the detection engine — click a rule to tune its thresholds and responses"
    />
  )
}
