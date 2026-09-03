import { useState } from 'react'
import { useTip } from './TooltipProvider'
import { SEQ } from '../../lib/series'

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n)

/* --- Sparkline — KPI-tile inline trend ----------------------------------- */
export function Sparkline({ data, w = 92, h = 30, color = 'var(--s1)', fill = true }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [i * step, h - 2 - ((v - min) / span) * (h - 4)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {fill && <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={color} opacity=".09" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" />
    </svg>
  )
}

/* --- AreaChart — multi-series with crosshair + shared tooltip ------------- */
export function AreaChart({ series = [], labels = [], h = 210, yFmt = fmt, xEvery = 3 }) {
  const { showTip, hideTip } = useTip()
  const [hi, setHi] = useState(-1)
  const w = 760
  const padL = 46
  const padR = 12
  const padT = 14
  const padB = 26
  const n = labels.length
  if (!n || !series.length) return null

  const all = series.flatMap((s) => s.data)
  const max = Math.max(...all, 1) * 1.12
  const iw = w - padL - padR
  const ih = h - padT - padB
  const x = (i) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v) => padT + ih - (v / max) * ih
  const ticks = [0, 1, 2, 3].map((t) => (max / 3) * t)

  const onMove = (e, i) => {
    setHi(i)
    showTip(e.clientX, e.clientY, (
      <>
        <div className="vt-t">{labels[i]}</div>
        {series.map((s) => (
          <div className="vt-row" key={s.name}>
            <span className="sw" style={{ background: s.color }} />
            <span>{s.name}</span>
            <b>{yFmt(s.data[i])}</b>
          </div>
        ))}
      </>
    ))
  }
  const onLeave = () => { setHi(-1); hideTip() }

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Trend chart">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={i === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth="1" />
            <text className="axis-t" x={padL - 8} y={y(t) + 3.5} textAnchor="end">{yFmt(Math.round(t))}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % xEvery === 0 ? (
          <text className="axis-t" key={l + i} x={x(i)} y={h - 7} textAnchor="middle">{l}</text>
        ) : null))}

        {series.map((s) => {
          const d = s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
          return (
            <g key={s.name}>
              <path d={`${d} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={s.color} opacity=".08" />
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {hi >= 0 && <circle cx={x(hi)} cy={y(s.data[hi])} r="3.5" fill={s.color} stroke="var(--surface)" strokeWidth="1.5" />}
            </g>
          )
        })}

        {hi >= 0 && <line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + ih} stroke="var(--accent)" strokeWidth="1" opacity=".4" />}

        {labels.map((l, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - iw / (n - 1) / 2}
            y={padT}
            width={iw / (n - 1)}
            height={ih}
            fill="transparent"
            onMouseMove={(e) => onMove(e, i)}
            onMouseLeave={onLeave}
          />
        ))}
      </svg>
    </div>
  )
}

/* --- BarChart — single series, top-rounded bars --------------------------- */
export function BarChart({ labels = [], values = [], h = 190, color = 'var(--s1)', yFmt = fmt, xEvery = 1, name = 'Value' }) {
  const { showTip, hideTip } = useTip()
  const w = 760
  const padL = 46
  const padR = 12
  const padT = 12
  const padB = 26
  const n = labels.length
  if (!n) return null

  const max = Math.max(...values, 1) * 1.15
  const iw = w - padL - padR
  const ih = h - padT - padB
  const slot = iw / n
  const bw = Math.min(24, slot * 0.62)
  const baseY = padT + ih
  const ticks = [0, 1, 2].map((t) => (max / 2) * t)

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${name} by period`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={baseY - (t / max) * ih} y2={baseY - (t / max) * ih}
                  stroke={i === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth="1" />
            <text className="axis-t" x={padL - 8} y={baseY - (t / max) * ih + 3.5} textAnchor="end">{yFmt(Math.round(t))}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const bh = Math.max(2, (v / max) * ih)
          const bx = padL + slot * i + (slot - bw) / 2
          const r = Math.min(4, bh)
          const d = `M${bx} ${baseY} v-${(bh - r).toFixed(1)} q0 -${r} ${r} -${r} h${(bw - 2 * r).toFixed(1)} q${r} 0 ${r} ${r} v${(bh - r).toFixed(1)} Z`
          return (
            <path
              key={i}
              d={d}
              fill={color}
              onMouseMove={(e) => showTip(e.clientX, e.clientY, (
                <>
                  <div className="vt-t">{labels[i]}</div>
                  <div className="vt-row">
                    <span className="sw" style={{ background: color }} />
                    <span>{name}</span>
                    <b>{yFmt(v)}</b>
                  </div>
                </>
              ))}
              onMouseLeave={hideTip}
            />
          )
        })}
        {labels.map((l, i) => (i % xEvery === 0 ? (
          <text className="axis-t" key={l + i} x={padL + slot * i + slot / 2} y={h - 7} textAnchor="middle">{l}</text>
        ) : null))}
      </svg>
    </div>
  )
}

/* --- RingGauge ------------------------------------------------------------ */
export function RingGauge({ pct = 0, size = 110, color = 'var(--accent)', track = 'var(--accent-bg-2)', label, cap }) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, pct))
  return (
    <div className="ring" style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth="9" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="rg-val" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="rg-num num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.03em', color: 'var(--ink)' }}>
          {label != null ? label : `${Math.round(v)}%`}
        </span>
        {cap && <span className="rg-cap" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--mut)' }}>{cap}</span>}
      </div>
    </div>
  )
}

