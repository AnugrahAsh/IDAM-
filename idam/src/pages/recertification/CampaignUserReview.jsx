import { Fragment, useMemo, useState } from 'react'
import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import IconButton from '../../components/primitives/IconButton'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import PageBar from '../../components/shell/PageBar'
import { useApp } from '../../store/AppContext'
import { levelNames } from './data'
import GroupPickerForm from './GroupPickerForm'
import { reviewLinkPath, reviewerFor } from './emailLink'
import {
  ATTRIBUTE_META, GROUP_TYPES, STATE_META, computeLevelDiff, dataAt, levelKey, levelLabel, summariseUser,
} from './campaignUsers'

const CHANGE_META = {
  modified: { label: 'Modified', tone: 'info' },
  added: { label: 'Added', tone: 'ok' },
  cleared: { label: 'Cleared', tone: 'bad' },
  unchanged: { label: 'Unchanged', tone: 'mut' },
  removed: { label: 'Removed', tone: 'bad' },
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const changesText = (a, g) => `${plural(a, 'attribute', 'attributes')} · ${plural(g, 'group', 'groups')}`

const show = (v) => (v == null || String(v).trim() === '' ? '—' : String(v))

const sectionsOf = (rows) => {
  const out = []
  rows.forEach((r) => {
    let s = out.find((x) => x.id === r.section)
    if (!s) { s = { id: r.section, name: r.sectionName, rows: [] }; out.push(s) }
    s.rows.push(r)
  })
  return out
}

/** The attribute comparison for one level: before, after and the change. */
function AttributeDiff({ diff, levelName, previousName, editing, draft, onEdit }) {
  const [changedOnly, setChangedOnly] = useState(diff.counts.attributes > 0 && !editing)
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const rows = diff.attributes.filter((a) => (!changedOnly || a.type !== 'unchanged')
    && (!needle || `${a.label} ${a.before} ${a.after}`.toLowerCase().includes(needle)))

  return (
    <Card
      title="Attribute changes"
      sub={`${levelLabel(levelName)} compared with ${previousName}`}
      flush
      actions={(
        <>
          <Tag>{diff.counts.attributes} {diff.counts.attributes === 1 ? 'change' : 'changes'}</Tag>
          <label className="row" style={{ gap: 8 }}>
            <Switch checked={changedOnly} onChange={setChangedOnly} label="Show changed only" />
            <span className="t-sm">Changed only</span>
          </label>
        </>
      )}
    >
      <div className="rc-diff-search">
        <TextInput value={query} placeholder="Find an attribute…" aria-label="Find an attribute" onChange={(e) => setQuery(e.target.value)} />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          size="sm"
          icon="checkC"
          title={changedOnly && !needle ? 'No attribute changed at this level' : 'No attribute matches'}
          body={changedOnly && !needle ? 'Turn off “Changed only” to see every attribute and its value.' : 'Clear the search to see every attribute.'}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl rc-diff">
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '31%' }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Before · {previousName}</th>
                <th>After · {levelLabel(levelName)}</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {sectionsOf(rows).map((s) => (
                <Fragment key={s.id}>
                  <tr className="rc-diff-section"><td colSpan={4}>{s.name}</td></tr>
                  {s.rows.map((a) => (
                    <tr key={a.id} data-change={a.type}>
                      <td className="td-main">{a.label}</td>
                      <td>
                        <span className={a.type !== 'unchanged' ? 'rc-old' : undefined}>{show(a.before)}</span>
                      </td>
                      <td>
                        {editing ? (
                          <TextInput
                            value={draft.personalInfo[a.id] ?? ''}
                            aria-label={`${a.label} after ${levelLabel(levelName)}`}
                            onChange={(e) => onEdit(a.id, e.target.value)}
                          />
                        ) : (
                          <span className={a.type !== 'unchanged' ? 'rc-new' : undefined}>{show(a.after)}</span>
                        )}
                      </td>
                      <td><Pill tone={CHANGE_META[a.type].tone} dot>{CHANGE_META[a.type].label}</Pill></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/** Group changes for one level: three group types, added and removed labelled. */
function GroupDiff({ diff, editing, draft, onGroups }) {
  const { setDrawer } = useApp()

  // Every tick in the drawer is applied to the level's draft in one shot when
  // "Apply changes" is pressed — adding or removing several groups at once,
  // instead of one dropdown pick or one "×" at a time.
  const openManage = (t) => {
    const held = draft.groups[t.id]
    const ref = { current: held.slice() }
    const render = () => setDrawer({
      title: `Manage ${t.label}`,
      sub: 'Tick or untick as many groups as you need. Nothing changes until you apply.',
      size: 'wide',
      children: (
        <GroupPickerForm
          kind={t.kind}
          held={held}
          value={ref.current}
          onChange={(next) => { ref.current = next; render() }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button variant="pri" icon="check" onClick={() => { onGroups(t.id, ref.current); setDrawer(null) }}>
            Apply changes
          </Button>
        </>
      ),
    })
    render()
  }

  return (
    <div className="stack">
      {GROUP_TYPES.map((t) => {
        const g = diff.groups[t.id]
        return (
          <Card
            key={t.id}
            title={`${t.label} (${g.rows.filter((r) => r.change !== 'removed').length})`}
            sub={g.added || g.removed ? `+${g.added} added · −${g.removed} removed at this level` : 'No change at this level'}
            flush
            actions={editing && (
              <Button size="sm" icon="layers" onClick={() => openManage(t)}>Manage groups</Button>
            )}
          >
            {g.rows.length === 0 ? (
              <div className="card-b t-sm t-mut">No groups of this type.</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>#</th>
                    <th>Group</th>
                    <th>Application</th>
                    <th style={{ width: 130 }}>Change</th>
                    {editing && <th className="td-act"><span className="vis-hidden">Remove</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => (
                    <tr key={`${r.id}-${r.change}`} data-change={r.change}>
                      <td className="td-mono">{i + 1}</td>
                      <td className="td-main"><span className={r.change === 'removed' ? 'rc-old' : r.change === 'added' ? 'rc-new' : undefined}>{r.name}</span></td>
                      <td>{r.application}</td>
                      <td>
                        {r.change === 'unchanged'
                          ? <span className="t-faint">—</span>
                          : <Pill tone={CHANGE_META[r.change].tone} dot>{CHANGE_META[r.change].label}</Pill>}
                      </td>
                      {editing && (
                        <td className="td-act">
                          {r.change !== 'removed' && (
                            <IconButton icon="x" size="sm" label={`Remove ${r.name}`} onClick={() => onGroups(t.id, draft.groups[t.id].filter((h) => h.id !== r.id))} />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/** Every attribute across the original data and every level, side by side. */
function AllChanges({ user, chain, keys }) {
  const [changedOnly, setChangedOnly] = useState(true)
  const columns = [{ id: 'original', label: 'Original', data: user.actual, lv: null }, ...chain.map((name, i) => ({
    id: keys[i],
    label: levelLabel(name),
    data: user.levels[keys[i]].mods ? dataAt(user, keys, i) : null,
    lv: user.levels[keys[i]],
    state: user.states[i],
  }))]
  const valueAt = (col, prev, attr) => (col.data ? col.data.personalInfo[attr] : prev)
  const rows = ATTRIBUTE_META.map((a) => {
    let prev = user.actual.personalInfo[a.id]
    const cells = columns.map((col, ci) => {
      const v = ci === 0 ? prev : valueAt(col, prev, a.id)
      const changed = ci > 0 && col.data && String(v) !== String(prev)
      const cell = { v, changed, pending: ci > 0 && !col.data }
      prev = v
      return cell
    })
    return { ...a, cells, any: cells.some((c) => c.changed) }
  }).filter((r) => !changedOnly || r.any)

  return (
    <div className="stack">
      <Card
        title="All changes"
        sub={`Every attribute from the original data through ${chain.map(levelLabel).join(' → ')}`}
        flush
        actions={(
          <label className="row" style={{ gap: 8 }}>
            <Switch checked={changedOnly} onChange={setChangedOnly} label="Show changed only" />
            <span className="t-sm">Changed only</span>
          </label>
        )}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl rc-timeline">
            <thead>
              <tr>
                <th>Attribute</th>
                {columns.map((col) => (
                  <th key={col.id}>
                    {col.label}
                    {col.state && <span className="rc-th-state"><Pill tone={STATE_META[col.state].tone} dot>{STATE_META[col.state].label}</Pill></span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="t-sm t-mut">No attribute has changed at any level.</td></tr>
              )}
              {sectionsOf(rows).map((s) => (
                <Fragment key={s.id}>
                  <tr className="rc-diff-section"><td colSpan={columns.length + 1}>{s.name}</td></tr>
                  {s.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="td-main">{r.label}</td>
                      {r.cells.map((cell, ci) => (
                        <td key={columns[ci].id} data-changed={cell.changed || undefined}>
                          {cell.pending
                            ? <span className="t-faint">—</span>
                            : <span className={cell.changed ? 'rc-new' : undefined}>{show(cell.v)}{cell.changed && <span className="vis-hidden"> (changed)</span>}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr className="rc-diff-section"><td colSpan={columns.length + 1}>Groups, remarks and sign-off</td></tr>
              <tr>
                <td className="td-main">Group changes</td>
                <td><span className="t-faint">—</span></td>
                {chain.map((_, i) => {
                  const d = user.diffs[i]
                  const items = GROUP_TYPES.flatMap((t) => d.groups[t.id].rows.filter((r) => r.change !== 'unchanged').map((r) => ({ ...r, type: t.id })))
                  return (
                    <td key={keys[i]}>
                      {!d.submitted ? <span className="t-faint">—</span> : items.length === 0 ? <span className="t-mut">None</span> : (
                        <span className="rc-chips">
                          {items.map((r) => <Pill key={`${r.type}-${r.id}-${r.change}`} tone={r.change === 'added' ? 'ok' : 'bad'}>{r.change === 'added' ? '+' : '−'}{r.name}</Pill>)}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td className="td-main">Remarks</td>
                <td><span className="t-faint">—</span></td>
                {chain.map((_, i) => <td key={keys[i]}>{user.levels[keys[i]].remarks || <span className="t-faint">—</span>}</td>)}
              </tr>
              <tr>
                <td className="td-main">Certified by</td>
                <td><span className="t-faint">—</span></td>
                {chain.map((_, i) => {
                  const lv = user.levels[keys[i]]
                  return (
                    <td key={keys[i]}>
                      {lv.certified
                        ? <span className="cell-stack"><span>{lv.certifiedBy}</span><span className="cell-sub mono">{lv.certifiedOn}</span></span>
                        : <Pill tone={STATE_META[user.states[i]].tone} dot>{STATE_META[user.states[i]].label}</Pill>}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/**
 * One campaign user, reviewed level by level.
 *
 * The navbar has an "All changes" view and one tab per approval level. A level
 * opens once the level before it has submitted; the level currently awaiting
 * review is where changes are made, remarks recorded and the level certified.
 */
export default function CampaignUserReview({ c, users, userId, levelParam, decider, onSubmit }) {
  const { navigate, toast } = useApp()
  const chain = levelNames(c.levels)
  const keys = chain.map(levelKey)
  const raw = users.find((u) => String(u.id) === String(userId))
  const user = useMemo(() => (raw ? summariseUser(raw, keys) : null), [raw, c.levels])
  const closed = c.status !== 'Active'

  const base = `/iam/recertification/${c.id}/items`
  const defaultTab = user
    ? (user.currentIndex !== -1 && user.states[user.currentIndex] === 'pending' ? keys[user.currentIndex] : keys[Math.max(0, user.certifiedLevels - 1)])
    : 'all'
  const tab = levelParam && (levelParam === 'all' || keys.includes(levelParam)) ? levelParam : defaultTab
  const index = keys.indexOf(tab)

  const editable = !!user && index !== -1 && !closed && user.states[index] === 'pending'
  const [draft, setDraft] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [attempted, setAttempted] = useState(false)

  if (!user) {
    return (
      <>
        <PageBar title="User not in campaign" crumbs={[{ label: 'Recertification', to: '/iam/recertification' }, { label: c.name, to: base }, { label: 'Not found' }]} />
        <EmptyState
          icon="users"
          title={`No user ${userId} in ${c.name}`}
          body="The user may not match this campaign's scope."
          actions={<Button variant="pri" icon="chevL" onClick={() => navigate(base)}>Back to Items</Button>}
        />
      </>
    )
  }

  const ordered = users
  const pos = ordered.findIndex((u) => String(u.id) === String(user.id))
  const goUser = (u) => navigate(`${base}/${u.id}`)
  const goTab = (id) => { setDraft(null); setRemarks(''); setAttempted(false); navigate(`${base}/${user.id}/${id}`, { replace: true }) }

  /* While the pending level is being reviewed, its diff is computed against
     the draft, so every edit shows up as a change straight away. */
  const working = editable ? (draft || dataAt(user, keys, index - 1 < 0 ? -1 : index - 1)) : null
  const shownUser = editable
    ? { ...user, levels: { ...user.levels, [tab]: { ...user.levels[tab], mods: working } } }
    : user
  const diff = index === -1 ? null : computeLevelDiff(shownUser, keys, index)
  const startDraft = () => draft || JSON.parse(JSON.stringify(working))
  const editAttr = (attr, value) => { const d = startDraft(); d.personalInfo[attr] = value; setDraft({ ...d }) }
  const editGroups = (type, list) => { const d = startDraft(); d.groups[type] = list; setDraft({ ...d }) }

  const lastLevel = index === keys.length - 1
  const submit = () => {
    setAttempted(true)
    if (!remarks.trim()) {
      toast('warn', 'Remarks required', 'Add remarks before certifying this level.')
      return
    }
    onSubmit(user.id, tab, index, working, remarks.trim())
    toast('ok', lastLevel ? 'All changes accepted' : `${levelLabel(chain[index])} certified`,
      `${user.name} · ${diff.counts.total} ${diff.counts.total === 1 ? 'change' : 'changes'} recorded${lastLevel ? ' and the review completed.' : `, sent to ${levelLabel(chain[index + 1])}.`}`)
    navigate(base)
  }

  const lv = index === -1 ? null : user.levels[tab]
  const readOnlyReason = index === -1 ? null
    : closed ? 'Read-only — the campaign is closed.'
      : user.states[index] === 'certified' ? `Read-only — certified by ${lv.certifiedBy} on ${lv.certifiedOn}.`
        : user.states[index] === 'notStarted' ? `Awaiting ${levelLabel(chain[index - 1])} review.` : null

  const tabs = [
    { id: 'all', label: 'All changes', icon: 'history', count: user.attrChanges + user.groupChanges },
    ...chain.map((name, i) => {
      const enabled = i === 0 || user.levels[keys[i - 1]].certified
      const meta = STATE_META[user.states[i]]
      // The one level a viewer can actually change something in — every other
      // tab is either already signed off or still locked, so this is the tab
      // "which level is editable" is really asking about.
      const isEditable = enabled && !closed && user.states[i] === 'pending'
      return {
        id: keys[i],
        label: `${i + 1} · ${levelLabel(name)}`,
        icon: meta.icon,
        tone: meta.tone,
        badge: isEditable ? 'Editable now' : undefined,
        count: user.diffs[i].counts.total,
        disabled: !enabled,
        title: enabled
          ? `${meta.label}${isEditable ? ' · editable now' : ''} · ${user.diffs[i].counts.total} changes`
          : `Available after ${levelLabel(chain[i - 1])} completes review`,
      }
    }),
  ]

  return (
    <>
      <DetailHeader
        backTo={base}
        backLabel={c.name}
        eyebrow="Campaign user review"
        title={user.name}
        sub={`${user.username} · ${user.department} · ${user.organization}`}
        media={<Avatar first={user.firstName} last={user.lastName} size="xl" />}
        badges={(
          <>
            <Pill tone={closed ? 'mut' : 'ok'} dot>Campaign {c.status}</Pill>
            <Tag>{user.certifiedLevels} of {keys.length} levels certified</Tag>
          </>
        )}
        meta={(
          <>
            <Fact icon="user" label="Manager" value={user.manager} />
            <Fact icon="certify" label="Campaign" value={c.name} />
            <Fact icon="hierarchy" label="Current stage" value={user.currentIndex === -1 ? 'Completed' : levelLabel(chain[user.currentIndex])} />
            <Fact icon="edit" label="Changes" value={changesText(user.attrChanges, user.groupChanges)} />
          </>
        )}
        actions={(
          <>
            <Button icon="chevL" disabled={pos <= 0} onClick={() => goUser(ordered[pos - 1])}>Previous user</Button>
            <Button iconRight="chevR" disabled={pos === -1 || pos >= ordered.length - 1} onClick={() => goUser(ordered[pos + 1])}>Next user</Button>
            <Button icon="user" onClick={() => navigate(`/iam/users/${user.id}`)}>Open identity</Button>
            {!closed && user.currentIndex !== -1 && user.states[user.currentIndex] === 'pending' && (
              <Button
                icon="mail"
                title={`The page ${reviewerFor(c, user.currentIndex, keys.length)} opens from the ${levelLabel(chain[user.currentIndex])} review email`}
                onClick={() => window.open(reviewLinkPath(c.id, user.id, keys[user.currentIndex]), '_blank', 'noopener')}
              >
                Open email link
              </Button>
            )}
          </>
        )}
        tabs={<Tabs value={tab} onChange={goTab} tabs={tabs} />}
      />

      <div className="detail-body">
        {tab === 'all' ? (
          <AllChanges user={user} chain={chain} keys={keys} />
        ) : (
          <div className="stack">
            <Card title={`Level ${index + 1} · ${levelLabel(chain[index])}`} sub="Status, sign-off and remarks for this level">
              <KeyValue
                cols={4}
                rows={[
                  { k: 'Status', node: <Pill tone={STATE_META[user.states[index]].tone} icon={STATE_META[user.states[index]].icon}>{STATE_META[user.states[index]].label}</Pill>, icon: 'activity' },
                  { k: 'Certified by', v: lv.certifiedBy || '—', icon: 'user' },
                  { k: 'Certified on', v: lv.certifiedOn || '—', icon: 'calendar' },
                  { k: 'Notification', v: lv.certified || lv.mailSent ? 'Sent' : 'Not sent', icon: 'mail' },
                  { k: 'Changes at this level', v: changesText(diff.counts.attributes, diff.counts.groups), icon: 'edit' },
                  { k: 'Remarks', v: lv.remarks || '—', icon: 'file' },
                ]}
              />
              {readOnlyReason && <div style={{ marginTop: 12 }}><Banner tone="info">{readOnlyReason}</Banner></div>}
              {editable && (
                <div style={{ marginTop: 12 }}>
                  <Banner tone="warn">
                    This level is awaiting review. Edit values in the <b>After</b> column and the group lists below, then add remarks and
                    {lastLevel ? ' accept all changes.' : ` submit to send the user to ${levelLabel(chain[index + 1])}.`}
                  </Banner>
                </div>
              )}
            </Card>

            <AttributeDiff
              key={`attrs-${tab}`}
              diff={diff}
              levelName={chain[index]}
              previousName={index === 0 ? 'Original data' : levelLabel(chain[index - 1])}
              editing={editable}
              draft={working}
              onEdit={editAttr}
            />

            <GroupDiff diff={diff} editing={editable} draft={working} onGroups={editGroups} />

            {editable && (
              <Card title={lastLevel ? 'Accept all changes' : 'Submit this level'} sub={`Recorded as ${decider} on the attestation trail`}>
                <Field label="Remarks" required error={attempted && !remarks.trim() ? 'Remarks is required.' : undefined} hint="Why the values were changed or confirmed. Shown to every later level and kept as evidence.">
                  <TextInput as="textarea" rows={3} value={remarks} placeholder="e.g. Department corrected after the reorganisation." onChange={(e) => setRemarks(e.target.value)} />
                </Field>
                <div className="row" style={{ marginTop: 14 }}>
                  <span className="t-xs t-mut">{diff.counts.total} {diff.counts.total === 1 ? 'change' : 'changes'} will be recorded at {levelLabel(chain[index])}.</span>
                  <span className="spacer" />
                  <Button disabled={!draft} onClick={() => setDraft(null)}>Discard edits</Button>
                  <Button variant="pri" icon="checkC" onClick={submit}>{lastLevel ? 'Accept All Changes' : 'Submit'}</Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  )
}
