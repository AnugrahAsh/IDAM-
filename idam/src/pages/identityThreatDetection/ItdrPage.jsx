import './ItdrPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import Tabs from '../../components/primitives/Tabs'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { NOW_MS, stampText } from '../../lib/clock'
import { ME } from '../../data/seed'
import { BASE, BLOCKED_IPS, DETECTION_RULES, ITDR_ALERTS, isActiveBlock } from './itdrData'
import DetectionRules from './DetectionRules'
import AlertRegister from './AlertRegister'
import BlockedIps from './BlockedIps'

const TAB_IDS = ['rules', 'alerts', 'blocked']

/**
 * Identity Threat Detection & Response.
 *
 * Three registers answer three questions: which detectors watch the sign-in
 * stream and what each does when it matches, what they have raised, and which
 * source addresses they — or an operator — have shut out. The page owns all
 * three lists so the tiles above the tabs always agree with the rows below.
 */
export default function ItdrPage({ segments = [] }) {
  const { navigate, toast } = useApp()
  const [rules, setRules] = useState(() => DETECTION_RULES.map((r) => ({ ...r, params: { ...r.params }, actions: { ...r.actions } })))
  const [alerts, setAlerts] = useState(() => ITDR_ALERTS.map((a) => ({ ...a, taken: [...a.taken] })))
  const [blocks, setBlocks] = useState(() => BLOCKED_IPS.map((b) => ({ ...b })))

  // Routed rather than local, so a link to the alert queue lands on it.
  const tab = TAB_IDS.includes(segments[0]) ? segments[0] : 'rules'

  const enabled = rules.filter((r) => r.enabled).length
  const openAlerts = alerts.filter((a) => a.status === 'Open').length
  const highCritical = alerts.filter((a) => a.severity === 'high' || a.severity === 'critical')
  const openHighCritical = highCritical.filter((a) => a.status === 'Open').length
  const activeBlocks = blocks.filter(isActiveBlock).length
  const autoBlocking = rules.filter((r) => r.enabled && r.actions.block).length

  const blockIp = ({ ip, location, reason, ruleId, minutes, source }) => {
    const expiresAt = minutes === 'permanent' ? null : stampText(new Date(NOW_MS + Number(minutes) * 60000))
    setBlocks((bs) => [{
      id: bs.reduce((m, b) => Math.max(m, b.id), 0) + 1,
      ip,
      location: location || '',
      reason,
      ruleId,
      source,
      by: source === 'Manual' ? `${ME.firstName} ${ME.lastName}` : reason,
      blockedAt: stampText(),
      expiresAt,
      refused: 0,
    }, ...bs])
    toast('ok', `${ip} blocked`, expiresAt
      ? `Refused before authentication until ${expiresAt}.`
      : 'Refused before authentication until someone unblocks it.')
  }

  return (
    <>
      <PageBar
        title="Identity Threat Detection & Response"
        sub="Detection rules that watch every sign-in, the alerts they raise, and the source addresses they have blocked."
        crumbs={[{ label: 'Logging' }, { label: 'Identity Threat Detection' }]}
        actions={(
          <Button
            icon="refresh"
            onClick={() => toast('ok', 'Detection state refreshed', `${enabled} ${enabled === 1 ? 'rule' : 'rules'} re-evaluated against the last hour of sign-in events.`)}
          >
            Refresh
          </Button>
        )}
      />

      <StatCards
        label="Threat detection summary"
        items={[
          {
            key: 'rules', icon: 'sliders', label: 'Detection rules', value: `${enabled} / ${rules.length}`,
            chip: enabled === rules.length ? 'all enabled' : `${rules.length - enabled} disabled`,
            chipTone: enabled === rules.length ? 'ok' : 'warn', sub: 'watching sign-in events',
          },
          {
            key: 'open', icon: 'bell', label: 'Open alerts', value: openAlerts,
            chip: `${num(alerts.length)} raised`, chipTone: openAlerts ? 'bad' : 'ok', sub: 'waiting on a responder',
          },
          {
            key: 'high', icon: 'warn', label: 'High / critical', value: highCritical.length,
            chip: `${num(openHighCritical)} open`, chipTone: openHighCritical ? 'bad' : undefined, sub: 'across all statuses',
          },
          {
            key: 'blocked', icon: 'ban', label: 'Blocked IPs', value: activeBlocks,
            chip: `${autoBlocking} rules auto-block`, sub: 'refused before sign-in',
          },
        ]}
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={(id) => navigate(`${BASE}/${id}`)}
          tabs={[
            { id: 'rules', label: 'Detection Rules', icon: 'sliders', count: rules.length },
            { id: 'alerts', label: 'Alerts', icon: 'bell', count: openAlerts },
            { id: 'blocked', label: 'Blocked IPs', icon: 'ban', count: activeBlocks },
          ]}
        />
        {tab === 'rules' && <DetectionRules rules={rules} setRules={setRules} />}
        {tab === 'alerts' && (
          <AlertRegister alerts={alerts} setAlerts={setAlerts} rules={rules} blocks={blocks} onBlockIp={blockIp} />
        )}
        {tab === 'blocked' && <BlockedIps blocks={blocks} setBlocks={setBlocks} onBlockIp={blockIp} />}
      </div>
    </>
  )
}
