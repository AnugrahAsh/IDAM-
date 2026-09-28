import { SkeletonCard, SkeletonLine } from '../../../components/primitives/Skeleton'

/**
 * The read panels of Settings, holding their place.
 *
 * Most of this page is a form: an operator opens Security to change a timeout,
 * and a grey box where the switches should be tells them nothing they did not
 * already know. The sections that answer a question instead of asking one —
 * the approval chain, the level rules, the allow-list, the regions and their
 * bindings, the taxonomies — are registers of stored rows, so they hold their
 * place the way every other register in the console does.
 *
 * The shapes are built from the sections' own classes rather than from the
 * kit's generic table, because these are not workbench registers: a level is a
 * bordered row with a number badge, not a table row, and a kit table dropped in
 * its place would be the wrong height by the gap between them.
 */

/* One `.set-level` row: the number badge, the name over its description, and
   the space the row actions occupy. Heights are read off the type the real row
   prints at, so the card is the height it will be.

   Bare `.skel` rather than `SkeletonLine`, because the kit's line carries 5px
   of its own vertical margin for the paragraphs it was drawn for, and the row's
   two bars are spaced by the container's gap instead. */
function LevelRow() {
  return (
    <div className="set-level">
      <span className="skel set-skel-level-n" />
      <span className="set-level-body set-skel-level-b">
        <span className="skel" style={{ width: '34%', height: 'calc(var(--t-sm) * var(--t-body-lh))' }} />
        <span className="skel" style={{ width: '62%', height: 'calc(var(--t-xs) * var(--t-body-lh))' }} />
      </span>
      <span className="set-level-acts">
        <span className="skel set-skel-act" />
        <span className="skel set-skel-act" />
      </span>
    </div>
  )
}

/** A list of ordered rows — approval levels, severities, categories. */
export function LevelListSkeleton({ rows = 4 }) {
  return (
    <div className="set-levels" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <LevelRow key={i} />)}
    </div>
  )
}

/** A table inside a settings card — the allow-list, the bindings, the rules. */
export function TableSkeleton({ rows = 5, cols = 4, bar = false }) {
  return (
    <div aria-hidden="true">
      {/* The rows-per-page and search controls above the allow-list. They have
          nothing of their own to read, but a crisp toolbar over a grey table
          reads as a page half broken rather than as a page arriving. */}
      {bar && (
        <div className="set-reg-bar">
          <span className="skel set-skel-ctl" style={{ width: 96 }} />
          <span className="skel set-skel-ctl set-reg-search" />
        </div>
      )}
      <table className="tbl">
        <thead>
          <tr>
            {Array.from({ length: cols }, (_, c) => (
              <th key={c}><SkeletonLine width={c === 0 ? 40 : `${52 - c * 6}%`} height={8} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                // Rows fade down the panel, the way the kit's own table does:
                // the eye is told where the list starts rather than handed an
                // even block of grey.
                <td key={c} style={{ opacity: 1 - r * 0.08 }}>
                  <SkeletonLine width={c === 0 ? 28 : `${68 - c * 8}%`} height={9} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A whole settings section: the card frame with one of the shapes inside.
    `foot` matches the cards that carry a note under their body, which is a row
    of height the panel would otherwise gain when the rows land. */
export default function SectionSkeleton({ foot = false, children }) {
  return <SkeletonCard head foot={foot}>{children}</SkeletonCard>
}
