import { useMemo, useState } from 'react'
import './RecertificationPage.css'
import './RecertifyLinkPage.css'
import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { BASE } from '../../data/nav'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import wordmarkDark from '../../assets/tanflow-wordmark-dark.png'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'
import { SEED_CAMPAIGNS, levelNames } from './data'
import {
  GROUP_TYPES, STATE_META, computeLevelDiff, dataAt, levelKey, levelLabel, seedCampaignUsers, summariseUser,
} from './campaignUsers'
import { applyEmailSubmissions, parseReviewLink, reviewerFor, saveEmailSubmission } from './emailLink'
import GroupPickerForm from './GroupPickerForm'
import UserDetailsForm, { missingRequired, sectionsForReview } from './UserDetailsForm'
import { ReviewLinkSkeleton } from './RecertificationSkeleton'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const show = (v) => (v == null || String(v).trim() === '' ? 'N/A' : String(v))
const goLogin = () => window.location.assign(`${BASE}/login`)

function Shell({ children, sub }) {
  const { theme } = useApp()
  return (
    <div className="rl-page">
      <header className="rl-top">
        <img src={theme === 'dark' ? wordmarkWhite : wordmarkDark} alt="Tanflow" className="rl-logo" />
        <span className="rl-top-sep" aria-hidden="true" />
        <span className="t-sm t-mut">{sub || 'Access recertification'}</span>
      </header>
      <main className="rl-main">{children}</main>
    </div>
  )
}

/** A full-page outcome: success, already done, expired or invalid. */
function Outcome({ icon, tone, title, children, action = true }) {
  return (
    <Shell>
      <div className="rl-outcome">
        <Card>
          <div className="rl-outcome-b">
            <span className="rl-outcome-icon" data-tone={tone}><Icon name={icon} size={22} /></span>
            <h1 className="t-h1">{title}</h1>
            <div className="t-sm t-mut rl-outcome-body">{children}</div>
            {action && <Button variant="pri" icon="lock" onClick={goLogin}>Login</Button>}
          </div>
        </Card>
      </div>
    </Shell>
  )
}

