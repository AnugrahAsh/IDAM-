// The action bar that closes an editable page.
//
// It used to pin to the bottom of the canvas, which on a wide screen laid an
// opaque strip over whatever was still scrolling beneath it. It is the last row
// of the page now: `.canvas-inner` gives it `margin-top:auto`, so on a page
// shorter than the viewport it still lands at the bottom edge with no scroll,
// and on a longer page it simply follows the content it belongs to.
// `flow` opts a page out of that: the bar sits immediately after the content
// instead of being pushed to the bottom edge. Short pages were reserving a
// screen of empty canvas above a bar that then read as fixed chrome.
export default function StickyActions({ dirty, message, flow, children }) {
  return (
    <div className="sticky-actions" data-dirty={dirty || undefined} data-flow={flow || undefined}>
      <span className="sticky-msg">
        <span className="sticky-dot" aria-hidden="true" />
        {message}
      </span>
      <span className="spacer" />
      {children}
    </div>
  )
}
