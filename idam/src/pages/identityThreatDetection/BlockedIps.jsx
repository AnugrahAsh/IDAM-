import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import KeyValue from '../../components/primitives/KeyValue'
import Icon from '../../components/primitives/Icon'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { NOW_MS, since, stampText } from '../../lib/clock'
import { BLOCK_DURATIONS, blockStatus, isActiveBlock, isIpOrCidr } from './itdrData'

const STATUS_TONE = { Active: 'bad', Expired: 'mut', Released: 'mut' }
const FILTERS = ['all', 'Active', 'Expired', 'Released']

/* The expiry a manual block lands on, measured from the platform clock. */
const expiryFor = (minutes) => (minutes === 'permanent' ? null : stampText(new Date(NOW_MS + Number(minutes) * 60000)))

/**
 * Blocked source addresses.
 *
 * A blocked address is refused before it reaches authentication at all, which
 * is why the register counts refused requests rather than failed sign-ins.
 * Automatic blocks come from a rule's automatic response and lift after 24
 * hours on their own; a manual block lasts as long as the operator chose.
 */
export default function BlockedIps({ blocks, setBlocks, onBlockIp }) {
  const { toast, setDrawer, confirm } = useApp()
  const [status, setStatus] = useState('all')

  const rows = useMemo(() => blocks.map((b) => ({ ...b, status: blockStatus(b) })), [blocks])
  const visible = status === 'all' ? rows : rows.filter((b) => b.status === status)
  const countOf = (s) => (s === 'all' ? rows.length : rows.filter((b) => b.status === s).length)

  const release = (list) => confirm({
    title: list.length === 1 ? `Unblock ${list[0].ip}?` : `Unblock ${list.length} addresses?`,
    body: 'Requests from the address reach authentication again straight away. If a rule still matches it, its automatic response blocks it again.',
    confirmLabel: 'Unblock',
    onConfirm: () => {
      const ids = new Set(list.map((b) => b.id))
      setBlocks((bs) => bs.map((b) => (ids.has(b.id) ? { ...b, releasedAt: stampText() } : b)))
      toast('ok', list.length === 1 ? `${list[0].ip} unblocked` : `${list.length} addresses unblocked`, 'Released now; the register keeps the record.')
    },
  })

  const extend = (b) => {
    const base = Math.max(NOW_MS, Date.parse(`${b.expiresAt.replace(' ', 'T')}Z`))
    setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, expiresAt: stampText(new Date(base + 1440 * 60000)) } : x)))
    toast('ok', `${b.ip} extended`, 'The block runs for another 24 hours.')
  }

  const makePermanent = (b) => {
    setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, expiresAt: null } : x)))
    toast('ok', `${b.ip} blocked permanently`, 'It stays blocked until someone unblocks it.')
  }

  const openBlock = () => {
    const ref = { current: { ip: '', reason: '', minutes: '1440' }, errors: {} }

    const submit = () => {
      const d = ref.current
      const errors = {}
      if (!isIpOrCidr(d.ip)) errors.ip = 'Enter an IPv4 address such as 203.0.113.7, or a range such as 203.0.113.0/24.'
      else if (blocks.some((b) => b.ip === d.ip.trim() && isActiveBlock(b))) errors.ip = 'This address is already blocked.'
      if (!d.reason.trim()) errors.reason = 'Say why — the next operator reads this before unblocking.'
      if (Object.keys(errors).length) { ref.errors = errors; render(); return }
      onBlockIp({ ip: d.ip.trim(), reason: d.reason.trim(), ruleId: null, minutes: d.minutes, source: 'Manual' })
      setDrawer(null)
    }

    const render = () => {
      const d = ref.current
      setDrawer({
        title: 'Block an IP address',
        sub: 'Refuse every request from an address or range before it reaches authentication.',
        children: (
          <div className="stack">
            <div className="grid grid-2">
              <Field label="IP address or range" required span={2} error={ref.errors.ip} hint="A single IPv4 address, or a CIDR range to block a whole network." htmlFor="blk-ip">
                <TextInput
                  id="blk-ip"
                  className="mono"
                  placeholder="203.0.113.7"
                  value={d.ip}
                  onChange={(e) => { ref.current = { ...ref.current, ip: e.target.value }; ref.errors = { ...ref.errors, ip: undefined }; render() }}
                />
              </Field>
              <Field label="Reason" required span={2} error={ref.errors.reason} htmlFor="blk-reason">
                <TextInput
                  id="blk-reason"
                  placeholder="Repeat source of failed sign-ins"
                  value={d.reason}
                  onChange={(e) => { ref.current = { ...ref.current, reason: e.target.value }; ref.errors = { ...ref.errors, reason: undefined }; render() }}
                />
              </Field>
              <Field label="Duration" required htmlFor="blk-dur">
                <Select
                  id="blk-dur"
                  options={BLOCK_DURATIONS}
                  value={d.minutes}
                  onChange={(e) => { ref.current = { ...ref.current, minutes: e.target.value }; render() }}
                />
              </Field>
            </div>
            <KeyValue
              dense
              cols={2}
              rows={[
                { k: 'Takes effect', v: 'Immediately', icon: 'bolt' },
                { k: 'Expires', v: expiryFor(d.minutes) || 'Never — until unblocked', icon: 'clock' },
              ]}
            />
            {d.minutes === 'permanent' && (
              <Banner tone="warn">A permanent block never lifts on its own. Prefer a timed block for an address that may be reassigned.</Banner>
            )}
          </div>
        ),
        footer: (
          <>
            <Button onClick={() => setDrawer(null)}>Cancel</Button>
            <Button variant="pri" icon="ban" onClick={submit}>Block address</Button>
          </>
        ),
      })
    }

    render()
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'ip', label: 'Address', locked: true, width: 210,
      value: (b) => `${b.ip} ${b.location || ''}`,
      render: (b) => (
        <span className="cell-id">
          <Icon name="ban" size={13} style={{ color: b.status === 'Active' ? 'var(--bad)' : 'var(--faint)' }} />
          <span className="cell-stack">
            <span className="mono t-xs" style={{ color: 'var(--ink)', fontWeight: 600 }}>{b.ip}</span>
            <span className="cell-sub">{b.location || 'Location unknown'}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'reason', label: 'Reason', cls: 'td-flex',
      render: (b) => <span className="trunc" title={b.reason}>{b.reason}</span>,
    },
    {
      key: 'source', label: 'Blocked by', width: 200,
      value: (b) => `${b.source} ${b.by}`,
      render: (b) => (
        <span className="cell-stack">
          <Tag tone={b.source === 'Automatic' ? 'acc' : undefined}>{b.source}</Tag>
          <span className="cell-sub trunc">{b.by}</span>
        </span>
      ),
    },
    { key: 'blockedAt', label: 'Blocked', width: 110, render: (b) => <span className="t-mut" title={b.blockedAt}>{since(b.blockedAt)}</span> },
    {
      key: 'expiresAt', label: 'Expires', width: 160, cls: 'td-mono',
      value: (b) => b.expiresAt || '9999',
      render: (b) => {
        if (b.releasedAt) return <span className="t-faint">Released {b.releasedAt}</span>
        return b.expiresAt ? b.expiresAt : <Pill tone="warn">Permanent</Pill>
      },
    },
    { key: 'refused', label: 'Refused requests', align: 'right', width: 150, render: (b) => num(b.refused) },
    { key: 'status', label: 'Status', width: 110, render: (b) => <Pill tone={STATUS_TONE[b.status]} dot>{b.status}</Pill> },
  ]

  return (
    <DataWorkbench
      id="itdr-blocked"
      rows={visible}
      columns={columns}
      selectable
      searchPlaceholder="Search by address, location or reason…"
      toolbar={<Button size="sm" variant="pri" icon="plus" onClick={openBlock}>Block IP</Button>}
      filters={(
        <>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              data-on={status === f ? 'true' : undefined}
              aria-pressed={status === f}
              onClick={() => setStatus(f)}
            >
              {f === 'all' && <Icon name="layers" size={12} />}
              {f === 'all' ? 'All' : f}
              <b className="chip-n num">{countOf(f)}</b>
            </button>
          ))}
        </>
      )}
      bulkActions={(ids, clear) => {
        const list = rows.filter((b) => ids.map(String).includes(String(b.id)) && b.status === 'Active')
        return (
          <Button size="sm" icon="unlock" disabled={!list.length} onClick={() => { release(list); clear() }}>Unblock</Button>
        )
      }}
      rowActions={(b) => (b.status === 'Active'
        ? [
          b.expiresAt ? { id: 'ext', label: 'Extend 24 hours', icon: 'clock', onSelect: () => extend(b) } : null,
          b.expiresAt ? { id: 'perm', label: 'Make permanent', icon: 'lock', onSelect: () => makePermanent(b) } : null,
          { divider: true },
          { id: 'rel', label: 'Unblock', icon: 'unlock', danger: true, onSelect: () => release([b]) },
        ].filter(Boolean)
        : [{ id: 'again', label: 'Block again', icon: 'ban', onSelect: () => onBlockIp({ ip: b.ip, location: b.location, reason: b.reason, ruleId: b.ruleId, minutes: '1440', source: 'Manual' }) }])}
      emptyTitle="No blocked addresses"
      emptyBody="Nothing is blocked in this state. Rules with an automatic response add addresses here as they match."
      emptyIcon="ban"
      footNote="Automatic blocks lift after 24 hours; manual blocks last as long as the operator chose"
    />
  )
}
