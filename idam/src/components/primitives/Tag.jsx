export default function Tag({ tone, children }) {
  return <span className="tag" data-tone={tone}>{children}</span>
}
