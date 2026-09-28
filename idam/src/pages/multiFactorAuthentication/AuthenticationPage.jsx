import { useEffect, useMemo, useState } from 'react'
import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Meter from '../../components/primitives/Meter'
import PageBar from '../../components/shell/PageBar'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import {
  Skeleton, SkeletonCard, SkeletonLine, SkeletonPageBar, SkeletonStats, SkeletonText,
} from '../../components/primitives/Skeleton'
import { LOGS, MFA_METHODS } from '../../data/seed'
import { BASE_PATH, DIRECTORY, ENROLLED_BY_FACTOR, STRENGTH, fieldsOf, validateProvider } from './authData'
import { num, pct } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import './AuthenticationPage.css'
import MfaEnforcement from './MfaEnforcement'
import MethodConfig, { blankConfig } from './MethodConfig'
import ProviderPage from './ProviderPage'
import { CONSOLE_TABS, ENROLMENTS, FACTOR_NAME, GRACE_PERIODS, PROVIDERS, REAUTH_INTERVALS, RISK_RULES, SESSION_LIFETIMES, runProviderTest } from './mfaData'

/* ---------------------------------------------------------------------------
   The shapes this console holds its space with.

   A bar carries no text, so it sets no line box of its own. Where the real
   element takes its height from the type inside it — a figure strip, a factor
   name — the shape states the line box that type prints, because a strip that
   comes up short moves every tile under it when the numbers land. Everything
   else is drawn with the page's own rules, so the padding, the hairlines and
   the wrap behaviour are the ones that will still be there a frame later.
   --------------------------------------------------------------------------- */

/* `.stat-k` is --t-xs; `.stat-v` is 1.125rem on the inherited line height. */
const LINE_XS = 'calc(var(--t-xs) * var(--t-xs-lh))'
const LINE_STAT = 'calc(1.125rem * var(--t-body-lh))'
/* `.mfa-tile-name` is body type on a 1.3 line. */
const LINE_TILE_NAME = 'calc(var(--t-body) * 1.3)'

const bar = { display: 'block' }

/* The joined figure strip both tabs open with — the real `.stat-strip` rule,
   so the cell dividers and the wrap at narrow widths are the real ones. */
