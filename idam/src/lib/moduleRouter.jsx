/**
 * Screen routing for a module.
 *
 * A module used to be one component that branched on `segments` part-way down
 * its body. That put the list state — rows, filters, saved views, selection —
 * above the branch, so opening "Add" constructed the whole register first and
 * threw it away, and every screen shared one 800-line file whose imports were
 * the union of all four.
 *
 * Screens are declared instead. Each one owns its file, states the address it
 * answers to, and receives only the parameters it matched. The first screen
 * whose `match` returns an object wins, so order is the specificity order.
 */

/** Matches the module root — `/iam/users`. */
export const atRoot = () => (segments) => (segments.length === 0 ? {} : null)

/** Matches a fixed first segment — `/iam/users/add`. */
export const atPath = (...parts) => (segments) => (
  parts.every((p, i) => segments[i] === p) && segments.length === parts.length ? {} : null
)

/**
 * Matches a record id followed by a fixed segment — `/iam/users/42/edit`.
 * The id is handed to the screen as `id`.
 */
export const atRecordPath = (...parts) => (segments) => (
  segments[0] && parts.every((p, i) => segments[i + 1] === p) && segments.length === parts.length + 1
    ? { id: segments[0] }
    : null
)

/**
 * Matches a record id and anything after it — `/iam/users/42`, `/iam/users/42/groups`.
 * The trailing segment is handed over as `tab`, which is how record screens
 * address their own tabs without a second route.
 */
export const atRecord = () => (segments) => (
  segments[0] ? { id: segments[0], tab: segments[1], rest: segments.slice(1) } : null
)

/**
 * Resolves `segments` against an ordered screen list.
 *
 * Returns the rendered screen, or `fallback()` when nothing matches — which is
 * the module's own not-found, not a blank canvas.
 */
export function renderScreen(screens, segments = [], fallback) {
  for (const screen of screens) {
    const params = screen.match(segments)
    if (params) return screen.render(params)
  }
  return fallback ? fallback() : null
}
