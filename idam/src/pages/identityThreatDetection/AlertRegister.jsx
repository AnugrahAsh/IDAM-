import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Banner from '../../components/primitives/Banner'
import KeyValue from '../../components/primitives/KeyValue'
import Icon from '../../components/primitives/Icon'
import { useApp } from '../../store/AppContext'
import { serialColumn } from '../../lib/format'
import { since } from '../../lib/clock'
import { ME } from '../../data/seed'
import { ALERT_STATUSES, RESPONSES, alertTone, isActiveBlock, ruleById } from './itdrData'
import { SEV_LABEL, SEV_RANK } from './DetectionRules'

const ME_NAME = `${ME.firstName} ${ME.lastName}`
const SEV_BANNER = { critical: 'bad', high: 'bad', medium: 'warn', low: 'info' }

/**
 * The alert register.
 *
 * Every alert a rule raised, newest first, with what the engine already did
 * about it. The status is the responder's: Open until someone picks it up,
 * Acknowledged while it is being looked at, then Resolved or False positive —
 * the second kept distinct because a rule that keeps producing them needs
 * tuning, not more responders.
 */
export default function AlertRegister({ alerts, setAlerts, rules, blocks, onBlockIp, loading = false }) {
  const { toast, setDrawer } = useApp()
  const [status, setStatus] = useState('Open')

  const visible = useMemo(
    () => (status === 'all' ? alerts : alerts.filter((a) => a.status === status)),
    [alerts, status],
  )
  const countOf = (s) => (s === 'all' ? alerts.length : alerts.filter((a) => a.status === s).length)

  const blocked = (ip) => blocks.some((b) => b.ip === ip && isActiveBlock(b))

  const move = (list, next, title, body) => {
    const ids = new Set(list.map((a) => a.id))
    setAlerts((as) => as.map((a) => (ids.has(a.id) ? { ...a, status: next, assignee: a.assignee || ME_NAME } : a)))
    setDrawer(null)
    toast('ok', title, body)
  }

  const acknowledge = (list) => move(list, 'Acknowledged', list.length === 1 ? `${list[0].id} acknowledged` : `${list.length} alerts acknowledged`, `Assigned to ${ME_NAME} while the investigation runs.`)
  const resolve = (list) => move(list, 'Resolved', list.length === 1 ? `${list[0].id} resolved` : `${list.length} alerts resolved`, 'Closed and kept in the register as evidence.')
  const dismiss = (list) => move(list, 'False positive', list.length === 1 ? `${list[0].id} marked a false positive` : `${list.length} alerts marked false positives`, 'Counted against the rule, so a detector that keeps producing them shows up for tuning.')
  const reopen = (a) => move([a], 'Open', `${a.id} reopened`, 'Back in the open queue.')

  const blockSource = (a) => {
    const rule = ruleById(rules, a.ruleId)
    onBlockIp({ ip: a.ip, location: a.location, reason: rule ? rule.name : 'Blocked from an alert', ruleId: rule ? rule.id : null, minutes: 1440, source: 'Manual' })
    setAlerts((as) => as.map((x) => (x.id === a.id && !x.taken.includes('block') ? { ...x, taken: [...x.taken, 'block'] } : x)))
    setDrawer(null)
  }

  const open = (a) => {
    const rule = ruleById(rules, a.ruleId)
    const isBlocked = blocked(a.ip)
    const timeline = [
      { icon: 'target', t: `${rule ? rule.name : 'Rule'} matched`, s: a.raised },
      ...a.taken.filter((t) => t !== 'alert').map((t) => {
        const r = RESPONSES.find((x) => x.id === t)
        return { icon: r.icon, t: r.taken, s: a.raised }
      }),
      a.status !== 'Open' && a.assignee ? { icon: 'user', t: `Picked up by ${a.assignee}`, s: 'Acknowledged' } : null,
      a.status === 'Resolved' || a.status === 'False positive' ? { icon: 'checkC', t: a.status === 'Resolved' ? 'Resolved' : 'Marked a false positive', s: a.resolution || '' } : null,
    ].filter(Boolean)

    setDrawer({
      title: rule ? rule.name : a.id,
      sub: `${a.id} · raised ${a.raised} · ${since(a.raised)}`,
      children: (
        <div className="stack">
          <Banner tone={SEV_BANNER[a.severity]}>{a.evidence}</Banner>

          <KeyValue
            rows={[
              { k: 'Status', v: <Pill tone={alertTone(a.status)} dot>{a.status}</Pill>, icon: 'flag' },
              { k: 'Severity', v: <SeverityBadge level={a.severity}>{SEV_LABEL[a.severity]}</SeverityBadge>, icon: 'warn' },
              { k: 'Identity', v: a.user || 'Several accounts', icon: 'user' },
              { k: 'Source IP', v: <span className="mono">{a.ip}{isBlocked ? ' · blocked' : ''}</span>, icon: 'globe' },
              { k: 'Location', v: a.location, icon: 'mapPin' },
              { k: 'Rule', v: rule ? <span>{rule.code}</span> : '—', icon: 'shield' },
              { k: 'Response taken', v: a.taken.map((t) => RESPONSES.find((x) => x.id === t).taken).join(' · '), icon: 'bolt' },
              { k: 'Assignee', v: a.assignee || 'Unassigned', icon: 'user' },
            ]}
          />

          <section className="section">
            <div className="section-head">
              <span className="section-title"><Icon name="history" size={14} />Timeline</span>
            </div>
            <ol className="itdr-tl">
              {timeline.map((e, i) => (
                <li key={i} className="itdr-tl-it">
                  <span className="itdr-tl-ic"><Icon name={e.icon} size={12} /></span>
                  <span className="itdr-tl-m">
                    <span className="t-sm">{e.t}</span>
                    {e.s && <span className="t-xs t-mut">{e.s}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ),
      footer: (
        <>
          {(a.status === 'Resolved' || a.status === 'False positive') ? (
            <Button icon="refresh" onClick={() => reopen(a)}>Reopen</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => dismiss([a])}>False positive</Button>
              {!isBlocked && <Button icon="ban" onClick={() => blockSource(a)}>Block source IP</Button>}
              {a.status === 'Open' && <Button icon="user" onClick={() => acknowledge([a])}>Acknowledge</Button>}
              <Button variant="pri" icon="checkC" onClick={() => resolve([a])}>Resolve</Button>
            </>
          )}
        </>
      ),
    })
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'rule', label: 'Alert', locked: true, cls: 'td-main', width: 300,
      value: (a) => `${(ruleById(rules, a.ruleId) || {}).name} ${a.id}`,
      render: (a) => {
        const rule = ruleById(rules, a.ruleId)
        return (
          <span className="cell-stack">
            <span className="trunc">{rule ? rule.name : a.id}</span>
            <span className="cell-sub mono t-xs">{a.id}</span>
          </span>
        )
      },
    },
    {
      key: 'user', label: 'Identity', width: 170,
      value: (a) => a.user || '',
      render: (a) => (a.user ? <span className="mono t-xs">{a.user}</span> : <span className="t-faint">Several accounts</span>),
    },
    {
      key: 'ip', label: 'Source', width: 190,
      value: (a) => `${a.ip} ${a.location}`,
      render: (a) => (
        <span className="cell-stack">
          <span className="mono t-xs">{a.ip}</span>
          <span className="cell-sub">{a.location}</span>
        </span>
      ),
    },
    {
      key: 'evidence', label: 'Evidence', cls: 'td-flex', optional: true,
      render: (a) => <span className="trunc" title={a.evidence}>{a.evidence}</span>,
    },
    {
      key: 'severity', label: 'Severity', width: 120,
      value: (a) => SEV_RANK[a.severity],
      render: (a) => <SeverityBadge level={a.severity}>{SEV_LABEL[a.severity]}</SeverityBadge>,
    },
    {
      key: 'taken', label: 'Response', width: 190,
      value: (a) => a.taken.join(' '),
      render: (a) => {
        const extra = a.taken.filter((t) => t !== 'alert')
        return extra.length
          ? <span className="itdr-params">{extra.map((t) => <Tag key={t} tone={t === 'block' ? 'bad' : undefined}>{t === 'block' ? 'IP blocked' : 'Emailed'}</Tag>)}</span>
          : <span className="t-faint">Alert only</span>
      },
    },
    {
      key: 'raised', label: 'Raised', width: 110,
      render: (a) => <span className="t-mut" title={a.raised}>{since(a.raised)}</span>,
    },
    {
      key: 'status', label: 'Status', width: 140,
      render: (a) => <Pill tone={alertTone(a.status)} dot>{a.status}</Pill>,
    },
  ]

  return (
    <DataWorkbench
      id="itdr-alerts"
      loading={loading}
      rows={visible}
      columns={columns}
      selectable
      searchPlaceholder="Search by identity, IP address, rule or alert id…"
      onRowClick={open}
      filters={(
        <>
          {[{ id: 'all', label: 'All', icon: 'layers' }, ...ALERT_STATUSES.map((s) => ({ id: s, label: s }))].map((f) => (
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
              <b className="chip-n num">{countOf(f.id)}</b>
            </button>
          ))}
        </>
      )}
      bulkActions={(ids, clear) => {
        const list = alerts.filter((a) => ids.includes(a.id))
        const live = list.filter((a) => a.status === 'Open' || a.status === 'Acknowledged')
        return (
          <>
            <Button size="sm" icon="user" disabled={!live.length} onClick={() => { acknowledge(live.filter((a) => a.status === 'Open')); clear() }}>Acknowledge</Button>
            <Button size="sm" icon="checkC" disabled={!live.length} onClick={() => { resolve(live); clear() }}>Resolve</Button>
          </>
        )
      }}
      rowActions={(a) => (a.status === 'Resolved' || a.status === 'False positive'
        ? [
          { id: 'view', label: 'View', icon: 'eye', onSelect: () => open(a) },
          { id: 'reopen', label: 'Reopen', icon: 'refresh', onSelect: () => reopen(a) },
        ]
        : [
          { id: 'view', label: 'View', icon: 'eye', onSelect: () => open(a) },
          a.status === 'Open' ? { id: 'ack', label: 'Acknowledge', icon: 'user', onSelect: () => acknowledge([a]) } : null,
          { id: 'resolve', label: 'Resolve', icon: 'checkC', onSelect: () => resolve([a]) },
          blocked(a.ip) ? null : { id: 'block', label: 'Block source IP', icon: 'ban', onSelect: () => blockSource(a) },
          { divider: true },
          { id: 'fp', label: 'Mark false positive', icon: 'x', onSelect: () => dismiss([a]) },
        ].filter(Boolean))}
      emptyTitle={status === 'Open' ? 'No open alerts' : 'No alerts'}
      emptyBody={status === 'Open' ? 'Every alert the rules raised has been picked up. New ones land here first.' : 'No alert is in this state.'}
      emptyIcon="bell"
      footNote="Alerts are raised by the detection rules; a rule's automatic response has already run when its alert lands here"
    />
  )
}
