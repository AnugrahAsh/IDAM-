import { useMemo, useState } from 'react'
import Avatar from '../../components/primitives/Avatar'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Check from '../../components/primitives/Check'
import Icon from '../../components/primitives/Icon'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { downloadCsv, slugify, toCsv } from '../reports/exportCsv'
import { levelNames } from './data'
import { STATE_META, levelKey, levelLabel, summariseUser } from './campaignUsers'
import { CampaignItemsSkeleton } from './RecertificationSkeleton'

const STATUS_FILTERS = [
  { value: '', label: 'Any status' },
  { value: 'certified', label: 'Certified' },
  { value: 'pending', label: 'Pending' },
  { value: 'notStarted', label: 'Not started' },
  { value: 'notCertified', label: 'Not certified' },
]

const changeText = (r) => {
  if (!r.attrChanges && !r.groupChanges) return ''
  const parts = []
  if (r.attrChanges) parts.push(`${r.attrChanges} ${r.attrChanges === 1 ? 'attribute' : 'attributes'}`)
  if (r.groupChanges) parts.push(`${r.groupChanges} ${r.groupChanges === 1 ? 'group' : 'groups'}`)
  return parts.join(' · ')
}

/** One level's cell: its state, and how many changes the level made. */
function LevelCell({ user, index, chain }) {
  const state = user.states[index]
  const meta = STATE_META[state]
  const lv = user.levels[levelKey(chain[index])]
  const changes = user.diffs[index].counts.total
  const title = state === 'certified'
    ? `Certified by ${lv.certifiedBy} on ${lv.certifiedOn}${lv.remarks ? `. Remarks: ${lv.remarks}` : ''}`
    : state === 'pending'
      ? (lv.mailSent ? 'Notification sent — awaiting review' : 'Awaiting review — notification not sent yet')
      : state === 'notStarted'
        ? `Starts after ${levelLabel(chain[index - 1])} certifies`
        : 'The campaign closed before this level certified'
  return (
    <span className="rc-level" title={title}>
      <Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill>
      {state === 'certified' && changes > 0 && (
        <span className="t-xs t-mut rc-level-n"><Icon name="edit" size={11} />{changes}</span>
      )}
    </span>
  )
}

/**
 * View Campaign › Items.
 *
 * One row per user in the campaign and one column per approval level of its
 * chain, so the headers follow the campaign's configuration rather than a
 * fixed list. There is no row selection: a user is reviewed one at a time, by
 * opening them.
 */
