const W = 1200
const H = 1200
const BANDS = 44
const STEPS = 60

const band = (i) => {
  const t = i / (BANDS - 1)
  const base = -140 + t * (H + 280)
  const amp = 26 + t * 132
  const freq = 1.7 + t * 0.9
  const phase = t * 3.1
  const pts = []
  for (let s = 0; s <= STEPS; s += 1) {
    const x = (s / STEPS) * W
    const u = s / STEPS
    const swell = 0.45 + 0.55 * Math.sin(Math.PI * u)
    const y = base
      + Math.sin(u * Math.PI * freq + phase) * amp * swell
      + Math.sin(u * Math.PI * 0.7 + phase * 1.6) * amp * 0.35
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
}

const BAND_PATHS = Array.from({ length: BANDS }, (_, i) => ({
  d: band(i),
  t: i / (BANDS - 1),
}))

export default function WaveField() {
  return (
    <svg className="lg-waves" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lgWaveG" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#12266b" />
          <stop offset="0.42" stopColor="#1a55c8" />
          <stop offset="0.72" stopColor="#2b8fe6" />
          <stop offset="1" stopColor="#46d6f5" />
        </linearGradient>
        <radialGradient id="lgWaveFade" cx="0.3" cy="0.72" r="0.85">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="lgWaveMask">
          <rect x="0" y="0" width={W} height={H} fill="url(#lgWaveFade)" />
        </mask>
      </defs>
      <g mask="url(#lgWaveMask)" fill="none" stroke="url(#lgWaveG)" strokeLinecap="round">
        {BAND_PATHS.map((b) => (
          <path
            key={b.d.slice(0, 24) + b.t}
            d={b.d}
            strokeWidth={2 + b.t * 5}
            opacity={0.16 + b.t * 0.5}
          />
        ))}
      </g>
    </svg>
  )
}