/* --- SegBar --------------------------------------------------------------- */
export function SegBar({ segs = [], h = 10 }) {
  const total = segs.reduce((a, s) => a + s.value, 0) || 1
  const { showTip, hideTip } = useTip()
  return (
    <div style={{ display: 'flex', gap: 2, height: h, borderRadius: 4, overflow: 'hidden' }}>
      {segs.map((s) => (
        <div
          key={s.name}
          style={{ width: `${(s.value / total) * 100}%`, background: s.color, borderRadius: 3 }}
          onMouseMove={(e) => showTip(e.clientX, e.clientY, (
            <div className="vt-row">
              <span className="sw" style={{ background: s.color }} />
              <span>{s.name}</span>
              <b>{fmt(s.value)}</b>
            </div>
          ))}
          onMouseLeave={hideTip}
        />
      ))}
    </div>
  )
}

/* --- Heatmap -------------------------------------------------------------- */
export function Heatmap({ rows = [], cols = [], data = [], cell = 21, gap = 3 }) {
  const { showTip, hideTip } = useTip()
  const max = Math.max(...data.flat(), 1)
  const labelW = 74
  const w = labelW + cols.length * (cell + gap)
  const h = rows.length * (cell + gap) + 18
  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Density heatmap">
        {rows.map((rl, ri) => (
          <text className="axis-t" key={rl} x={labelW - 8} y={ri * (cell + gap) + cell / 2 + 4} textAnchor="end">{rl}</text>
        ))}
        {cols.map((cl, ci) => (ci % 3 === 0 ? (
          <text className="axis-t" key={cl} x={labelW + ci * (cell + gap) + cell / 2} y={h - 5} textAnchor="middle">{cl}</text>
        ) : null))}
        {rows.map((rl, ri) => cols.map((cl, ci) => {
          const v = (data[ri] && data[ri][ci]) || 0
          const idx = v === 0 ? -1 : Math.min(SEQ.length - 1, Math.floor((v / max) * SEQ.length))
          return (
            <rect
              key={`${ri}-${ci}`}
              x={labelW + ci * (cell + gap)} y={ri * (cell + gap)}
              width={cell} height={cell} rx="4"
              fill={idx < 0 ? 'var(--surface-3)' : SEQ[idx]}
              onMouseMove={(e) => showTip(e.clientX, e.clientY, (
                <>
                  <div className="vt-t">{rl} · {cl}</div>
                  <div className="vt-row"><span>Events</span><b>{fmt(v)}</b></div>
                </>
              ))}
              onMouseLeave={hideTip}
            />
          )
        }))}
      </svg>
    </div>
  )
}
