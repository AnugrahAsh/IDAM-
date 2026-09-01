export default function Meter({ value = 0, tone, height }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="meter" data-tone={tone} style={height ? { height } : undefined}>
      <div className="meter-fill" style={{ width: `${v}%` }} />
    </div>
  )
}
