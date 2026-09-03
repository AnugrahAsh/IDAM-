// Deterministic demo series. Horizon law: never Math.random() in render — a
// reload must draw byte-identical charts.
export function seededRand(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

export function wave(n, base, amp, seed = 1, spike = -1, spikeV = 0) {
  const r = seededRand(seed)
  const out = []
  for (let i = 0; i < n; i++) {
    let v = base + Math.sin((i / n) * Math.PI * 2.2 + seed) * amp * 0.5 + r() * amp * 0.5
    if (i === spike) v += spikeV
    out.push(Math.round(Math.max(0, v)))
  }
  return out
}

// Sequential blue ramp for heatmap density.
export const SEQ = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec',
  '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab']

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)',
  'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)']
