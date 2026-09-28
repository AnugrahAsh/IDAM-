import {
  SkeletonCard, SkeletonForm, SkeletonKeyValue, SkeletonTable, SkeletonText,
} from '../../components/primitives/Skeleton'

/**
 * The shapes the Configurations panels hold their space with.
 *
 * The registers under Attributes, Sections, Multi-level lookups and Smart
 * Populate settle their own rows from the `loading` prop the workbench already
 * takes, so nothing here stands in for them. What is here is the four panels
 * that are not registers: the value-set master-detail (mirrors
 * LookupWorkbench), the applicability matrix (EmployeeTypePanel), the two
 * generation panels (UsernameConfigPanel, EmailConfigPanel) and the read-only
 * multi-level data card the page opens over its own tab strip.
 *
 * Each is built from the real panel's own classes, so the frame — its rules,
 * its column track, its scroll bounds — is the frame the panel will fill, and
 * only what the frame holds is grey.
 */

const bar = { display: 'block' }

/* One line of type, stated because a bar has none of its own. `.vs-it` needs
   no such help — it is a fixed 32px row whether it holds a name or a bar. */
const LH_XS = 'calc(var(--t-xs) * var(--t-xs-lh))'

/** The value sets, master and detail — `.vs` geometry. */
export function LookupWorkbenchSkeleton({ sets = 8, values = 8 }) {
  return (
    <div className="vs" aria-hidden="true">
      <aside className="vs-side">
        <header className="vs-side-h">
          <div className="vs-side-m">
            {/* "Value sets" is the panel's own name and does not wait; the
                tally of sets beneath it is counted from what has not landed. */}
            <div className="vs-side-t">Value sets</div>
            <div className="vs-side-s" style={{ minHeight: LH_XS, display: 'flex', alignItems: 'center' }}>
              <span className="skel" style={{ ...bar, width: 72, height: 8 }} />
            </div>
          </div>
          <span className="skel" style={{ ...bar, width: 28, height: 28, borderRadius: 'var(--r-sm)' }} />
        </header>
        <div className="vs-list">
          {Array.from({ length: sets }, (_, i) => (
            <span className="vs-it" data-skel="true" key={i}>
              <span className="skel" style={{ ...bar, width: 13, height: 13 }} />
              <span className="vs-it-n"><span className="skel" style={{ ...bar, width: `${58 + (i % 4) * 9}%`, height: 8 }} /></span>
              <span className="skel" style={{ ...bar, width: 20, height: 18, borderRadius: 'var(--r-pill)' }} />
            </span>
          ))}
        </div>
      </aside>

      <section className="vs-main">
        <header className="vs-main-h">
          <div className="vs-main-m">
            <span className="vs-main-t" style={{ display: 'flex', alignItems: 'center', minHeight: 'calc(var(--t-h3) * var(--t-h3-lh))' }}>
              <span className="skel" style={{ ...bar, width: 148, height: 11 }} />
            </span>
            <span className="vs-main-s" style={{ display: 'flex', alignItems: 'center', minHeight: LH_XS }}>
              <span className="skel" style={{ ...bar, width: 236, height: 8 }} />
            </span>
          </div>
          <div className="vs-main-a">
            <span className="skel skel-btn" style={{ ...bar, width: 118 }} />
            <span className="skel skel-btn" style={{ ...bar, width: 92 }} />
          </div>
        </header>
        <div className="vs-tbl-wrap"><SkeletonTable rows={values} cols={4} /></div>
        <footer className="vs-foot">
          <span className="vs-foot-k">Referenced by</span>
          <span className="skel skel-chip" style={{ ...bar, width: 96 }} />
          <span className="skel skel-chip" style={{ ...bar, width: 74 }} />
        </footer>
      </section>
    </div>
  )
}

/**
 * The applicability matrix. The card's title, its blurb and its footnote are
 * fixed copy, but both also print counts, so the card waits whole.
 */
export function EmployeeMatrixSkeleton({ rows = 12, types = 5 }) {
  return (
    <SkeletonCard head foot>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="skel" style={{ ...bar, flex: '1 1 14rem', minWidth: 0, height: 30, borderRadius: 'var(--r-sm)' }} />
        <span className="skel skel-chip" style={{ ...bar, width: 92 }} />
        <span className="skel skel-chip" style={{ ...bar, width: 86 }} />
        <span className="skel skel-chip" style={{ ...bar, width: 104 }} />
      </div>
      <SkeletonTable rows={rows} cols={Math.min(6, types + 1)} />
    </SkeletonCard>
  )
}

/**
 * A generation panel — username or email. Two columns: the rule being edited,
 * and what it currently produces. Every field arrives holding the configuration
 * the platform is creating identities with, so the pair waits together.
 */
export function ConfigSplitSkeleton({ preview = 4 }) {
  return (
    <div className="cfg-split" aria-hidden="true">
      <SkeletonCard head foot>
        <div className="stack">
          <span className="skel" style={{ ...bar, width: '100%', height: 52, borderRadius: 'var(--r)' }} />
          <SkeletonForm fields={1} cols={1} actions={false} />
          <span className="skel" style={{ ...bar, width: 260, height: 30, borderRadius: 'var(--r-sm)' }} />
          <SkeletonForm fields={4} cols={2} actions={false} />
        </div>
      </SkeletonCard>
      <div className="stack">
        <SkeletonCard head>
          <div className="stack" style={{ gap: 8 }}>
            <span className="skel" style={{ ...bar, width: 120, height: 8 }} />
            <span className="skel" style={{ ...bar, width: '62%', height: 17 }} />
            <span className="skel skel-chip" style={{ ...bar, width: 104 }} />
          </div>
        </SkeletonCard>
        <SkeletonCard head><SkeletonKeyValue rows={preview} cols={1} /></SkeletonCard>
      </div>
    </div>
  )
}

/** The read-only multi-level data card, in either of its two readings. */
export function MultiViewSkeleton({ mode = 'tree' }) {
  return (
    <SkeletonCard head foot>
      {mode === 'rows'
        ? <SkeletonTable rows={10} cols={5} />
        : (
          <div className="stack" style={{ gap: 10 }}>
            <span className="skel" style={{ ...bar, width: '100%', height: 30, borderRadius: 'var(--r-sm)' }} />
            <SkeletonText lines={8} />
          </div>
        )}
    </SkeletonCard>
  )
}
