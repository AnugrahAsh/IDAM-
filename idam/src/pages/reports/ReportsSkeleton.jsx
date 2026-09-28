import { SkeletonText } from '../../components/primitives/Skeleton'

/**
 * The shapes the Reports screens hold their space with.
 *
 * None of them comes from the kit, because none of the things they stand in for
 * is a kit shape: a catalogue card, a catalogue row, a quick-access chip, a
 * figure tile and the active-filter bar are all this module's own rules. Each
 * is built from the real element's classes rather than from a copy of its
 * measurements, so a card that grows a line here grows one in its skeleton too.
 *
 * The catalogue prints no figures — that was settled when the cards were
 * stripped — and its skeleton prints nothing that reads as one either: a mark,
 * a name and two lines of prose, which is all a card is now. The bars in the
 * report *view* stand for figures, but they stand in front of them: the whole
 * point is that the tile is empty until the rows it was counted from land.
 */

const bar = { display: 'block' }

/** A catalogue card — `.rep-card` geometry. */
export function ReportCardSkeleton() {
  return (
    <article className="rep-card" data-skel="true" aria-hidden="true">
      <header className="rep-card-top">
        <span className="skel rep-skel-mark" />
        <span className="skel" style={{ ...bar, width: '56%', height: 12 }} />
      </header>
      {/* The description's own two-line floor, so the footer rules at the same
          height it will once the prose arrives. */}
      <div className="rep-skel-desc"><SkeletonText lines={2} /></div>
      <footer className="rep-card-foot">
        <span className="skel" style={{ ...bar, width: 108, height: 8 }} />
        <span className="skel" style={{ ...bar, width: 76, height: 8, marginLeft: 'auto' }} />
      </footer>
    </article>
  )
}

/** A catalogue row — `.rep-row` geometry, in the list and inside a category. */
export function ReportRowSkeleton({ category = false }) {
  return (
    <div className="rep-row" data-skel="true" aria-hidden="true">
      <span className="skel rep-skel-mark" data-sm="true" />
      <span className="rep-row-m">
        <span className="rep-row-name"><span className="skel" style={{ ...bar, width: '36%', height: 9 }} /></span>
        <span className="rep-row-desc"><span className="skel" style={{ ...bar, width: '62%', height: 8 }} /></span>
      </span>
      {category && <span className="rep-row-cat"><span className="skel" style={{ ...bar, width: '72%', height: 8 }} /></span>}
      <span className="rep-row-when"><span className="skel" style={{ ...bar, width: '76%', height: 8 }} /></span>
      <span className="skel rep-skel-pin" />
      {/* The way in. A row that stops at the pin is 13px narrower than the one
          that replaces it, and the recency column slides when it lands. */}
      <span className="skel rep-skel-go" />
    </div>
  )
}

/**
 * A catalogue table row. The head above it is fixed copy and stays, so only
 * the cells wait — which also keeps the column widths the header declares.
 */
export function ReportTableRowSkeleton() {
  return (
    <tr className="rep-tr" data-skel="true" aria-hidden="true">
      <td className="td-main">
        <span className="cell-id">
          <span className="skel rep-skel-mark" data-tbl="true" />
          <span className="rep-skel-stack">
            <span className="rep-skel-l1"><span className="skel" style={{ ...bar, width: '44%', height: 9 }} /></span>
            <span className="cell-sub"><span className="skel" style={{ ...bar, width: '74%', height: 8 }} /></span>
          </span>
        </span>
      </td>
      <td><span className="skel" style={{ ...bar, width: '72%', height: 8 }} /></td>
      <td><span className="skel" style={{ ...bar, width: '80%', height: 8 }} /></td>
      <td className="rep-tbl-end"><span className="skel rep-skel-pin" /></td>
    </tr>
  )
}

/** A pinned or recently-viewed chip — `.rep-quick-it` geometry. */
export function ReportQuickSkeleton({ width = 96 }) {
  return (
    <span className="rep-quick-it" data-skel="true" aria-hidden="true">
      <span className="skel rep-skel-quick-ic" />
      <span className="skel" style={{ ...bar, width, height: 8 }} />
    </span>
  )
}

/** One headline figure above a report — `.tile` geometry. */
export function ReportTileSkeleton() {
  return (
    <div className="tile" data-skel="true" aria-hidden="true">
      <div className="tile-k"><span className="skel" style={{ ...bar, width: '52%', height: 8 }} /></div>
      <div className="tile-v"><span className="skel rep-skel-fig" /></div>
      <div className="tile-f"><span className="skel" style={{ ...bar, width: '68%', height: 8 }} /></div>
    </div>
  )
}

/**
 * The active-filter bar. Its key reads "No filters applied" the moment the
 * report opens, which is true and fixed — but the row count beside it is a
 * figure counted from rows that have not arrived, so only that end waits.
 */
export function ReportActiveSkeleton() {
  return (
    <section className="rep-active" data-skel="true" aria-hidden="true">
      <span className="rep-active-k"><span className="skel" style={{ ...bar, width: 118, height: 8 }} /></span>
      <span className="skel" style={{ ...bar, width: '32%', maxWidth: 320, height: 9 }} />
      <div className="spacer" />
      <span className="rep-active-n"><span className="skel" style={{ ...bar, width: 92, height: 8 }} /></span>
    </section>
  )
}

/** The chips on the report masthead's rail — one per figure it will print. */
export function ReportRailSkeleton({ count = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="skel skel-chip" style={{ ...bar, width: 96 + (i % 3) * 22 }} aria-hidden="true" />
  ))
}
