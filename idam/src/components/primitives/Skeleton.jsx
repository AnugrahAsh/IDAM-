import { createContext, useContext } from 'react'

/**
 * Skeleton loaders.
 *
 * Two rules hold the kit together.
 *
 * A shape is decoration. It is `aria-hidden`, because a description of grey
 * rectangles is worth nothing to a screen reader. What a reader needs is one
 * sentence saying that something is on its way, and that is the only job of the
 * `Skeleton` wrapper — a single `role="status"` region per screen. Nesting is
 * handled rather than forbidden: a wrapper rendered inside another wrapper
 * yields its children and stays silent, so a page announces once even when it
 * composes shapes that would announce on their own elsewhere.
 *
 * A shape is also drawn from the geometry of the component it stands in for,
 * not from a guess at it. Every size here is the size in styles/skeleton.css,
 * which mirrors the real rule, so the content lands in the space its skeleton
 * was holding instead of shifting the page on arrival.
 */

const Announcing = createContext(false)

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* Ragged widths, for the last line of a text block and anywhere else a column
   of identical bars would read as a printed form rather than as prose. Fixed
   rather than random: a skeleton that reshuffles on every render draws
   attention to itself instead of to the wait. */
const RAG = ['62%', '48%', '71%', '55%']
const ragged = (i) => RAG[i % RAG.length]

/**
 * The announcing region. Wrap a screen's shapes in one of these and give it a
 * label that says what is loading, in the words the page itself uses.
 */
export function Skeleton({ label = 'Loading', className, children }) {
  // Already inside a region — the outer one has said it, so this one keeps
  // quiet and adds no element of its own.
  if (useContext(Announcing)) return <>{children}</>

  return (
    <Announcing.Provider value>
      <div className={cx('skel-block', className)} role="status" aria-live="polite" aria-busy="true">
        <span className="vis-hidden">{label}</span>
        {children}
      </div>
    </Announcing.Provider>
  )
}

export function SkeletonLine({ width = '100%', height = 9, className }) {
  return <div className={cx('skel skel-line', className)} style={{ width, height }} aria-hidden="true" />
}

/** A paragraph of `lines` bars, the last one short so the block reads as text. */
export function SkeletonText({ lines = 3, width = '100%', className }) {
  return (
    <div className={cx('skel-text', className)} style={{ width }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skel" style={{ width: i === lines - 1 && lines > 1 ? ragged(i) : '100%' }} />
      ))}
    </div>
  )
}