/** Every reviewed attribute as a tile; a changed one reads old → new. */
function PersonalInformation({ diff, levelName, previousName, canEdit, onEdit }) {
  const [changedOnly, setChangedOnly] = useState(false)
  const sections = sectionsForReview()
  const byId = Object.fromEntries(diff.attributes.map((a) => [a.id, a]))
  return (
    <Card
      title="Personal information"
      sub={`${levelLabel(levelName)} compared with ${previousName}`}
      actions={(
        <>
          <Tag>{plural(diff.counts.attributes, 'change', 'changes')}</Tag>
          <label className="row" style={{ gap: 8 }}>
            <Switch checked={changedOnly} onChange={setChangedOnly} label="Show changed only" />
            <span className="t-sm">Changed only</span>
          </label>
          {canEdit && <Button size="sm" icon="edit" onClick={onEdit}>Edit</Button>}
        </>
      )}
    >
      <div className="stack">
        {sections.map((s) => {
          const attrs = s.attrs.map((a) => byId[a.id]).filter((a) => a && (!changedOnly || a.type !== 'unchanged'))
          if (!attrs.length) return null
          return (
            <div key={s.id}>
              <div className="t-micro t-mut rl-attr-section">{s.name}</div>
              <div className="rl-attrs">
                {attrs.map((a) => (
                  <div key={a.id} className="rl-attr" data-change={a.type}>
                    <span className="row-between" style={{ gap: 8 }}>
                      <span className="t-xs t-mut">{a.label}</span>
                      {a.type !== 'unchanged' && <Pill tone={a.type === 'added' ? 'ok' : a.type === 'cleared' ? 'bad' : 'info'}>{a.type === 'added' ? 'Added' : a.type === 'cleared' ? 'Cleared' : 'Modified'}</Pill>}
                    </span>
                    {a.type === 'unchanged' ? (
                      <span className="rl-attr-v">{show(a.after)}</span>
                    ) : (
                      <span className="rl-attr-v">
                        <span className="rc-old">{show(a.before)}</span>
                        <Icon name="chevR" size={12} />
                        <span className="rc-new">{show(a.after)}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {changedOnly && diff.counts.attributes === 0 && (
          <div className="t-sm t-mut">No attribute changed at this level.</div>
        )}
      </div>
    </Card>
  )
}

function Groups({ diff, canEdit, onEdit }) {
  return (
    <Card title="Groups" sub="Group memberships at this level. Added groups are highlighted green, removed ones red.">
      <div className="stack">
        {GROUP_TYPES.map((t) => {
          const g = diff.groups[t.id]
          return (
            <div key={t.id} className="rl-group">
              <div className="row-between rl-group-h">
                <div style={{ minWidth: 0 }}>
                  <div className="t-sm" style={{ fontWeight: 600 }}>{t.label}</div>
                  <div className="t-xs t-mut">
                    {g.added || g.removed ? `+${g.added} added · −${g.removed} removed at this level` : 'No change at this level'}
                  </div>
                </div>
                {canEdit && <Button size="sm" icon="edit" onClick={() => onEdit(t)}>Edit</Button>}
              </div>
              <table className="tbl rl-group-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>S.No</th>
                    <th style={{ width: '42%' }}>Name</th>
                    <th>Application</th>
                    <th style={{ width: 120 }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.length === 0 && (
                    <tr><td colSpan={4} className="t-sm t-mut">No groups of this type.</td></tr>
                  )}
                  {g.rows.map((r, i) => (
                    <tr key={`${r.id}-${r.change}`} data-change={r.change}>
                      <td className="td-mono">{i + 1}</td>
                      <td className="td-main"><span className={r.change === 'removed' ? 'rc-old' : undefined}>{r.name}</span></td>
                      <td>{r.application || '—'}</td>
                      <td>
                        {r.change === 'unchanged'
                          ? <span className="t-faint">—</span>
                          : <Pill tone={r.change === 'added' ? 'ok' : 'bad'} dot>{r.change === 'added' ? 'Added' : 'Removed'}</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/**
 * Recertification via email link.
 *
 * The reviewer for one approval level opens the link from their email, sees
 * what every earlier level changed, edits the user's details and groups for
 * their own level, and submits with remarks — without signing in to the
 * console.
 */
export default function RecertifyLinkPage() {
  const { toast, setDrawer } = useApp()
  const link = useMemo(() => parseReviewLink(window.location.pathname), [])
  const c = link && SEED_CAMPAIGNS.find((x) => String(x.id) === String(link.campaignId))
  const chain = c ? levelNames(c.levels) : []
  const keys = chain.map(levelKey)
  const [users] = useState(() => (c ? applyEmailSubmissions(c.id, seedCampaignUsers(c)) : []))
  const raw = link && users.find((u) => String(u.id) === String(link.userId))
  const user = useMemo(() => (raw ? summariseUser(raw, keys) : null), [raw]) // eslint-disable-line react-hooks/exhaustive-deps
  const linkIndex = link ? keys.indexOf(link.levelKey) : -1

  const [tab, setTab] = useState(link?.levelKey)
  const [draft, setDraft] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [done, setDone] = useState(null)
  /* The one load on this page, and the whole page waits on it. Everything
     below — the identity, the level tabs, and the four outcomes this link can
     resolve to — is one reading of one review, so none of it can be drawn
     until that reading is in hand. */
  const loading = useLoading()

  /* Ahead of every outcome on purpose. Whether the link is valid, expired or
     still open is the answer this page exists to give, and giving the wrong one
     for a beat is worse than a wait. */
  if (loading) {
    return (
      <Shell sub={c ? `${c.name} · recertification request` : undefined}>
        <ReviewLinkSkeleton levels={chain.length || 3} />
      </Shell>
    )
  }

  if (!c || !user || linkIndex === -1) {
    return (
      <Outcome icon="noentry" tone="bad" title="This link isn't valid">
        The recertification link is incomplete or no longer points to a review. Open the most recent email you received, or sign in to the console to find your pending reviews.
      </Outcome>
    )
  }

  const reviewer = reviewerFor(c, linkIndex, keys.length)
  const lastLevel = linkIndex === keys.length - 1

  if (done) {
    return (
      <Outcome icon="checkC" tone="ok" title="Details recertified successfully">
        <p>
          {plural(done.changes, 'change', 'changes')} to <b>{user.name}</b> {done.changes === 1 ? 'was' : 'were'} recorded at the {levelLabel(chain[linkIndex])} level
          as {reviewer}.
        </p>
        <p>
          {lastLevel
            ? 'This was the final approval level — the recertification for this user is complete.'
            : `${reviewerFor(c, linkIndex + 1, keys.length)} has been emailed to review the ${levelLabel(chain[linkIndex + 1])} level.`}
        </p>
        <p>Use the link below to sign in to the console.</p>
      </Outcome>
    )
  }

  const state = user.states[linkIndex]
  if (c.status !== 'Active' && state !== 'certified') {
    return (
      <Outcome icon="clock" tone="warn" title="This review link has expired">
        {c.name} was closed on {c.closesOn}, so it no longer accepts changes. Contact the campaign auditor, {c.auditor}, if this user still needs a review.
      </Outcome>
    )
  }

  const editable = state === 'pending'
  const index = keys.indexOf(tab) === -1 ? linkIndex : keys.indexOf(tab)
  const onLinkLevel = index === linkIndex
  const canEdit = editable && onLinkLevel

  const baseline = dataAt(user, keys, linkIndex - 1)
  const working = draft || baseline
  const shownUser = editable
    ? { ...user, levels: { ...user.levels, [keys[linkIndex]]: { ...user.levels[keys[linkIndex]], mods: working } } }
    : user
  const diff = computeLevelDiff(shownUser, keys, index)
  const lv = user.levels[keys[index]]

  const editDetails = () => {
    const ref = { current: { ...working.personalInfo }, attempted: false }
    const render = () => setDrawer({
      title: 'Edit user details',
      sub: `${user.name} · changes are recorded at the ${levelLabel(chain[linkIndex])} level.`,
      size: 'wide',
      children: (
        <UserDetailsForm
          username={user.username}
          value={ref.current}
          attempted={ref.attempted}
          onChange={(next) => { ref.current = next; render() }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="check"
            onClick={() => {
              if (missingRequired(ref.current).length) { ref.attempted = true; render(); return }
              setDraft({ ...working, personalInfo: ref.current })
              setDrawer(null)
            }}
          >
            Apply changes
          </Button>
        </>
      ),
    })
    render()
  }

  const editGroups = (t) => {
    const held = working.groups[t.id]
    const ref = { current: held.slice() }
    const render = () => setDrawer({
      title: `Edit ${t.label}`,
      sub: 'Tick or untick as many groups as you need. Nothing changes until you apply.',
      size: 'wide',
      children: <GroupPickerForm kind={t.kind} held={held} value={ref.current} onChange={(next) => { ref.current = next; render() }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="check"
            onClick={() => { setDraft({ ...working, groups: { ...working.groups, [t.id]: ref.current } }); setDrawer(null) }}
          >
            Apply changes
          </Button>
        </>
      ),
    })
    render()
  }

  const submit = () => {
    setAttempted(true)
    if (!remarks.trim()) {
      toast('warn', 'Remarks required', 'Add remarks before submitting this level.')
      return
    }
    saveEmailSubmission({ campaignId: c.id, userId: user.id, key: keys[linkIndex], data: working, remarks: remarks.trim(), by: reviewer })
    setDone({ changes: computeLevelDiff(shownUser, keys, linkIndex).counts.total })
  }

  const tabs = chain.map((name, i) => {
    const enabled = i === 0 || user.levels[keys[i - 1]].certified
    const meta = STATE_META[user.states[i]]
    const isYours = i === linkIndex
    // The reviewer's own level counts their unsaved edits, like the diff below.
    const count = isYours && editable ? computeLevelDiff(shownUser, keys, i).counts.total : user.diffs[i].counts.total
    return {
      id: keys[i],
      label: levelLabel(name),
      icon: meta.icon,
      tone: meta.tone,
      badge: isYours ? (editable ? 'Your review' : 'Your level') : undefined,
      badgeTone: editable ? 'warn' : 'mut',
      count,
      disabled: !enabled,
      title: enabled ? `${meta.label} · ${count} changes` : `Available after ${levelLabel(chain[i - 1])} completes review`,
    }
  })

  return (
    <Shell sub={`${c.name} · recertification request`}>
      <div className="stack">
        <Card>
          <div className="rl-intro">
            <Avatar first={user.firstName} last={user.lastName} size="xl" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="t-micro t-mut">Recertify user</div>
              <h1 className="t-h1" style={{ margin: '2px 0 4px' }}>{user.name}</h1>
              <div className="t-sm t-mut">{user.username} · {user.department} · {user.organization}</div>
            </div>
            <div className="rl-intro-facts">
              <span><span className="t-xs t-mut">Reviewer</span><b className="t-sm">{reviewer}</b></span>
              <span><span className="t-xs t-mut">Your level</span><b className="t-sm">{levelLabel(chain[linkIndex])} · {linkIndex + 1} of {keys.length}</b></span>
              <span><span className="t-xs t-mut">Respond by</span><b className="t-sm">{c.closesOn}</b></span>
            </div>
          </div>
        </Card>

        {state === 'certified' && (
          <Banner tone="ok">
            You already recertified this user at the {levelLabel(chain[linkIndex])} level on {user.levels[keys[linkIndex]].certifiedOn}. This page is read-only.
          </Banner>
        )}
        {state === 'notStarted' && (
          <Banner tone="info">
            This review opens once the {levelLabel(chain[linkIndex - 1])} level has been completed. You can look at the earlier levels below.
          </Banner>
        )}

        <Tabs value={keys[index]} onChange={(id) => setTab(id)} tabs={tabs} />

        {canEdit ? (
          <Banner tone="warn">
            Review the details and groups below. Use <b>Edit</b> to correct anything, then add remarks and
            {lastLevel ? ' accept all changes.' : ` submit to send the user to ${levelLabel(chain[linkIndex + 1])}.`}
          </Banner>
        ) : (
          <Banner tone="info">
            {lv.certified
              ? `Read-only — ${levelLabel(chain[index])} was certified by ${lv.certifiedBy} on ${lv.certifiedOn}.${lv.remarks ? ` Remarks: “${lv.remarks}”` : ''}`
              : `Read-only — the ${levelLabel(chain[index])} level hasn't been reviewed yet.`}
          </Banner>
        )}

        <PersonalInformation
          key={`pi-${index}`}
          diff={diff}
          levelName={chain[index]}
          previousName={index === 0 ? 'Original data' : levelLabel(chain[index - 1])}
          canEdit={canEdit}
          onEdit={editDetails}
        />

        <Groups diff={diff} canEdit={canEdit} onEdit={editGroups} />

        {canEdit && (
          <Card title={lastLevel ? 'Accept all changes' : 'Submit your review'} sub={`Recorded as ${reviewer} on the attestation trail`}>
            <Field
              label="Remarks"
              required
              error={attempted && !remarks.trim() ? 'Remarks is required.' : undefined}
              hint="Why the values were changed or confirmed. Shown to every later level and kept as evidence."
            >
              <TextInput as="textarea" rows={3} value={remarks} placeholder="e.g. Department corrected after the reorganisation." onChange={(e) => setRemarks(e.target.value)} />
            </Field>
            <div className="row rl-submit">
              <span className="t-xs t-mut">{plural(diff.counts.total, 'change', 'changes')} will be recorded at {levelLabel(chain[linkIndex])}.</span>
              <span className="spacer" />
              <Button disabled={!draft} onClick={() => setDraft(null)}>Discard changes</Button>
              <Button variant="pri" icon="checkC" onClick={submit}>{lastLevel ? 'Accept All Changes' : 'Submit'}</Button>
            </div>
          </Card>
        )}
      </div>
    </Shell>
  )
}