function SkeletonStatStrip({ cells = 4 }) {
  return (
    <div className="stat-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-k" style={{ minHeight: LINE_XS }}>
            <span className="skel" style={{ ...bar, width: 84 + (i % 3) * 20, height: 8 }} />
          </span>
          <span className="stat-v" style={{ minHeight: LINE_STAT, display: 'flex', alignItems: 'center' }}>
            <span className="skel" style={{ ...bar, width: 48, height: 15 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * One factor tile.
 *
 * `.mfa-tile-sub` already carries a 2.9em floor for the description, so two
 * lines of bars sit inside the height the real copy will take rather than
 * setting a shorter one. The footer states a small button's height because the
 * grid stretches every tile to the tallest in its row, and the tallest is the
 * one carrying a Configure button — a footer drawn to the caption alone would
 * let the whole row grow when it lands. Everything on this page is
 * `border-box`, and `.mfa-tile-foot` spends 10px of padding and a 1px hairline
 * before its content starts, so the button's height is stated on top of those
 * rather than as the whole box — otherwise the shape is 11px short of the
 * footer it is holding space for.
 */
const FOOT_MIN = 'calc(1.625rem + 10px + 1px)'

function SkeletonMethodTile() {
  return (
    <div className="mfa-tile" aria-hidden="true">
      <div className="mfa-tile-top">
        {/* Sized here rather than by borrowing `.mfa-tile-ic`: that rule is
            paired with `.feed-ic`, which sets a background `.skel` would then
            be fighting for the shimmer. */}
        <span className="skel" style={{ ...bar, width: 32, height: 32, borderRadius: 'var(--r-lg)', flex: 'none' }} />
        <span className="mfa-tile-badges">
          <span className="skel skel-chip" style={{ ...bar, width: 104 }} />
        </span>
      </div>
      <div className="mfa-tile-name" style={{ minHeight: LINE_TILE_NAME, display: 'flex', alignItems: 'center' }}>
        <span className="skel" style={{ ...bar, width: '62%', height: 11 }} />
      </div>
      <div className="mfa-tile-sub"><SkeletonText lines={2} /></div>
      <div className="mfa-tile-meter">
        <div className="row-between" style={{ minHeight: LINE_XS }}>
          <span className="skel" style={{ ...bar, width: 76, height: 8 }} />
          <span className="skel" style={{ ...bar, width: 32, height: 8 }} />
        </div>
        <span className="skel" style={{ ...bar, width: '100%', height: 5, borderRadius: 'var(--r-pill)' }} />
      </div>
      <div className="mfa-tile-foot" style={{ minHeight: FOOT_MIN }}>
        <span className="skel" style={{ ...bar, width: 96, height: 8 }} />
      </div>
    </div>
  )
}

/* One entry of the change log — `.tl` geometry, so the rail and the dots are
   drawn by the real rule rather than approximated with boxes. */
function SkeletonTimeline({ rows = 6 }) {
  return (
    <div className="tl" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="tl-it" key={i}>
          <span className="tl-dot" />
          <div className="tl-t" style={{ minHeight: LINE_XS }}>
            <span className="skel" style={{ ...bar, width: '38%', height: 10 }} />
          </div>
          {/* `.tl-s` and `.tl-time` carry their own top margins, so only the
              line box is stated here — setting the margin again would move the
              entry away from where the real one sits. */}
          <div className="tl-s" style={{ minHeight: LINE_XS }}>
            <span className="skel" style={{ ...bar, width: '56%', height: 8 }} />
          </div>
          <div className="tl-time" style={{ minHeight: LINE_XS }}>
            <span className="skel" style={{ ...bar, width: 168, height: 7 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The panel under the tab bar, while it settles.
 *
 * Each tab is a different shape, so each gets its own: the factor grid with a
 * tile per method, the change log's entries, or the enrollment figures. The
 * enrollment register is not drawn here — `DataWorkbench` holds its own body,
 * and it is handed the same flag.
 */
/* Said in the words the tab bar uses, so the announcement names the thing the
   operator has just clicked on. */
const PANEL_LABEL = {
  factors: 'Loading the factor list',
  enrollment: 'Loading factor enrollment',
  events: 'Loading recent factor events',
}

function PanelSkeleton({ tab, methods }) {
  if (tab === 'events') {
    return <SkeletonCard><SkeletonTimeline rows={6} /></SkeletonCard>
  }
  if (tab === 'enrollment') {
    return (
      <>
        <SkeletonStatStrip cells={4} />
        <SkeletonStats count={4} />
      </>
    )
  }
  return (
    <>
      <SkeletonStatStrip cells={5} />
      {/* The sentence under the strip, which is one line of body type. */}
      <SkeletonLine width="46%" height={9} />
      <div className="mfa-tilegrid">
        {methods.map((m) => <SkeletonMethodTile key={m.id} />)}
      </div>
    </>
  )
}

export default function AuthenticationPage({ segments = [] }) {
  const { toast, confirm, navigate, setDrawer } = useApp()
  // Exactly one enrolled method is primary: the one an identity is challenged
  // with first. Reported on the tiles rather than reassigned from them.
  const [methods, setMethods] = useState(() => MFA_METHODS.map((m, i) => ({
    ...m,
    // Enrolment is a fact about the directory, not about the method record.
    enrolled: ENROLLED_BY_FACTOR[m.id] ?? 0,
    primary: i === 0,
    config: blankConfig(m),
  })))
  const [methodProbe, setMethodProbe] = useState({})
  const [config, setConfig] = useState(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, { ...p.values }])))
  const [saved, setSaved] = useState(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, { ...p.values }])))
  const [results, setResults] = useState({})
  const [enrollments, setEnrollments] = useState(ENROLMENTS)
  const [policy, setPolicy] = useState({
    sessionLifetime: '8 hours',
    reauthInterval: 'Every 4 hours',
    enrollmentGrace: '7 days',
    rememberDevice: true,
    newDevice: true,
    impossibleTravel: true,
    legacyProtocols: false,
    untrustedNetwork: true,
    privilegedAlways: true,
  })
  const [policyDirty, setPolicyDirty] = useState(false)

  const enabled = methods.filter((m) => m.enabled)
  const primary = methods.find((m) => m.primary)

  const testMethod = (method, cfg) => {
    const at = new Date().toISOString().slice(11, 19)
    // A relay that authenticates without a credential, or talks in clear text
    // to a host that is not reachable, is the failure this test exists to find.
    const ok = !!String(cfg.host).trim() && (!cfg.auth || !!String(cfg.username).trim())
    const probe = {
      ok,
      at,
      detail: ok
        ? `${cfg.host}:${cfg.port} accepted the ${cfg.ssl ? 'SSL' : cfg.startTls ? 'StartTLS' : 'clear-text'} connection and delivered the test message.`
        : !String(cfg.host).trim()
          ? 'No host is configured, so there is nothing to connect to.'
          : 'Authentication is on but no username is set, so the relay rejected the session.',
    }
    setMethodProbe((p) => ({ ...p, [method.id]: probe }))
    toast(ok ? 'ok' : 'bad', ok ? 'Connection succeeded' : 'Connection failed', probe.detail)
    return probe
  }

  const openMethodConfig = (method) => {
    const ref = { current: blankConfig(method) }

    const render = () => setDrawer({
      title: `Configure ${method.name}`,
      sub: method.id === 'email'
        ? 'The SMTP connection one-time codes are delivered over.'
        : 'How the platform offers this factor at enrollment and at challenge.',
      children: (
        <MethodConfig
          method={method}
          value={ref.current}
          probe={methodProbe[method.id]}
          onChange={(next) => { ref.current = next; render() }}
          onTest={() => { testMethod(method, ref.current); render() }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="save"
            onClick={() => {
              setMethods((ms) => ms.map((m) => (m.id === method.id
                ? { ...m, config: { ...ref.current, password: '', savedPassword: !!ref.current.password || m.config.savedPassword } }
                : m)))
              setDrawer(null)
              toast('ok', 'Configuration saved', `${method.name} was updated.`)
            }}
          >
            Save configuration
          </Button>
        </>
      ),
    })

    render()
  }

  const addMethod = () => {
    const ref = { current: { name: '', sub: '', strength: 'strong', icon: 'shield' } }
    const render = () => setDrawer({
      title: 'Add authentication method',
      sub: 'A factor the platform offers at enrollment.',
      children: (
        <div className="stack">
          <Field label="Method name" required htmlFor="am-name">
            <TextInput
              id="am-name"
              value={ref.current.name}
              placeholder="Hardware token"
              onChange={(e) => { ref.current = { ...ref.current, name: e.target.value }; render() }}
            />
          </Field>
          <Field label="Description" hint="What the identity is asked to do." htmlFor="am-sub">
            <TextInput
              id="am-sub"
              value={ref.current.sub}
              placeholder="Enter the code shown on the token."
              onChange={(e) => { ref.current = { ...ref.current, sub: e.target.value }; render() }}
            />
          </Field>
          <Field label="Strength" hint="Drives step-up policy and the phishing-resistance figure." htmlFor="am-str">
            <Select
              id="am-str"
              value={ref.current.strength}
              options={[
                { value: 'strongest', label: 'Phishing-resistant' },
                { value: 'strong', label: 'Strong' },
                { value: 'weak', label: 'Weak' },
                { value: 'weakest', label: 'Weakest' },
              ]}
              onChange={(e) => { ref.current = { ...ref.current, strength: e.target.value }; render() }}
            />
          </Field>
        </div>
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="plus"
            disabled={!ref.current.name.trim()}
            onClick={() => {
              const d = ref.current
              const id = d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
              setMethods((ms) => [...ms, {
                id,
                name: d.name.trim(),
                sub: d.sub.trim() || 'Configured by an administrator.',
                strength: d.strength,
                icon: 'shield',
                enabled: false,
                enrolled: 0,
                primary: false,
                config: blankConfig(null),
              }])
              setDrawer(null)
              toast('ok', 'Method added', `${d.name.trim()} is registered. Enable it to offer it at enrollment.`)
            }}
          >
            Add method
          </Button>
        </>
      ),
    })
    render()
  }
  const resistant = methods.find((m) => m.strength === 'strongest')
  const resistantEnrolled = resistant ? resistant.enrolled : 0
  const phishingPct = (resistantEnrolled / DIRECTORY) * 100
  const gaps = DIRECTORY - resistantEnrolled

  const events = useMemo(() => LOGS.filter((l) => l.category === 'Authentication').slice(0, 9), [])

  // The bare route answers one question — is a second factor required — and the
  // deeper console (factors, providers, policy, enrolment) sits behind it.
  const enforcementOnly = segments.length === 0
  const providerSegment = segments[0] === 'providers' ? segments[1] : null

  const tab = CONSOLE_TABS.includes(segments[0]) ? segments[0] : 'factors'
  /* Which screen this module is showing, not which tab it would show if it were
     showing the console. `tab` alone cannot say: every segment that is not a
     console tab falls back to 'factors', so the bare enforcement route, the
     factors tab and a provider page all read as the same value. */
  const screen = providerSegment
    ? `p:${providerSegment}`
    : enforcementOnly ? 'enforcement' : tab
  /* One flag for the whole screen, keyed on the screen: the console settles on
     arrival and again when the panel under the tab bar changes, which is the
     round trip a real deployment would make. Every route this component owns
     reads the same flag — the enforcement screen is handed it rather than
     starting a second timer, because a page whose halves settle on their own
     clocks arrives in pieces. `App` keys its route boundary on the module id,
     which is 'mfa' for all of these, so this component is never remounted
     between them and the key is the only thing that can restart the wait. */
  const loading = useLoading(screen)
  /* The masthead is drawn once per masthead. A tab change settles the panel
     below it, but the crumbs, the title and the tab bar are the chrome the
     operator has just clicked on — blanking those would take away the control
     they used and put it back a moment later. So the header is held on arrival
     only, and arrival is a fact about a masthead rather than about this
     component: enforcement and the console are two pages sharing one module,
     with different titles, different crumbs and different actions, so one that
     has landed is not the other. The console's three tabs share theirs, which
     is why the surface is coarser than the settle key above. Adjusted during
     render rather than from an effect, so the effect below cannot read a stale
     `arrived` and hand the next page a settled one. */
  const surface = enforcementOnly ? 'enforcement' : 'console'
  const [arrived, setArrived] = useState(false)
  const [arrivedOn, setArrivedOn] = useState(surface)
  if (arrivedOn !== surface) {
    setArrivedOn(surface)
    setArrived(false)
  }
  useEffect(() => { if (!loading) setArrived(true) }, [loading])
  const settling = loading && !arrived

  const providersDirty = useMemo(
    () => PROVIDERS.some((p) => fieldsOf(p).some((f) => config[p.id][f.key] !== saved[p.id][f.key])),
    [config, saved],
  )

  const isEnabled = (p) => {
    const m = methods.find((x) => x.id === p.factor)
    return m ? m.enabled : false
  }

  const setValue = (providerId, key, value) => {
    setConfig((c) => ({ ...c, [providerId]: { ...c[providerId], [key]: value } }))
  }

  const toggleProviderFactor = (p, next) => {
    const m = methods.find((x) => x.id === p.factor)
    if (!m) return
    if (m.enabled && !next && enabled.length === 1) {
      toast('warn', 'At least one factor must stay enabled', `Disabling ${m.name} would leave the tenant with no way to satisfy a challenge.`)
      return
    }
    setMethods((ms) => ms.map((x) => (x.id === p.factor ? { ...x, enabled: next } : x)))
    toast(next ? 'ok' : 'warn', next ? 'Factor enabled' : 'Factor disabled', m.name)
  }

  const testProvider = (p) => {
    const result = runProviderTest(p, config[p.id])
    setResults((r) => ({ ...r, [p.id]: result }))
    toast(result.ok ? 'ok' : 'bad', result.title, result.detail)
  }

  const saveProviders = (only) => {
    const list = only ? [only] : PROVIDERS
    const blocked = list.map((p) => ({ p, problem: validateProvider(p, config[p.id]) })).filter((x) => x.problem)
    if (blocked.length > 0) {
      toast('bad', 'Configuration rejected', `${blocked[0].p.name}: ${blocked[0].problem.message}`)
      return
    }
    setSaved((s) => {
      const next = { ...s }
      list.forEach((p) => { next[p.id] = { ...config[p.id] } })
      return next
    })
    toast('ok', 'Provider configuration saved', only
      ? `${only.name} is live for every new enrollment and challenge.`
      : `${list.length} provider configurations were published to every authentication node.`)
  }

  const revertProviders = (only) => {
    const list = only ? [only] : PROVIDERS
    setConfig((c) => {
      const next = { ...c }
      list.forEach((p) => { next[p.id] = { ...saved[p.id] } })
      return next
    })
    toast('info', 'Changes discarded', 'The form was returned to the published configuration.')
  }

  const setPolicyField = (key, value) => {
    setPolicy((p) => ({ ...p, [key]: value }))
    setPolicyDirty(true)
  }

  const resetFactors = (ids, label) => {
    const set = new Set(ids.map(String))
    setEnrollments((es) => es.map((e) => (set.has(String(e.id))
      ? { ...e, factors: [], primary: null, primaryLabel: 'Not enrolled', devices: 0, resets: e.resets + 1 }
      : e)))
    toast('warn', 'Factors reset', `${ids.length} ${ids.length === 1 ? 'identity' : 'identities'} must re-enrol at the next sign-in. ${label}`)
  }

  const confirmReset = (ids, clear) => confirm({
    title: ids.length === 1 ? 'Reset every factor for this identity?' : `Reset every factor for ${ids.length} identities?`,
    body: 'All enrolled factors and remembered devices are removed. Each identity must re-enrol at the next sign-in using a single-use enrollment link.',
    confirmLabel: `Reset ${ids.length}`,
    onConfirm: () => { resetFactors(ids, 'An enrollment link has been mailed.'); if (clear) clear() },
  })

  if (providerSegment) {
    const provider = PROVIDERS.find((p) => p.id === providerSegment)
    if (!provider) {
      return (
        <>
          <PageBar
            title="Provider not found"
            sub="No authentication provider is registered under that identifier."
            crumbs={[{ label: 'Multi-Factor Authentication', to: BASE_PATH }, { label: 'Factors', to: `${BASE_PATH}/factors` }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="shield"
            title="Unknown provider"
            body="Registered providers are TOTP, SMS, email, passkey and push."
            actions={<Button variant="pri" iconRight="chevR" onClick={() => navigate(`${BASE_PATH}/factors`)}>Back to factors</Button>}
          />
        </>
      )
    }
    const dirty = fieldsOf(provider).some((f) => config[provider.id][f.key] !== saved[provider.id][f.key])
    /* Delivery health reads every other provider, not just this one, and a
       factor's enabled state lives up here on `methods` rather than on the
       provider record. Without the whole map the health tab reads every other
       provider as withdrawn from enrollment and reports "all healthy" whatever
       the figures say, which is the one answer that screen must never give. */
    const factorEnabled = Object.fromEntries(PROVIDERS.map((x) => [x.id, isEnabled(x)]))
    return (
      <ProviderPage
        provider={provider}
        values={config[provider.id]}
        enabled={isEnabled(provider)}
        factorEnabled={factorEnabled}
        dirty={dirty}
        result={results[provider.id]}
        onChange={(k, v) => setValue(provider.id, k, v)}
        onToggle={(next) => toggleProviderFactor(provider, next)}
        onTest={() => testProvider(provider)}
        onSave={() => { saveProviders(provider); navigate(`${BASE_PATH}/factors`) }}
        onCancel={() => { revertProviders(provider); navigate(`${BASE_PATH}/factors`) }}
      />
    )
  }

  if (enforcementOnly) return <MfaEnforcement methods={methods} loading={settling} />

  const goTab = (id) => navigate(`${BASE_PATH}/${id}`)

  const enrolStats = {
    enrolled: enrollments.filter((e) => e.factors.length > 0).length,
    none: enrollments.filter((e) => e.factors.length === 0).length,
    passkey: enrollments.filter((e) => e.factors.includes('passkey')).length,
    smsOnly: enrollments.filter((e) => e.factors.includes('sms') && !e.factors.includes('passkey')).length,
  }

  const enrolColumns = [
    {
      key: 'username', label: 'Username', locked: true, cls: 'td-main',
      value: (e) => `${e.username} ${e.email}`,
      render: (e) => (
        <span className="cell-id">
          <Avatar first={e.firstName} last={e.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{e.username}</span>
            <span className="cell-sub">{e.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'organization', label: 'Organization' },
    {
      key: 'factors', label: 'Factors held', sortable: false,
      render: (e) => (e.factors.length === 0
        ? <Pill tone="warn" dot>Not enrolled</Pill>
        : (
          <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {e.factors.map((f) => (
              <Tag key={f} tone={f === 'passkey' ? 'acc' : undefined}>{FACTOR_NAME[f]}</Tag>
            ))}
          </span>
        )),
    },
    { key: 'primaryLabel', label: 'Primary' },
    { key: 'devices', label: 'Devices', align: 'right', render: (e) => <span className="num">{e.devices}</span> },
    { key: 'challenges30d', label: 'Challenges 30d', align: 'right', render: (e) => <span className="num">{num(e.challenges30d)}</span> },
    {
      key: 'failures30d', label: 'Failed', align: 'right',
      render: (e) => <span className="num" style={{ color: e.failures30d > 5 ? 'var(--warn)' : undefined }}>{e.failures30d}</span>,
    },
    { key: 'lastChallenge', label: 'Last challenge', cls: 'td-mono' },
    { key: 'resets', label: 'Resets', align: 'right', render: (e) => <span className="num">{e.resets}</span> },
  ]

  const enrolRowActions = (e) => [
    { id: 'user', label: 'Open identity', icon: 'user', onSelect: () => navigate('/iam/users') },
    { divider: true },
    { label: 'Reset a single factor', header: true },
    ...(e.factors.length === 0
      ? [{ id: 'nofactors', label: 'No factors enrolled', icon: 'ban', disabled: true }]
      : e.factors.map((f) => ({
        id: `reset-${f}`,
        label: `Reset ${FACTOR_NAME[f]}`,
        icon: 'refresh',
        onSelect: () => {
          setEnrollments((es) => es.map((x) => {
            if (x.id !== e.id) return x
            const factors = x.factors.filter((k) => k !== f)
            const primary = factors[0] || null
            return { ...x, factors, primary, primaryLabel: primary ? FACTOR_NAME[primary] : 'Not enrolled', resets: x.resets + 1 }
          }))
          toast('warn', 'Factor reset', `${FACTOR_NAME[f]} was removed from ${e.username}.`)
        },
      }))),
    { divider: true },
    { id: 'reset-all', label: 'Reset all factors', icon: 'shield', danger: true, disabled: e.factors.length === 0, onSelect: () => confirmReset([e.id]) },
  ]

  const enrolBulk = (ids, clear) => (
    <>
      <Button size="sm" icon="shield" variant="danger" onClick={() => confirmReset(ids, clear)}>Reset all factors</Button>
      <Button
        size="sm"
        icon="mail"
        onClick={() => { toast('ok', 'Enrollment mailed', `${ids.length} single-use enrollment links were queued.`); clear() }}
      >
        Send enrollment link
      </Button>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} enrollment records queued for CSV export.`)}>Export</Button>
    </>
  )

  return (
    <>
      {/* The masthead is held on the first arrival only. A tab change settles
          the panel below, but the crumbs and the title did not change and
          blanking them would make the whole page flash for a switch that moved
          one region. */}
      {settling && <SkeletonPageBar actions={1} crumbs={2} />}

      {!settling && (
        <PageBar
          title="MFA Configuration"
          sub="Which factors identities may enrol, how each provider is configured, how long a session survives, and when the platform demands another challenge."
          crumbs={[{ label: 'Core' }, { label: 'Multi-Factor Authentication' }]}
          badge={<Pill tone={phishingPct >= 70 ? 'ok' : 'warn'} dot>{pct(phishingPct)} phishing-resistant</Pill>}
          /* "Publish changes" published the provider and policy drafts, and both
             are gone. Every control left on this page writes when it is used. */
          actions={
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Factor enrollment report is being generated.')}>Enrollment report</Button>
          }
        />
      )}

      <div className="stack">
        <Tabs
          value={tab}
          onChange={goTab}
          tabs={[
            { id: 'factors', label: 'Factors', icon: 'shield', count: methods.length },
            { id: 'enrollment', label: 'Enrollment', icon: 'users', count: enrolStats.none },
            { id: 'events', label: 'Recent events', icon: 'activity', count: events.length },
          ]}
        />

        {/* The tab bar above is chrome and stays; what settles is the panel it
            switches. One announcing region for the swap — every shape inside
            it, and the register's own body below, is decoration. */}
        {loading && (
          <Skeleton label={PANEL_LABEL[tab]}>
            <div className="stack">
              <PanelSkeleton tab={tab} methods={methods} />
            </div>
          </Skeleton>
        )}

        {!loading && tab === 'factors' && (
          <>
            <div className="stat-strip">
              <div className="stat-cell" data-nav="true" onClick={() => navigate('/iam/users')}>
                <span className="stat-k"><Icon name="users" size={12} />Enrolled identities</span>
                <span className="stat-v">{num(DIRECTORY)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="shield" size={12} />Phishing-resistant</span>
                <span className="stat-v">{pct(phishingPct)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="key" size={12} />Factors enabled</span>
                <span className="stat-v">{enabled.length} of {methods.length}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="sliders" size={12} />Providers configured</span>
                <span className="stat-v">{PROVIDERS.length}</span>
              </div>
              <div className="stat-cell" data-nav="true" onClick={() => navigate('/iam/users')}>
                <span className="stat-k"><Icon name="warn" size={12} />Without a strong factor</span>
                <span className="stat-v" style={{ color: gaps > 0 ? 'var(--warn)' : undefined }}>{num(gaps)}</span>
              </div>
            </div>

            {/* The factor set is what the platform implements, not a list a
                tenant extends: a method nobody has written a challenge for
                cannot be offered at enrollment. Each one is enabled, disabled
                and configured in place below. */}
            <div className="t-sm t-mut" style={{ marginTop: 4 }}>
              {enabled.length} of {methods.length} factors are offered at enrollment.
              {primary
                ? <> <b>{primary.name}</b> is challenged first.</>
                : <> No primary factor is set — identities are challenged in list order.</>}
            </div>

            {Object.entries(methodProbe).some(([, p]) => p && !p.ok) && (
              <Banner tone="bad">
                One or more factors failed their last connection test. Enforcement will challenge identities with a
                factor the platform cannot deliver — fix the connection, or disable the factor, before relying on it.
              </Banner>
            )}

            <div className="mfa-tilegrid">
              {methods.map((m) => {
                const strength = STRENGTH[m.strength] || STRENGTH.weak
                const share = (m.enrolled / DIRECTORY) * 100
                const provider = PROVIDERS.find((p) => p.factor === m.id)
                return (
                  <div className="mfa-tile" key={m.id} data-off={!m.enabled || undefined}>
                    <div className="mfa-tile-top">
                      <span className="feed-ic mfa-tile-ic" data-tone={m.enabled ? strength.tone : 'mut'}>
                        <Icon name={m.icon} size={15} />
                      </span>
                      <span className="mfa-tile-badges">
                        <Pill tone={m.enabled ? strength.tone : 'mut'} dot>{strength.label}</Pill>
                        {m.primary && <Pill tone="acc">Primary</Pill>}
                      </span>
                    </div>
                    <div className="mfa-tile-name">{m.name}</div>
                    <div className="mfa-tile-sub">{m.sub}</div>
                    <div className="mfa-tile-meter">
                      <div className="row-between">
                        <span className="t-xs t-mut num">{num(m.enrolled)} enrolled</span>
                        <span className="t-xs num" style={{ fontWeight: 600 }}>{pct(share)}</span>
                      </div>
                      <Meter value={share} tone={m.enabled ? strength.tone : undefined} />
                    </div>
                    <div className="mfa-tile-foot">
                      <span className="t-xs t-mut trunc">{m.enabled ? provider ? provider.vendor : 'Built-in' : 'Not offered at enrollment'}</span>
                      {/* Email is the only factor the platform delivers itself, so it is the
                          only one with a connection to configure from here. */}
                      {m.id === 'email' && (
                        <Button size="sm" icon="sliders" onClick={() => openMethodConfig(m)}>Configure</Button>
                      )}
                    </div>
                    {methodProbe[m.id] && !methodProbe[m.id].ok && (
                      <div className="banner" data-tone="bad" style={{ marginTop: 10 }}>
                        <Icon name="warn" size={14} />
                        <div className="t-xs">
                          The last connection test failed. Codes for this factor will not be delivered until it is fixed.
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

          </>
        )}

        {/* Recent activity was the tail of the Factors tab, which made a
            page about eight factors run for two screens. It is its own tab
            now, beside Factors and Enrollment. */}
        {!loading && tab === 'events' && (
          <Card
            title="Recent factor events"
            sub="Authentication-category entries from the control-plane log"
            actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('/iam/syslogs')}>Audit log</Button>}
            footer={
              <>
                <Icon name="info" size={12} />
                <span>{num(gaps)} identities hold no phishing-resistant factor</span>
                <span className="spacer" />
                <button className="link" onClick={() => navigate('/iam/users')}>Review gaps<Icon name="chevR" size={10} /></button>
              </>
            }
          >
            {events.length === 0 ? (
              <EmptyState
                icon="shield"
                title="No authentication events"
                body="Factor enrollments, resets and challenges will appear here as they are recorded."
              />
            ) : (
              <div className="tl">
                {events.map((e) => (
                  <div
                    className="tl-it"
                    key={e.id}
                    data-tone={e.outcome === 'Denied' || e.level === 'ERROR' ? 'bad' : e.level === 'WARN' ? 'warn' : 'acc'}
                  >
                    <span className="tl-dot">
                      <Icon name={e.outcome === 'Denied' ? 'ban' : 'check'} size={8} stroke={3} />
                    </span>
                    <div className="tl-t">{e.action}</div>
                    <div className="tl-s">{e.actor} · {e.target}</div>
                    <div className="tl-time">{e.ts} · {e.ip} · {e.outcome}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab === 'enrollment' && (
          <>
            {/* The figures above the register are held, but the register keeps
                its toolbar, its search and its pager and settles its own body:
                the controls an operator reaches for should not vanish and come
                back a moment later. */}
            {!loading && (
              <>
                <div className="stat-strip">
                  <div className="stat-cell">
                    <span className="stat-k"><Icon name="users" size={12} />Enrolled</span>
                    <span className="stat-v">{num(enrolStats.enrolled)}</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-k"><Icon name="key" size={12} />Hold a passkey</span>
                    <span className="stat-v">{num(enrolStats.passkey)}</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-k"><Icon name="sms" size={12} />SMS without a passkey</span>
                    <span className="stat-v">{num(enrolStats.smsOnly)}</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-k"><Icon name="warn" size={12} />Not enrolled</span>
                    <span className="stat-v" style={{ color: enrolStats.none > 0 ? 'var(--warn)' : undefined }}>{num(enrolStats.none)}</span>
                  </div>
                </div>

                <StatCards
                  items={[
                    { key: 'enrolled', icon: 'users', label: 'Enrolled identities', value: DIRECTORY, chip: `${enabled.length} of ${methods.length} factors on`, sub: 'holding at least one factor' },
                    { key: 'strong', icon: 'shield', label: 'Strong factor', value: resistantEnrolled, chip: 'phishing-resistant', chipTone: 'ok', sub: 'passkey or hardware token' },
                    { key: 'gaps', icon: 'warn', label: 'Without a strong factor', value: gaps, chip: gaps ? 'weaker methods only' : 'none', chipTone: gaps ? 'warn' : undefined, sub: 'code or push only' },
                    { key: 'providers', icon: 'sliders', label: 'Providers', value: PROVIDERS.length, chip: 'configured', sub: 'delivering the factors' },
                  ]}
                  label="Authentication summary"
                />
              </>
            )}

            <DataWorkbench
              id="mfa-enrollment"
              rows={enrollments}
              loading={loading}
              columns={enrolColumns}
              selectable
              searchPlaceholder="Search by username, email or organization…"
              bulkActions={enrolBulk}
              rowActions={enrolRowActions}
              toolbar={
                <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', 'Every enrollment record is being written to CSV.')}>Export</Button>
              }
              emptyTitle="No identities match"
              emptyBody="Adjust the search to widen the result set."
              emptyIcon="users"
              footNote="Enrollment state synchronized with the directory 6 minutes ago"
            />
          </>
        )}
      </div>
    </>
  )
}
