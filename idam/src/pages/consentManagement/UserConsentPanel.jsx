import './UserConsentPanel.css'
import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Menu from '../../components/primitives/Menu'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import {
  CONSENT_FILTERS, consentHistoryFor, consentSummary, consentsFor, matchesConsentFilter,
} from './userConsentData'

/**
 * One identity's consents, as a profile shows them.
 *
 * The same panel serves both sides: `self` is the person's own profile, where a
 * consent can be given or withdrawn, and the administrator's view of someone
 * else's record, where it can only be read and asked for again. Consent given
 * on someone's behalf is not consent, which is why the actions differ.
 */
export default function UserConsentPanel({ username, self = false }) {
  const { toast, setDrawer, confirm } = useApp()
  const [overrides, setOverrides] = useState({})
  const [filter, setFilter] = useState('all')
  const [menu, setMenu] = useState(null)

  const rows = useMemo(() => consentsFor(username).map((r) => (overrides[r.code]
    ? { ...r, ...overrides[r.code] }
    : r)), [username, overrides])

  const shown = rows.filter((r) => matchesConsentFilter(r, filter))
  const sum = consentSummary(rows)

  const answer = (row, status) => {
    setOverrides((o) => ({
      ...o,
      [row.code]: {
        status,
        tone: status === 'Accepted' ? 'ok' : 'mut',
        answeredVersion: row.version,
        answeredOn: new Date().toISOString().slice(0, 10),
        lastAction: status,
        reconsent: false,
        expiringSoon: false,
      },
    }))
    toast(
      status === 'Accepted' ? 'ok' : 'warn',
      status === 'Accepted' ? 'Consent given' : 'Consent withdrawn',
      status === 'Accepted'
        ? `${row.name} ${row.version} accepted. The record is kept as evidence.`
        : `${row.name} withdrawn. Processing already carried out on the previous basis is unaffected.`,
    )
  }

  const withdraw = (row) => confirm({
    title: `Withdraw consent for ${row.name}?`,
    body: row.mandatory
      ? 'This notice is mandatory. Withdrawing it may suspend the services that depend on it until it is given again.'
      : 'The consent is withdrawn from now on. Processing already carried out on the previous basis is unaffected.',
    confirmLabel: 'Withdraw consent',
    onConfirm: () => answer(row, 'Withdrawn'),
  })

  const openNotice = (row) => setDrawer({
    title: row.name,
    sub: `${row.version} · owned by ${row.owner}`,
    size: 'md',
    children: (
      <div className="stack">
        <KeyValue
          rows={[
            { k: 'Status', node: <Pill tone={row.tone} dot>{row.status}</Pill>, icon: 'consent' },
            { k: 'Answered', v: row.answeredOn, icon: 'calendar' },
            { k: 'Version answered', v: row.answeredVersion || '—', icon: 'file' },
            { k: 'Current version', v: row.version, icon: 'file' },
            { k: 'Valid until', v: row.expiresOn, icon: 'clock' },
            { k: 'Recorded from', v: row.ip ? `${row.ip} · ${row.browser}` : '—', icon: 'globe' },
          ]}
        />
        <div className="cns-notice">{row.body}</div>
        <div className="cns-hist">
          <div className="section-title">History</div>
          {consentHistoryFor(username, row.name).map((h) => (
            <div className="cns-hist-it" key={h.id}>
              <span className="cns-hist-w">{h.timestamp}</span>
              <span className="cns-hist-a">{h.actionType}</span>
              <span className="cns-hist-v">{h.consentVersion}</span>
              <span className="cns-hist-ip mono trunc">{h.ip}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  })

  const actionsFor = (row) => [
    { id: 'view', label: 'View notice', icon: 'eye', onSelect: () => openNotice(row) },
    ...(self && row.status !== 'Accepted'
      ? [{ id: 'accept', label: row.reconsent ? `Accept ${row.version}` : 'Give consent', icon: 'check', onSelect: () => answer(row, 'Accepted') }]
      : []),
    ...(self && row.reconsent
      ? [{ id: 'reaccept', label: `Accept ${row.version}`, icon: 'refresh', onSelect: () => answer(row, 'Accepted') }]
      : []),
    ...(self && row.status === 'Accepted'
      ? [{ id: 'withdraw', label: 'Withdraw consent', icon: 'ban', danger: true, onSelect: () => withdraw(row) }]
      : []),
    ...(!self
      ? [{ id: 'ask', label: 'Request re-consent', icon: 'mail', onSelect: () => toast('ok', 'Re-consent requested', `${username} has been asked to answer ${row.name} ${row.version}.`) }]
      : []),
    { divider: true },
    {
      id: 'evidence',
      label: 'Download consent record',
      icon: 'download',
      onSelect: () => toast('ok', 'Consent record written', `${row.name} · ${row.status} · evidence for ${username}.`),
    },
  ]

  return (
    <div className="stack cns-panel">
      <StatCards
        label="Consent summary"
        items={[
          { key: 'total', icon: 'file', label: 'Total', value: sum.total },
          { key: 'active', icon: 'checkC', label: 'Active', value: sum.active },
          { key: 'pending', icon: 'clock', label: 'Pending', value: sum.pending },
          { key: 'withdrawn', icon: 'ban', label: 'Withdrawn', value: sum.withdrawn },
          { key: 'expiring', icon: 'calendar', label: 'Expiring ≤30d', value: sum.expiring },
          { key: 'reconsent', icon: 'refresh', label: 'Re-consent due', value: sum.reconsent },
        ]}
      />

      {sum.reconsent > 0 && (
        <Banner tone="warn">
          {self
            ? <>A newer version of {sum.reconsent === 1 ? 'a notice you accepted' : `${sum.reconsent} notices you accepted`} has been published. Accepting the new version keeps your record current.</>
            : <>{username} accepted an older version of {sum.reconsent === 1 ? 'a notice' : `${sum.reconsent} notices`}. Re-consent can be requested from the row actions.</>}
        </Banner>
      )}

      <div className="cns-bar">
        <div className="seg" role="group" aria-label="Filter consents by status">
          {CONSENT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              data-on={filter === f.id || undefined}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="cns-n num">
                {f.id === 'all' ? rows.length : rows.filter((r) => matchesConsentFilter(r, f.id)).length}
              </span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <span className="t-xs t-mut">Under the Digital Personal Data Protection Act</span>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon="consent"
          size="sm"
          title="Nothing under this filter"
          body="No notice on this record currently has that status."
          actions={<Button onClick={() => setFilter('all')}>Show every notice</Button>}
        />
      ) : (
        <div className="cns-list">
          {shown.map((row) => (
            <article className="cns-card" key={row.code}>
              <div className="cns-card-m">
                <div className="cns-card-top">
                  <button type="button" className="cns-card-name" onClick={() => openNotice(row)}>{row.name}</button>
                  <Pill tone={row.tone} dot>{row.status}</Pill>
                  <Tag tone={row.mandatory ? 'warn' : 'acc'}>{row.mandatory ? 'Mandatory' : 'Optional'}</Tag>
                  <span className="cns-ver mono">{row.version}</span>
                  {row.reconsent && <Tag tone="warn">Re-consent due</Tag>}
                  {row.expiringSoon && <Tag tone="warn">{`Expires in ${row.daysLeft}d`}</Tag>}
                </div>
                <div className="cns-card-f">
                  <span className="cns-fact"><Icon name="calendar" size={11} />Last activity <b>{row.answeredOn}</b></span>
                  {row.answeredVersion && <span className="cns-fact"><Icon name="file" size={11} />Answered against <b>{row.answeredVersion}</b></span>}
                  {row.status === 'Accepted' && <span className="cns-fact"><Icon name="clock" size={11} />Valid until <b>{row.expiresOn}</b></span>}
                  <span className="cns-fact"><Icon name="user" size={11} />Owned by <b>{row.owner}</b></span>
                </div>
              </div>
              <div className="cns-card-a">
                {self && row.status !== 'Accepted' && (
                  <Button size="sm" variant="pri" icon="check" onClick={() => answer(row, 'Accepted')}>Give consent</Button>
                )}
                {self && row.reconsent && (
                  <Button size="sm" variant="pri" icon="refresh" onClick={() => answer(row, 'Accepted')}>{`Accept ${row.version}`}</Button>
                )}
                <Button
                  size="sm"
                  icon="kebab"
                  aria-label={`Actions for ${row.name}`}
                  onClick={(e) => setMenu({ anchor: e.currentTarget, items: actionsFor(row) })}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
