// The action bar that closes an editable page.
//
// It used to pin to the bottom of the canvas, which on a wide screen laid an
// opaque strip over whatever was still scrolling beneath it. It is the last row
// of the page now: `.canvas-inner` gives it `margin-top:auto`, so on a page
// shorter than the viewport it still lands at the bottom edge with no scroll,
// and on a longer page it simply follows the content it belongs to.
export default function StickyActions({ dirty, message, children }) {
  return (
    <div className="sticky-actions" data-dirty={dirty || undefined}>
      <span className="sticky-msg">
        <span className="sticky-dot" aria-hidden="true" />
        {message}
      </span>
      <span className="spacer" />
      {children}
    </div>
  )
}
