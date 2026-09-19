import { useMemo, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { USERS } from '../../data/seed'
import AudiencePicker from '../shared/comms/AudiencePicker'
import { blankAudience, describeAudience, matchedUsers, reachOf } from '../shared/comms/audienceModel'
import { AUDITORS, REVIEWER_POOL, START_MODES, TODAY, shiftDays } from './data'

/* The chain and the window were asked for on this form and then never varied:
   every campaign was created with the default and adjusted, if at all, from the
   record afterwards. They are stated here so the form is still honest about
   what it is creating, without asking for a decision nobody was making. */
const DEFAULT_CHAIN = 'Line manager → Resource owner → Auditor'
const DEFAULT_WINDOW = 14

const effortLabel = (mins) => {
  const m = Math.round(mins)
  if (m < 60) return `${m} minutes`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${num(h)}h ${rest}m` : `${num(h)} hours`
}

export default function CampaignForm({ onCreate }) {
  const { toast, navigate } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [auditor, setAuditor] = useState(AUDITORS[0])
  const [startMode, setStartMode] = useState(START_MODES[0])
  /* Only read when the campaign is not starting immediately: the run that
     collects the population is the one that happens at this instant, and an
     immediate start has no instant to name. */
  const [runAt, setRunAt] = useState('')
  /* The same audience control the announcement composer uses. A campaign
     population and a notification audience are the same question — which
     identities does this apply to — and answering it two different ways in two
     places is how the two drift apart. */
  const [audience, setAudience] = useState(() => blankAudience())

  const dirty = name.trim().length > 0 || description.trim().length > 0

  /* A standing group is resolved by the platform and cannot be enumerated
     here, so its reach is an estimate; named people and a condition resolve to
     an actual list. Either way this is the population the campaign collects. */
  const matched = useMemo(() => {
    const picked = matchedUsers(audience)
    return picked.length ? picked : USERS.slice(0, reachOf(audience))
  }, [audience])

  const preview = useMemo(() => {
    const entitlements = matched.length * 5
    const reviewers = Math.max(1, Math.min(REVIEWER_POOL.length, Math.ceil(matched.length / 14)))
    return {
      identities: matched.length,
      entitlements,
      reviewers,
      perReviewer: Math.ceil(entitlements / reviewers),
      effort: effortLabel(entitlements * 2.5),
    }
  }, [matched])

  /* Only one of the three start modes leaves the opening moment unstated.
     "Immediately" is now, and "the beginning of next month" is a date the
     platform can work out on its own — asking for one there is asking a
     question the answer to which is already on screen. */
  const needsRunAt = startMode === START_MODES[1]
  const monthStart = useMemo(() => {
    const [y, m] = TODAY.slice(0, 10).split('-').map(Number)
    return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`
  }, [])
  const opensAt = startMode === START_MODES[0]
    ? 'Immediately'
    : needsRunAt
      ? (runAt ? runAt.replace('T', ' ') : 'On the next scheduler run')
      : `${monthStart} 00:00`
  const sections = [
    { id: 'sec-definition', n: 1, title: 'Definition', sub: 'Name, purpose and accountable auditor', done: name.trim().length > 2 },
    { id: 'sec-population', n: 2, title: 'User selection', sub: describeAudience(audience), done: matched.length > 0 },
    { id: 'sec-schedule', n: 3, title: 'Schedule', sub: opensAt, done: !needsRunAt || Boolean(runAt) },
    { id: 'sec-preview', n: 4, title: 'Preview', sub: `${num(preview.entitlements)} items`, done: preview.entitlements > 0 },
  ]

  const goTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const create = () => {
    if (name.trim().length < 3) {
      toast('warn', 'Name required', 'Give the campaign a name reviewers will recognise in their queue.')
      goTo('sec-definition')
      return
    }
    if (preview.entitlements === 0) {
      toast('warn', 'Nothing in scope', 'The selected audience matches no identities. Widen the selection before creating the campaign.')
      goTo('sec-preview')
      return
    }
    if (needsRunAt && !runAt) {
      toast('warn', 'Run time required', 'A campaign that starts on a scheduled run needs the date and time of that run.')
      goTo('sec-schedule')
      return
    }
    const audienceText = describeAudience(audience)
    onCreate({
      name: name.trim(),
      description: description.trim()
        || `Attestation of ${num(preview.entitlements)} entitlements across ${audienceText.toLowerCase()}, routed through ${DEFAULT_CHAIN.toLowerCase()} and signed off by ${auditor}.`,
      scope: audienceText,
      auditor,
      status: 'Active',
      progress: 0,
      items: preview.entitlements,
      decided: 0,
      revoked: 0,
      dueIn: DEFAULT_WINDOW,
      levels: DEFAULT_CHAIN,
      started: TODAY,
      createdOn: TODAY,
      closesOn: shiftDays(TODAY, DEFAULT_WINDOW),
      startMode,
      runAt: needsRunAt ? runAt : '',
      controls: [],
    })
  }

  return (
    <>
      <DetailHeader
        backTo="/iam/recertification"
        backLabel="Recertification"
        eyebrow="New campaign"
        title={name.trim() || 'Untitled certification campaign'}
        sub="Name it, choose who it attests to, and say when it starts. Items are collected the moment the campaign starts, and every recommendation is generated from live telemetry at that instant."
        badges={<><Pill tone="mut" dot>Draft</Pill><Tag>{DEFAULT_CHAIN.split(' → ').length} levels</Tag></>}
        meta={(
          <>
            <Fact icon="users" label="Audience" value={describeAudience(audience)} />
            <Fact icon="users" label="Identities" value={num(preview.identities)} />
            <Fact icon="inbox" label="Estimated items" value={num(preview.entitlements)} />
            <Fact icon="clock" label="Window" value={`${DEFAULT_WINDOW} days`} />
            <Fact icon="user" label="Auditor" value={auditor} />
          </>
        )}
      />

      <div className="detail-body">
        <div className="wizard">
          <div className="wiz-rail">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className="wiz-step"
                data-state={s.done ? 'done' : 'active'}
                onClick={() => goTo(s.id)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <span className="wiz-n">{s.done ? <Icon name="check" size={12} /> : s.n}</span>
                <span className="wiz-m" style={{ display: 'block' }}>
                  <span className="wiz-t">{s.title}</span>
                  <span className="wiz-s" style={{ display: 'block' }}>{s.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="wiz-body stack">
            <Card title="Definition" sub="What reviewers see when the campaign lands in their queue">
              <div id="sec-definition" className="grid grid-2">
                <Field label="Campaign name" required hint="Shown to every reviewer when the campaign lands in their queue." span={2} htmlFor="c-name">
                  <TextInput id="c-name" value={name} placeholder="Q4 2026 Finance Access Review" onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Description" hint="Explains the purpose to reviewers and auditors. Derived from the audience when left empty." span={2} htmlFor="c-desc">
                  <TextInput
                    id="c-desc"
                    as="textarea"
                    rows={3}
                    value={description}
                    placeholder="Quarterly attestation of finance entitlements ahead of the SOX sample."
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <Field label="Accountable auditor" required hint="Signs the attestation statement for this campaign." htmlFor="c-auditor">
                  <Select id="c-auditor" value={auditor} options={AUDITORS} onChange={(e) => setAuditor(e.target.value)} />
                </Field>
              </div>
            </Card>

            <Card
              title="User selection"
              sub="Which identities this campaign attests to"
            >
              <div id="sec-population">
                <AudiencePicker
                  idPrefix="c-aud"
                  label="Audience"
                  hint="A standing group, named people, or everyone matching a condition."
                  value={audience}
                  onChange={setAudience}
                />
              </div>
            </Card>

            <Card
              title="Schedule"
              sub="When the campaign opens and collects its population"
            >
              <div id="sec-schedule" className="grid grid-2">
                <Field label="Start" hint="Collection happens at the moment the campaign starts." htmlFor="c-start">
                  <Select
                    id="c-start"
                    value={startMode}
                    options={START_MODES}
                    onChange={(e) => {
                      setStartMode(e.target.value)
                      // A time typed against the scheduler run must not be
                      // carried into a mode that never reads it.
                      if (e.target.value !== START_MODES[1]) setRunAt('')
                    }}
                  />
                </Field>
                {/* Only asked when there is a run to name. An immediate start
                    collects now, so a date and time on it would describe
                    something that has already happened. */}
                {needsRunAt && (
                  <Field
                    label="Run at"
                    required
                    hint="The scheduler run that opens this campaign. Taken only on the next run — not used by an immediate start."
                    htmlFor="c-runat"
                  >
                    <TextInput
                      id="c-runat"
                      type="datetime-local"
                      value={runAt}
                      onChange={(e) => setRunAt(e.target.value)}
                    />
                  </Field>
                )}
              </div>
              <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
                <Icon name="info" size={15} />
                <div>
                  {startMode === START_MODES[0] && (
                    <>The campaign opens as soon as it is created and closes {DEFAULT_WINDOW} days later, routed through {DEFAULT_CHAIN.toLowerCase()}.</>
                  )}
                  {needsRunAt && (
                    <>Reviewers are notified when the run opens the campaign{runAt ? <> at <b className="mono">{runAt.replace('T', ' ')}</b></> : null}. It closes {DEFAULT_WINDOW} days later, routed through {DEFAULT_CHAIN.toLowerCase()}.</>
                  )}
                  {!needsRunAt && startMode !== START_MODES[0] && (
                    <>The campaign opens on <b className="mono">{monthStart}</b> and closes {DEFAULT_WINDOW} days later, routed through {DEFAULT_CHAIN.toLowerCase()}.</>
                  )}
                </div>
              </div>
            </Card>

            <Card
              title="Preview"
              sub="What this campaign generates the moment it starts"
              actions={<Pill tone={preview.entitlements > 0 ? 'ok' : 'warn'} dot>{preview.entitlements > 0 ? 'Ready' : 'Nothing in scope'}</Pill>}
            >
              <div id="sec-preview" className="stat-strip">
                <div className="stat-cell">
                  <span className="stat-k"><Icon name="users" size={12} />Identities</span>
                  <span className="stat-v">{num(preview.identities)}</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-k"><Icon name="inbox" size={12} />Items generated</span>
                  <span className="stat-v">{num(preview.entitlements)}</span>
                </div>
              </div>

              <div className="grid grid-2" style={{ marginTop: 14 }}>
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Reviewers engaged', v: num(preview.reviewers), icon: 'users' },
                    { k: 'Items per reviewer', v: num(preview.perReviewer), icon: 'inbox' },
                    { k: 'Estimated review effort', v: preview.effort, icon: 'clock' },
                  ]}
                />
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Opens', v: opensAt, icon: 'play' },
                    { k: 'Closes on', v: shiftDays(TODAY, DEFAULT_WINDOW).slice(0, 10), icon: 'calendar' },
                    { k: 'Reviewer chain', v: DEFAULT_CHAIN, icon: 'hierarchy' },
                  ]}
                />
              </div>

              <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
                <Icon name="bolt" size={15} />
                <div>
                  Recommendations are generated at collection time from last-use telemetry, the identity risk score and
                  open segregation-of-duties conflicts. Reviewers may override every recommendation, and each override
                  is recorded against the reviewer who made it.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        message={dirty ? `Draft · ${num(preview.entitlements)} items will be generated` : 'Nothing entered yet'}
      >
        <Button onClick={() => navigate('/iam/recertification')}>Cancel</Button>
        <Button variant="pri" icon="certify" onClick={create}>Create campaign</Button>
      </StickyActions>
    </>
  )
}
