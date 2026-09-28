import './DirectoryPage.css'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm, SkeletonKeyValue, SkeletonTable,
} from '../../components/primitives/Skeleton'
import { SkeletonRecordTabs } from '../organizations/OrganizationsSkeleton'

/**
 * The shapes the identity record holds its space with.
 *
 * The register got its skeletons; the record did not, and a record is where the
 * absence shows worst — General details, Account health and every panel beside
 * them were simply not there for a beat and then were, which reads as a fault
 * rather than as a wait.
 *
 * Almost nothing here is a kit shape. The record is built from rules of its own
 * — `.idu-kpis`, the `StatRow` band, `.apptile`, `.tl`, `.feed-it`, `.cns-card`
 * — so the shapes are built from those same classes and only the type inside
 * them is replaced by a bar. Where a real panel prints text, the bar standing in
 * for it states the line box that type sets: a bar has no text in it to set one,
 * and a column of them that ignores this comes up short everywhere at once.
 *
 * Counts are passed in rather than guessed at. The record has its rows in hand
 * before it draws a shape for them, and a shape built on a guess at how many are
 * coming is the jump it was added to remove.
 *
 * Each export wraps itself in `Skeleton`. Composed together the outer region
 * announces and the inner one falls silent, which is how the whole record can be
 * built out of the same pieces the panel alone is built from.
 */

const bar = { display: 'block' }
const line = (h) => ({ minHeight: h, display: 'flex', alignItems: 'center' })

/* `.idu-kpi`: a --t-xs caption, a 1.125rem figure at 1.2, a --t-xs detail. */
const KPI_K = 'calc(var(--t-xs) * var(--t-body-lh))'
const KPI_V = 'calc(1.125rem * 1.2)'
/* `.stat-cell`: --t-xs over a 1.125rem figure, both on the body line height. */
const STAT_K = 'calc(var(--t-xs) * var(--t-body-lh))'
const STAT_V = 'calc(1.125rem * var(--t-body-lh))'
/* A `StatRow` prints `.t-sm` on both sides; the ones carrying a `Pill` are the
   pill's own 1.25rem instead. */
const ROW_T = 'calc(var(--t-sm) * var(--t-sm-lh))'
/* `.tl-t` / `.tl-s` / `.tl-time`, and `.feed-t` / `.feed-s`. */
const TL_T = 'calc(var(--t-sm) * var(--t-body-lh))'
const TL_S = 'calc(var(--t-xs) * 1.5)'
const TL_TIME = 'calc(var(--t-xs) * var(--t-body-lh))'
const FEED_T = 'calc(var(--t-sm) * 1.45)'
const FEED_S = 'calc(var(--t-xs) * var(--t-body-lh))'
/* `.apptile-name` is --t-body at 1.3 over an --t-xs sub-line. */
const APP_NAME = 'calc(var(--t-body) * 1.3)'
const APP_SUB = 'calc(var(--t-xs) * var(--t-body-lh))'
/* `.scard` without a chip line — the consent summary prints only two. */
const SC_K = 'calc(var(--t-micro) * var(--t-body-lh))'
const SC_V = 'calc(1.625rem * 1.1)'
/* `.cns-card-name` is --t-h3; the fact row under it is --t-xs. */
const CNS_T = 'calc(var(--t-h3) * var(--t-body-lh))'
const CNS_F = 'calc(var(--t-xs) * var(--t-body-lh))'
/* `.wiz-t` over `.wiz-s`, in the editor's section rail. */
const WIZ_T = 'calc(var(--t-sm) * var(--t-body-lh))'
const WIZ_S = 'calc(var(--t-xs) * 1.45)'
/* A collapsed `AccordionCard` prints its summary as one line of `.t-sm`. */
const ACC_SUM = 'calc(var(--t-sm) * var(--t-sm-lh))'

