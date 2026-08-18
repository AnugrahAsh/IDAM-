export function SkeletonLine({ width = '100%', height = 9 }) {
  return <div className="skel skel-line" style={{ width, height }} />
}

export function SkeletonTable({ rows = 8, cols = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, r) => (
        <div className="skel-row" key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <div
              key={c}
              className="skel"
              style={{ height: 9, flex: c === 0 ? '0 0 22%' : 1, opacity: 1 - r * 0.07 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