/** The register table: a header band and `rows` of `cols` cells. */
export function SkeletonTable({ rows = 8, cols = 5 }) {
  return (
    <div className="skel-table" aria-hidden="true">
      <div className="skel-row" data-head="true">
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className="skel" style={{ height: 8, flex: c === 0 ? '0 0 22%' : 1 }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div className="skel-row" key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <div
              key={c}
              className="skel"
              // Rows fade down the page: the eye is told where the list starts
              // rather than being handed an even block of grey.
              style={{ height: 9, flex: c === 0 ? '0 0 22%' : 1, opacity: 1 - r * 0.07 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** A panel — `Card` proportions: header band, body, optional footer. */
export function SkeletonCard({ head = true, lines = 3, foot = false, className, children }) {
  return (
    <section className={cx('skel-card', className)} aria-hidden="true">
      {head && (
        <div className="skel-card-h">
          <span className="skel" style={{ width: '32%', height: 11 }} />
          <span className="skel" style={{ width: '18%', height: 9 }} />
        </div>
      )}
      <div className="skel-card-b">{children || <SkeletonText lines={lines} />}</div>
      {foot && (
        <div className="skel-card-f">
          <span className="skel" style={{ width: '24%', height: 9 }} />
        </div>
      )}
    </section>
  )
}

/**
 * A record card — the `.rcard` / `.ma-tile` geometry that every card grid in
 * the console shares: a mark, a name, some body lines, and an optional
 * two-column fact grid above a footer rule.
 *
 * `layout` is the one real difference between the two. A record card runs its
 * mark beside the name it belongs to (`inline`); an application tile gives the
 * mark a row of its own and puts the name underneath (`stacked`).
 */
export function SkeletonTile({ media = 'square', layout = 'inline', lines = 2, meta = 0, foot = true, className }) {
  const mark = media && <span className={cx('skel', media === 'avatar' ? 'skel-avatar' : 'skel-media')} />
  return (
    <article className={cx('skel-tile', className)} data-layout={layout} aria-hidden="true">
      {layout === 'stacked' ? (
        <>
          {mark}
          <span className="skel skel-tile-title" style={{ width: '58%' }} />
        </>
      ) : (
        <div className="skel-tile-top">
          {mark}
          <span className="skel-tile-id">
            <span className="skel" style={{ width: '58%', height: 11 }} />
            <span className="skel" style={{ width: '38%', height: 9 }} />
          </span>
        </div>
      )}
      {lines > 0 && <SkeletonText lines={lines} />}
      {meta > 0 && (
        <div className="skel-tile-meta">
          {Array.from({ length: meta }, (_, i) => (
            <span key={i} className="skel-tile-fact">
              <span className="skel" style={{ width: '54%', height: 7 }} />
              <span className="skel" style={{ width: ragged(i), height: 9 }} />
            </span>
          ))}
        </div>
      )}
      {foot && (
        <div className="skel-tile-foot">
          <span className="skel" style={{ width: 68, height: 8 }} />
          <span className="skel" style={{ width: 46, height: 8 }} />
        </div>
      )}
    </article>
  )
}

/**
 * A grid of record cards. `card` takes a page's own card skeleton — the one
 * that lives beside the card it imitates — when the default tile is the wrong
 * shape for the grid being waited on.
 */
export function SkeletonCardGrid({ count = 6, card, className, ...tile }) {
  const Shape = card || SkeletonTile
  return (
    <div className={cx('skel-grid', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <Shape key={i} {...tile} />)}
    </div>
  )
}

/** The headline metrics above a register — `StatCards` geometry. */
export function SkeletonStats({ count = 4, className }) {
  return (
    <div className={cx('skel-stats', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="skel-stat" key={i}>
          <span className="skel" style={{ width: ragged(i), height: 8 }} />
          <span className="skel skel-stat-v" style={{ width: 62 }} />
          <span className="skel-stat-f">
            <span className="skel skel-chip" style={{ width: 42 }} />
            <span className="skel" style={{ width: '46%', height: 8 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/** One row of a list — a mark, a title over a sub-line, and a trailing value. */
export function SkeletonRow({ media = 'avatar', trailing = true, className }) {
  return (
    <div className={cx('skel-listrow', className)} aria-hidden="true">
      {media && <span className={cx('skel', media === 'avatar' ? 'skel-avatar' : 'skel-media')} />}
      <span className="skel-listrow-m">
        <span className="skel" style={{ width: '42%', height: 10 }} />
        <span className="skel" style={{ width: '64%', height: 8 }} />
      </span>
      {trailing && <span className="skel skel-chip" style={{ width: 58 }} />}
    </div>
  )
}

export function SkeletonList({ rows = 5, className, ...row }) {
  return (
    <div className={cx('skel-list', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} {...row} />)}
    </div>
  )
}

/** A record page's masthead — `DetailHeader` geometry. */
export function SkeletonDetailHeader({ media = true, facts = 3, actions = 2, className }) {
  return (
    <div className={cx('skel-dh', className)} aria-hidden="true">
      <div className="skel-crumbs">
        <span className="skel" style={{ width: 36 }} />
        <span className="skel" style={{ width: 7 }} />
        <span className="skel" style={{ width: 54 }} />
        <span className="skel" style={{ width: 7 }} />
        <span className="skel" style={{ width: 88 }} />
      </div>
      <div className="skel-dh-top">
        {media && <span className="skel skel-dh-media" />}
        <div className="skel-dh-meta">
          <span className="skel skel-title" style={{ width: '34%' }} />
          <span className="skel" style={{ width: '56%', height: 9 }} />
          {facts > 0 && (
            <div className="skel-dh-facts">
              {Array.from({ length: facts }, (_, i) => (
                <span key={i} className="skel" style={{ width: 96 + (i % 3) * 26, height: 9 }} />
              ))}
            </div>
          )}
        </div>
        {actions > 0 && (
          <div className="skel-dh-actions">
            {Array.from({ length: actions }, (_, i) => (
              <span key={i} className="skel skel-btn" style={{ width: 82 + (i % 3) * 20 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** A read-only field grid — `KeyValue` geometry. */
export function SkeletonKeyValue({ rows = 6, cols = 2, className }) {
  return (
    <div className={cx('skel-kv', className)} data-cols={cols} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skel-kv-row" key={i}>
          <span className="skel skel-kv-ic" />
          <span className="skel-kv-m">
            <span className="skel" style={{ width: '44%', height: 7 }} />
            <span className="skel" style={{ width: ragged(i), height: 9 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/** An editor — `Field` rows in the two-column grid the forms use. */
export function SkeletonForm({ fields = 6, cols = 2, actions = true, className }) {
  return (
    <div className={cx('skel-form', className)} aria-hidden="true">
      <div className="skel-form-grid" data-cols={cols}>
        {Array.from({ length: fields }, (_, i) => (
          <div className="skel-field" key={i}>
            <span className="skel" style={{ width: ragged(i + 1), height: 8 }} />
            <span className="skel skel-input" />
          </div>
        ))}
      </div>
      {actions && (
        <div className="skel-form-actions">
          <span className="skel skel-btn" style={{ width: 72 }} />
          <span className="skel skel-btn" style={{ width: 104 }} />
        </div>
      )}
    </div>
  )
}

/** The page masthead — `PageBar` geometry, negative gutters included. */
export function SkeletonPageBar({ actions = 2, sub = true, crumbs = 2, className }) {
  return (
    <div className={cx('skel-pagebar', className)} aria-hidden="true">
      <div className="skel-crumbs">
        <span className="skel" style={{ width: 36 }} />
        {Array.from({ length: crumbs }, (_, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span className="skel" style={{ width: 7 }} />
            <span className="skel" style={{ width: 56 + (i % 2) * 30 }} />
          </span>
        ))}
      </div>
      <div className="skel-pagebar-top">
        <div className="skel-pagebar-meta">
          <span className="skel skel-title" style={{ width: '26%' }} />
          {sub && <span className="skel" style={{ width: '52%', height: 9 }} />}
        </div>
        {actions > 0 && (
          <div className="skel-pagebar-actions">
            {Array.from({ length: actions }, (_, i) => (
              <span key={i} className="skel skel-btn" style={{ width: 84 + (i % 3) * 22 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
