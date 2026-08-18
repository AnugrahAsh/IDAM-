export default function StickyActions({ dirty, message, children }) {
  return (
    <div className="sticky-actions" data-dirty={dirty || undefined}>
      <span className="sticky-msg">{message}</span>
      <span className="spacer" />
      {children}
    </div>
  )
}