export function ItemsTab({ c, users, loading = false }) {
  const { navigate, toast } = useApp()
  const chain = levelNames(c.levels)
  const keys = chain.map(levelKey)
  const rows = useMemo(() => users.map((u) => summariseUser(u, keys)), [users, c.levels])
  const [facet, setFacet] = useState('all')
  const [levelFilter, setLevelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [changedOnly, setChangedOnly] = useState(false)

  const open = (r) => navigate(`/iam/recertification/${c.id}/items/${r.id}`)

  const fully = rows.filter((r) => r.certifiedLevels === keys.length).length
  const notCertified = rows.filter((r) => r.states.includes('notCertified')).length
  const inReview = rows.length - fully - notCertified
  const totalSteps = rows.length * keys.length
  const doneSteps = rows.reduce((n, r) => n + r.certifiedLevels, 0)
  const progress = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0

  const filtered = rows.filter((r) => {
    if (facet === 'certified' && r.certifiedLevels !== keys.length) return false
    if (facet === 'review' && (r.certifiedLevels === keys.length || r.states.includes('notCertified'))) return false
    if (facet === 'notCertified' && !r.states.includes('notCertified')) return false
    if (changedOnly && !(r.attrChanges || r.groupChanges)) return false
    if (statusFilter) {
      if (levelFilter !== '') return r.states[Number(levelFilter)] === statusFilter
      return r.states.includes(statusFilter)
    }
    return true
  })
  const filtering = facet !== 'all' || levelFilter !== '' || statusFilter !== '' || changedOnly

  const columns = [
    {
      key: '__sno', label: '#', width: 56, sortable: false, cls: 'td-mono',
      render: (r, i) => i + 1,
    },
    {
      key: 'name', label: 'User', locked: true, cls: 'td-main', width: 240,
      value: (r) => `${r.name} ${r.username} ${r.email} ${r.department}`,
      render: (r) => (
        <button type="button" className="cell-id rc-user-link" onClick={(e) => { e.stopPropagation(); open(r) }}>
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span className="rc-user-name">{r.name}</span>
            <span className="cell-sub mono">{r.username}</span>
          </span>
        </button>
      ),
    },
    { key: 'manager', label: 'Manager', width: 150 },
    ...chain.map((name, i) => ({
      key: `level-${i}`,
      label: `${i + 1} · ${levelLabel(name)}`,
      width: 150,
      value: (r) => ['certified', 'pending', 'notStarted', 'notCertified'].indexOf(r.states[i]),
      render: (r) => <LevelCell user={r} index={i} chain={chain} />,
    })),
    {
      key: 'changes', label: 'Changes', width: 170,
      value: (r) => r.attrChanges + r.groupChanges,
      render: (r) => (changeText(r)
        ? <span className="t-sm" title={chain.map((n, i) => `${levelLabel(n)}: ${r.diffs[i].counts.total}`).join(' · ')}>{changeText(r)}</span>
        : <span className="t-faint">No changes</span>),
    },
    {
      key: 'stage', label: 'Current stage', width: 140,
      value: (r) => (r.currentIndex === -1 ? keys.length : r.currentIndex),
      render: (r) => (r.currentIndex === -1
        ? <Pill tone="ok" dot>Completed</Pill>
        : r.states[r.currentIndex] === 'notCertified'
          ? <Pill tone="bad" dot>Stopped at {levelLabel(chain[r.currentIndex])}</Pill>
          : <span className="t-sm">{levelLabel(chain[r.currentIndex])}</span>),
    },
    {
      key: 'review', label: 'Review', width: 104, sortable: false,
      render: (r) => (
        <Button size="sm" iconRight="chevR" onClick={(e) => { e.stopPropagation(); open(r) }}>Review</Button>
      ),
    },
  ]

  const exportUsers = () => {
    const cols = [
      { label: 'Username', csv: (r) => r.username },
      { label: 'Name', csv: (r) => r.name },
      { label: 'Manager', csv: (r) => r.manager },
      ...chain.map((n, i) => ({ label: `${levelLabel(n)} status`, csv: (r) => STATE_META[r.states[i]].label })),
      ...chain.map((n, i) => ({ label: `${levelLabel(n)} changes`, csv: (r) => r.diffs[i].counts.total })),
      { label: 'Current stage', csv: (r) => (r.currentIndex === -1 ? 'Completed' : levelLabel(chain[r.currentIndex])) },
    ]
    const filename = `${slugify(c.name)}-campaign-user-status.csv`
    downloadCsv(filename, toCsv(cols, filtered))
    toast('ok', 'Export ready', `${num(filtered.length)} users written to ${filename}.`)
  }

  return (
    <div className="stack">
      {/* The tiles and the level meters are the same users counted two ways, so
          they settle together; the register below keeps its filters and search
          and settles its own rows. This is the panel's one announcing region. */}
      {loading ? <CampaignItemsSkeleton levels={keys.length} /> : (
        <>
          <StatCards
            items={[
              { id: 'all', icon: 'users', label: 'Users', value: rows.length, chip: `${progress}% complete`, sub: 'in this campaign' },
              { id: 'certified', icon: 'checkC', label: 'Fully certified', value: fully, chipTone: 'ok', chip: `all ${keys.length} levels`, sub: 'every level signed off' },
              { id: 'review', icon: 'clock', label: 'In review', value: inReview, chipTone: inReview ? 'warn' : undefined, chip: inReview ? 'pending a level' : 'none', sub: 'waiting on a level' },
              { id: 'notCertified', icon: 'ban', label: 'Not certified', value: notCertified, chipTone: notCertified ? 'bad' : undefined, chip: notCertified ? 'closed unreviewed' : 'none', sub: 'campaign closed first' },
            ]}
            value={facet}
            onChange={setFacet}
            label="Filter campaign users"
          />

          <Card title="Level progress" sub={`Users certified at each approval level · ${chain.map(levelLabel).join(' → ')}`}>
            <div className="rc-level-progress" style={{ '--rc-cols': keys.length }}>
              {chain.map((name, i) => {
                const done = rows.filter((r) => r.states[i] === 'certified').length
                const pct = rows.length ? Math.round((done / rows.length) * 100) : 0
                return (
                  <div key={name} className="rc-level-progress-it">
                    <div className="row-between">
                      <span className="t-sm"><b>{i + 1}</b> · {levelLabel(name)}</span>
                      <span className="t-xs t-mut num">{num(done)} / {num(rows.length)}</span>
                    </div>
                    <Meter value={pct} tone={pct === 100 ? 'ok' : undefined} height={6} />
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      <DataWorkbench
        id={`recert-items-${c.id}`}
        rows={filtered}
        loading={loading}
        columns={columns}
        searchPlaceholder="Search by name, username, email or department…"
        onRowClick={open}
        filters={(
          <>
            <Select
              aria-label="Approval level"
              value={levelFilter}
              options={[{ value: '', label: 'Any level' }, ...chain.map((n, i) => ({ value: String(i), label: levelLabel(n) }))]}
              onChange={(e) => setLevelFilter(e.target.value)}
            />
            <Select aria-label="Status" value={statusFilter} options={STATUS_FILTERS} onChange={(e) => setStatusFilter(e.target.value)} />
            <label className="row rc-check">
              <Check checked={changedOnly} onChange={setChangedOnly} label="Has changes" />
              <span className="t-sm">Has changes</span>
            </label>
            {filtering && (
              <Button size="sm" icon="x" onClick={() => { setFacet('all'); setLevelFilter(''); setStatusFilter(''); setChangedOnly(false) }}>Clear filters</Button>
            )}
          </>
        )}
        toolbar={<Button size="sm" icon="download" disabled={filtered.length === 0} onClick={exportUsers}>Export</Button>}
        emptyTitle={rows.length === 0 ? 'No users in this campaign' : 'No users match your filters'}
        emptyBody={rows.length === 0
          ? `No identity matched the campaign scope: ${c.scope}.`
          : 'Change or clear the filters to see every user in the campaign.'}
        emptyIcon="users"
        footNote={`One column per approval level · ${chain.map(levelLabel).join(' → ')}`}
        pageSize={10}
      />
    </div>
  )
}