/** The six joined figures the record opens with — `.idu-kpis` geometry. */
function Kpis({ cells = 6 }) {
  return (
    <div className="idu-kpis" data-skel="true" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="idu-kpi" key={i}>
          <span className="idu-kpi-k" style={line(KPI_K)}>
            <span className="skel" style={{ ...bar, width: 58 + (i % 3) * 18, height: 8 }} />
          </span>
          <span className="idu-kpi-v" style={line(KPI_V)}>
            <span className="skel" style={{ ...bar, width: 30 + (i % 2) * 14, height: 14 }} />
          </span>
          <span className="idu-kpi-s" style={line(KPI_K)}>
            <span className="skel" style={{ ...bar, width: `${56 + (i % 4) * 11}%`, height: 7 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * A block of `StatRow`s — the rule IdentityDetail states inline for them, so
 * the two cannot drift: 7px gutters over a hairline, with the last row of a
 * block carrying no rule at all.
 *
 * `pills` is how many of the leading rows answer with a `Pill` rather than a
 * figure. A pill is 1.25rem and a line of --t-sm is not, so a block that drew
 * every row the same height would come up short by exactly those rows.
 */
function StatRows({ rows = 6, pills = 0, foot = true }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="row-between" key={i} style={{ padding: '7px 0', borderBottom: '1px solid var(--hair)' }}>
          <span style={line(ROW_T)}>
            <span className="skel" style={{ ...bar, width: 92 + (i % 3) * 24, height: 8 }} />
          </span>
          {i < pills ? (
            <span className="skel" style={{ width: 78, height: '1.25rem', borderRadius: 'var(--r-xs)' }} />
          ) : (
            <span style={line(ROW_T)}>
              <span className="skel" style={{ ...bar, width: 48 + (i % 2) * 18, height: 8 }} />
            </span>
          )}
        </div>
      ))}
      {foot && (
        <div className="row-between" style={{ padding: '7px 0' }}>
          <span style={line(ROW_T)}>
            <span className="skel" style={{ ...bar, width: 108, height: 8 }} />
          </span>
          <span style={line(ROW_T)}>
            <span className="skel" style={{ ...bar, width: 24, height: 8 }} />
          </span>
        </div>
      )}
    </div>
  )
}

/* The three joined counters in the Governance card. `.stat-strip` is given the
   same `border:none` the real one is: inside a card it would otherwise draw a
   second frame a few pixels inside the card's own. */
function Counters({ cells = 3 }) {
  return (
    <div className="stat-strip" style={{ border: 'none' }} aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-k" style={line(STAT_K)}>
            <span className="skel" style={{ ...bar, width: 62 + (i % 3) * 14, height: 8 }} />
          </span>
          <span className="stat-v" style={line(STAT_V)}>
            <span className="skel" style={{ ...bar, width: 22, height: 14 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/* A card's own filter bar — `.idu-toolbar` geometry. The search in it is drawn
   as a shape rather than left live: the card arrives whole, and a crisp input
   sitting above a grey table would land the panel in two pieces. */
function Toolbar({ selects = 1, inset }) {
  return (
    <div className="idu-toolbar" data-inset={inset ? 'true' : undefined} aria-hidden="true">
      <span className="skel" style={{ flex: '1 1 170px', maxWidth: 290, height: 28, borderRadius: 'var(--r-sm)' }} />
      {Array.from({ length: selects }, (_, i) => (
        <span key={i} className="skel" style={{ width: 150 + (i % 2) * 34, height: 28, borderRadius: 'var(--r-sm)' }} />
      ))}
      <span className="skel" style={{ marginLeft: 'auto', width: 52, height: 8 }} />
    </div>
  )
}

/**
 * A `.tbl` inside its scroller.
 *
 * `stacked` is the first column printing a name over a sub-line, which most of
 * the record's tables do; it is a taller row than the flat `--row-h` the rest
 * are, and the difference is stated in DirectoryPage.css rather than here.
 */
function Table({ rows = 6, cols = 6, stacked }) {
  return (
    <div className="idu-skel-tbl" data-stacked={stacked ? 'true' : undefined}>
      <SkeletonTable rows={Math.max(1, rows)} cols={cols} />
    </div>
  )
}

/** A timeline of `rows` entries — `.tl` / `.tl-it` geometry. */
function Timeline({ rows = 6 }) {
  return (
    <div className="tl" aria-hidden="true">
      {Array.from({ length: Math.max(1, rows) }, (_, i) => (
        <div className="tl-it" key={i}>
          <span className="skel tl-dot" />
          <div className="tl-t" style={line(TL_T)}>
            <span className="skel" style={{ ...bar, width: `${42 + (i % 4) * 14}%`, height: 9 }} />
          </div>
          <div className="tl-s" style={line(TL_S)}>
            <span className="skel" style={{ ...bar, width: `${56 + (i % 3) * 13}%`, height: 8 }} />
          </div>
          <div className="tl-time" style={line(TL_TIME)}>
            <span className="skel" style={{ ...bar, width: 164 + (i % 3) * 24, height: 7 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A feed of `rows` entries — `.feed-it` geometry, inside the card's gutters. */
function Feed({ rows = 3 }) {
  return (
    <div style={{ padding: 'var(--sp-4)' }} aria-hidden="true">
      {Array.from({ length: Math.max(1, rows) }, (_, i) => (
        <div className="feed-it" key={i}>
          <span className="skel feed-ic" />
          <div className="feed-m">
            <div className="feed-t" style={line(FEED_T)}>
              <span className="skel" style={{ ...bar, width: `${48 + (i % 3) * 15}%`, height: 9 }} />
            </div>
            <div className="feed-s" style={line(FEED_S)}>
              <span className="skel" style={{ ...bar, width: `${62 - (i % 3) * 9}%`, height: 8 }} />
            </div>
          </div>
          <span className="feed-time" style={line(FEED_S)}>
            <span className="skel" style={{ ...bar, width: 62, height: 7 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/** The reachable-application grid — `.appgrid` / `.apptile` geometry. */
function AppTiles({ count = 6 }) {
  return (
    <div className="appgrid" aria-hidden="true">
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <div className="apptile" key={i}>
          <div className="apptile-main">
            <span className="skel" style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)' }} />
            <div style={{ width: '100%', minWidth: 0 }}>
              <div className="apptile-name" style={line(APP_NAME)}>
                <span className="skel" style={{ ...bar, width: `${50 + (i % 3) * 15}%`, height: 9 }} />
              </div>
              <div className="apptile-sub" style={line(APP_SUB)}>
                <span className="skel" style={{ ...bar, width: `${68 - (i % 3) * 11}%`, height: 8 }} />
              </div>
            </div>
          </div>
          <div className="apptile-foot">
            <span className="skel" style={{ width: 56, height: '1.1875rem', borderRadius: 'var(--r-xs)' }} />
            <span className="skel" style={{ width: 58, height: 7 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* The banner the consent tab always prints. Only this one is drawn: the others
   on the record are conditional — a segregation-of-duties breach, a failed
   connector — and space held for a banner that never arrives moves the panel up
   the moment the record lands, which is the fault this is here to prevent. */
function BannerShape({ tone = 'info', lines = 2 }) {
  return (
    <div className="banner" data-tone={tone} aria-hidden="true">
      <span className="skel" style={{ width: 15, height: 15, borderRadius: 'var(--r-xs)' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="skel" style={{ ...bar, width: i === lines - 1 ? '62%' : '100%', height: 8 }} />
        ))}
      </div>
    </div>
  )
}

/* The consent summary. `StatCards` prints its footer line empty when a card
   carries neither chip nor caption, which every card in this panel does — so
   the shape is two lines, not the kit's three. */
function ConsentStats({ cells = 6 }) {
  return (
    <div className="scards" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="scard" data-static="true" key={i}>
          <span className="scard-k" style={line(SC_K)}>
            <span className="skel" style={{ ...bar, width: 52 + (i % 3) * 18, height: 7 }} />
          </span>
          <span className="scard-v" style={line(SC_V)}>
            <span className="skel" style={{ ...bar, width: 32, height: 18 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/** One consent notice per row — `.cns-card` geometry. */
function ConsentCards({ rows = 4 }) {
  return (
    <>
      <div className="cns-bar" aria-hidden="true">
        <span className="skel" style={{ width: 430, maxWidth: '100%', height: '1.8125rem', borderRadius: 'var(--r-sm)' }} />
        <span className="spacer" />
        <span className="skel" style={{ width: 216, height: 8 }} />
      </div>
      <div className="cns-list" aria-hidden="true">
        {Array.from({ length: Math.max(1, rows) }, (_, i) => (
          <article className="cns-card" key={i}>
            <div className="cns-card-m">
              <div className="cns-card-top" style={line(CNS_T)}>
                <span className="skel" style={{ width: 148 + (i % 3) * 26, height: 10 }} />
                <span className="skel" style={{ width: 72, height: '1.25rem', borderRadius: 'var(--r-xs)' }} />
                <span className="skel" style={{ width: 64, height: '1.1875rem', borderRadius: 'var(--r-xs)' }} />
                <span className="skel" style={{ width: 38, height: 8 }} />
              </div>
              <div className="cns-card-f" style={line(CNS_F)}>
                <span className="skel" style={{ width: 138, height: 8 }} />
                <span className="skel" style={{ width: 154, height: 8 }} />
                <span className="skel" style={{ width: 118, height: 8 }} />
              </div>
            </div>
            <div className="cns-card-a">
              <span className="skel skel-btn" style={{ width: 30 }} />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

/**
 * A closed `AccordionCard` — the card header over a single line of summary in
 * the body. Every section but the first opens closed, and a shape that drew
 * them as open field grids stood hundreds of pixels taller than the form that
 * lands underneath it.
 */
function CollapsedCard() {
  return (
    <SkeletonCard>
      <span style={line(ACC_SUM)}>
        <span className="skel" style={{ ...bar, width: '68%', height: 8 }} />
      </span>
    </SkeletonCard>
  )
}

/** The editor's section rail — `.wiz-rail` / `.wiz-step` geometry. */
function Rail({ steps = 5 }) {
  return (
    <nav className="wiz-rail" aria-hidden="true">
      {Array.from({ length: steps }, (_, i) => (
        <div className="wiz-step" key={i}>
          <span className="skel wiz-n" />
          <span className="wiz-m" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={line(WIZ_T)}>
              <span className="skel" style={{ ...bar, width: 98 + (i % 3) * 24, height: 9 }} />
            </span>
            <span style={{ ...line(WIZ_S), marginTop: 1 }}>
              <span className="skel" style={{ ...bar, width: 136 - (i % 3) * 20, height: 7 }} />
            </span>
          </span>
        </div>
      ))}
    </nav>
  )
}

const PANEL_LABEL = {
  overview: 'the identity overview',
  access: 'the entitlements held',
  apps: 'the reachable applications',
  activity: 'the activity on this identity',
  credentials: 'the credentials and sessions',
  consent: 'the consent record',
  audit: 'the audit trail',
}

/* What each tab waits behind. The shapes are the panel's own: the overview is a
   column of attribute sections beside the health and governance rail, and the
   rest are the cards that tab actually prints, in the order it prints them. */
function Panel({ tab, shape }) {
  const {
    sections = [6, 6, 4], entitlements = 6, accounts = 4, apps = 6, events = 10, requests = 2,
    factors = 2, devices = 2, sessions = 1, audit = 4, recerts = 3, certItems = 2, consents = 4,
  } = shape

  if (tab === 'access') {
    return (
      <div className="stack">
        <SkeletonCard className="idu-skel-flush" foot>
          <Toolbar selects={2} />
          <Table rows={entitlements} cols={8} stacked />
        </SkeletonCard>
        <SkeletonCard className="idu-skel-flush">
          <Table rows={accounts} cols={9} stacked />
        </SkeletonCard>
      </div>
    )
  }

  if (tab === 'apps') {
    return (
      <SkeletonCard className="idu-skel-flush" foot>
        <Toolbar selects={1} />
        <AppTiles count={apps} />
      </SkeletonCard>
    )
  }

  if (tab === 'activity') {
    return (
      <div className="detail-cols">
        <SkeletonCard>
          <div style={{ margin: '0 0 12px' }}><Toolbar selects={1} inset /></div>
          <Timeline rows={events} />
        </SkeletonCard>
        <div className="stack">
          <SkeletonCard className="idu-skel-flush"><Feed rows={requests} /></SkeletonCard>
          <SkeletonCard><StatRows rows={3} /></SkeletonCard>
        </div>
      </div>
    )
  }

  if (tab === 'credentials') {
    return (
      <div className="stack">
        <SkeletonCard className="idu-skel-flush">
          <Table rows={factors} cols={6} stacked />
        </SkeletonCard>
        <div className="grid grid-2">
          <SkeletonCard className="idu-skel-flush">
            <Table rows={devices} cols={4} stacked />
          </SkeletonCard>
          <SkeletonCard className="idu-skel-flush">
            <Table rows={sessions} cols={4} stacked />
          </SkeletonCard>
        </div>
      </div>
    )
  }

  if (tab === 'consent') {
    return (
      <div className="stack">
        <BannerShape lines={2} />
        <div className="stack cns-panel">
          <ConsentStats cells={6} />
          <ConsentCards rows={consents} />
        </div>
      </div>
    )
  }

  if (tab === 'audit') {
    return (
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><Timeline rows={audit} /></SkeletonCard>
          <SkeletonCard className="idu-skel-flush">
            <Table rows={recerts} cols={6} />
          </SkeletonCard>
        </div>
        <div className="stack">
          {/* Provenance is nine fields in one column, on every identity. */}
          <SkeletonCard><SkeletonKeyValue rows={9} cols={1} /></SkeletonCard>
          <SkeletonCard className="idu-skel-flush"><Feed rows={certItems} /></SkeletonCard>
        </div>
      </div>
    )
  }

  /* Overview. The left column is one card per schema section, each holding the
     field grid for exactly the attributes that section shows — the card the
     client was watching appear out of nothing. The rail beside it is the health
     band and the three governance counters. */
  return (
    <div className="detail-cols">
      <div className="stack">
        {sections.map((count, i) => (
          <SkeletonCard key={i}>
            <SkeletonKeyValue rows={count} cols={2} />
          </SkeletonCard>
        ))}
      </div>
      <div className="stack">
        {/* Account health: six rows over a rule and a seventh without one; the
            first two answer with a pill rather than a figure. */}
        <SkeletonCard><StatRows rows={6} pills={2} /></SkeletonCard>
        <SkeletonCard><Counters cells={3} /></SkeletonCard>
      </div>
    </div>
  )
}

/** The panel under the tab bar, which is all a tab change reads. */
export function IdentityPanelSkeleton({ tab = 'overview', shape = {} }) {
  return (
    <Skeleton className="skel-head-type idu-skel" label={`Loading ${PANEL_LABEL[tab] || 'the identity'}`}>
      <Panel tab={tab} shape={shape} />
    </Skeleton>
  )
}

/** The whole record on arrival: masthead, tab strip, figures and the panel. */
export function IdentityRecordSkeleton({ tab = 'overview', shape = {} }) {
  return (
    <Skeleton className="skel-head-type idu-skel" label="Loading the identity">
      <SkeletonDetailHeader facts={5} actions={5} />
      <SkeletonRecordTabs tabs={7} widths={[62, 52, 88, 56, 58, 60, 44]} />
      <div className="detail-body">
        <Kpis cells={6} />
        <Panel tab={tab} shape={shape} />
      </div>
    </Skeleton>
  )
}

/**
 * The editor, under the masthead the record uses.
 *
 * The fields themselves are typed into rather than read, and a form on its own
 * would hold no shape at all — but an edit form opens filled with the identity
 * it is editing, and that is a read. Creating one reads nothing, so UserAdd
 * holds no skeleton.
 *
 * Its counts are passed in for the same reason the record's are. `sections` is
 * the field count of each section card the editor prints, `steps` the number of
 * rail steps beside them, and `extras` the fixed cards that follow the schema
 * ones — Documents, Policy exception and Entitlements. The rail counts every
 * schema section whether or not it carries an attribute and the body does not,
 * so the two are stated separately rather than derived from one another.
 *
 * Only the first section opens: the editor sets `open` so, and the rest print
 * their header over a line of summary. The defaults are the shipped schema, for
 * a caller that has none of this in hand.
 */
export function IdentityFormSkeleton({ steps = 7, sections = [9, 7, 5, 4], extras = 3 }) {
  const cards = Math.max(1, sections.length) + Math.max(0, extras)
  const open = Math.max(1, sections[0] || 6)
  return (
    <Skeleton className="skel-head-type idu-skel" label="Loading the identity">
      <SkeletonDetailHeader facts={3} actions={0} />
      <div className="detail-body">
        <div className="wizard">
          <Rail steps={Math.max(1, steps)} />
          <div className="wiz-body stack">
            <SkeletonCard><SkeletonForm fields={open} cols={2} actions={false} /></SkeletonCard>
            {Array.from({ length: cards - 1 }, (_, i) => <CollapsedCard key={i} />)}
          </div>
        </div>
      </div>
    </Skeleton>
  )
}
