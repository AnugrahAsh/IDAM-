import { useEffect, useRef } from 'react'
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo'
import { timer } from 'd3-timer'
import { LAND, DOT_PACK } from '../../data/worldLand'
import { ARCS, NODES, NODE_TONE } from './networkLayer'

const decodeDots = (packed) => {
  const bin = atob(packed)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  const view = new DataView(bytes.buffer)
  const out = new Array(bytes.length / 4)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = [view.getInt16(i * 4, true) / 10, view.getInt16(i * 4 + 2, true) / 10]
  }
  return out
}

const DOTS = decodeDots(DOT_PACK)
const GRATICULE = geoGraticule()()

export default function DottedGlobe({ size = 620, spin = 0.06 }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined

    const context = canvas.getContext('2d')
    if (!context) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rotation = [-20, -12]
    let box = size
    let radius = size / 2.35
    let dragging = false

    const projection = geoOrthographic().clipAngle(90).rotate(rotation)
    const path = geoPath().projection(projection).context(context)

    const layout = () => {
      box = Math.max(240, Math.min(size, wrap.clientWidth || size))
      radius = box / 2.35
      const dpr = window.devicePixelRatio || 1
      canvas.width = box * dpr
      canvas.height = box * dpr
      canvas.style.width = `${box}px`
      canvas.style.height = `${box}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      projection.scale(radius).translate([box / 2, box / 2])
    }

    const render = (elapsed = 0) => {
      context.clearRect(0, 0, box, box)

      context.beginPath()
      context.arc(box / 2, box / 2, radius, 0, 2 * Math.PI)
      context.fillStyle = '#050c22'
      context.fill()
      context.strokeStyle = 'rgba(198,220,255,0.9)'
      context.lineWidth = 1.5
      context.stroke()

      context.save()
      context.setLineDash([2, 7])
      context.lineDashOffset = -((elapsed / 1000) * 9) % 9
      context.beginPath()
      context.arc(box / 2, box / 2, radius * 1.045, 0, 2 * Math.PI)
      context.strokeStyle = 'rgba(94,196,255,0.32)'
      context.lineWidth = 0.9
      context.stroke()
      context.restore()

      context.save()
      context.beginPath()
      context.arc(box / 2, box / 2, radius, 0, 2 * Math.PI)
      context.clip()

      context.beginPath()
      path(GRATICULE)
      context.strokeStyle = 'rgba(168,200,255,0.26)'
      context.lineWidth = 0.7
      context.stroke()

      context.beginPath()
      LAND.features.forEach((feature) => path(feature))
      context.strokeStyle = 'rgba(214,232,255,0.72)'
      context.lineWidth = 0.8
      context.stroke()

      const rotated = projection.rotate()
      const lambda = -rotated[0]
      const phi = -rotated[1]
      const cosPhi = Math.cos((phi * Math.PI) / 180)
      const sinPhi = Math.sin((phi * Math.PI) / 180)
      const dotSize = Math.max(0.7, radius / 340)

      context.fillStyle = 'rgba(232,242,255,0.95)'
      for (let i = 0; i < DOTS.length; i += 1) {
        const lng = DOTS[i][0]
        const lat = DOTS[i][1]
        const dLambda = ((lng - lambda) * Math.PI) / 180
        const latRad = (lat * Math.PI) / 180
        const cosC = sinPhi * Math.sin(latRad) + cosPhi * Math.cos(latRad) * Math.cos(dLambda)
        if (cosC <= 0) continue
        const point = projection([lng, lat])
        if (!point) continue
        context.beginPath()
        context.arc(point[0], point[1], dotSize, 0, 2 * Math.PI)
        context.fill()
      }

      const sweep = ((elapsed / 1000) * 0.42) % (2 * Math.PI)
      const cx = box / 2
      const cy = box / 2
      context.save()
      context.beginPath()
      context.moveTo(cx, cy)
      context.arc(cx, cy, radius, sweep - 0.42, sweep)
      context.closePath()
      const cone = context.createRadialGradient(cx, cy, 0, cx, cy, radius)
      cone.addColorStop(0, 'rgba(94,196,255,0)')
      cone.addColorStop(0.72, 'rgba(94,196,255,0.055)')
      cone.addColorStop(1, 'rgba(120,214,255,0.14)')
      context.fillStyle = cone
      context.fill()
      context.beginPath()
      context.moveTo(cx, cy)
      context.lineTo(cx + Math.cos(sweep) * radius, cy + Math.sin(sweep) * radius)
      context.strokeStyle = 'rgba(150,232,255,0.24)'
      context.lineWidth = 1
      context.stroke()
      context.restore()

      const front = ([lng, lat]) => {
        const dl = ((lng - lambda) * Math.PI) / 180
        const la = (lat * Math.PI) / 180
        return sinPhi * Math.sin(la) + cosPhi * Math.cos(la) * Math.cos(dl) > 0
      }

      ARCS.forEach((arc) => {
        const visible = arc.points.map((pt) => (front(pt) ? projection(pt) : null))
        context.beginPath()
        let drawing = false
        visible.forEach((pt) => {
          if (!pt) { drawing = false; return }
          if (!drawing) { context.moveTo(pt[0], pt[1]); drawing = true } else context.lineTo(pt[0], pt[1])
        })
        context.strokeStyle = 'rgba(94,196,255,0.30)'
        context.lineWidth = 0.9
        context.stroke()

        const t = (arc.phase + (elapsed / 1000) * arc.speed) % 1
        const idx = Math.floor(t * (arc.points.length - 1))
        const head = visible[idx]
        if (head) {
          const trail = context.createRadialGradient(head[0], head[1], 0, head[0], head[1], 7)
          trail.addColorStop(0, 'rgba(150,232,255,0.95)')
          trail.addColorStop(1, 'rgba(150,232,255,0)')
          context.beginPath()
          context.fillStyle = trail
          context.arc(head[0], head[1], 7, 0, 2 * Math.PI)
          context.fill()
          context.beginPath()
          context.fillStyle = 'rgba(210,245,255,0.98)'
          context.arc(head[0], head[1], 1.5, 0, 2 * Math.PI)
          context.fill()
        }
      })

      NODES.forEach((n, i) => {
        if (!front([n.lng, n.lat])) return
        const pt = projection([n.lng, n.lat])
        if (!pt) return
        const tone = NODE_TONE[n.status] || NODE_TONE.secure
        const flagged = n.status === 'blocked'
        const speed = flagged ? 2.6 : 1.5
        const beat = (Math.sin((elapsed / 1000) * speed + i * 0.9) + 1) / 2

        const ping = ((elapsed / 1000) * 0.5 + i * 0.17) % 1
        context.beginPath()
        context.strokeStyle = `rgba(${tone.ring},${(1 - ping) * (flagged ? 0.4 : 0.24)})`
        context.lineWidth = 0.8
        context.arc(pt[0], pt[1], 2 + ping * 13, 0, 2 * Math.PI)
        context.stroke()

        context.beginPath()
        context.strokeStyle = `rgba(${tone.ring},${0.12 + beat * (flagged ? 0.42 : 0.26)})`
        context.lineWidth = 0.9
        context.arc(pt[0], pt[1], 3 + beat * 4.5, 0, 2 * Math.PI)
        context.stroke()

        if (flagged) {
          const r = 8.5
          context.beginPath()
          context.strokeStyle = `rgba(${tone.ring},${0.34 + beat * 0.34})`
          context.lineWidth = 0.9
          context.moveTo(pt[0] - r, pt[1]); context.lineTo(pt[0] - r + 3.2, pt[1])
          context.moveTo(pt[0] + r - 3.2, pt[1]); context.lineTo(pt[0] + r, pt[1])
          context.moveTo(pt[0], pt[1] - r); context.lineTo(pt[0], pt[1] - r + 3.2)
          context.moveTo(pt[0], pt[1] + r - 3.2); context.lineTo(pt[0], pt[1] + r)
          context.stroke()
        }

        context.beginPath()
        context.fillStyle = tone.core
        context.arc(pt[0], pt[1], flagged ? 1.9 : 1.5, 0, 2 * Math.PI)
        context.fill()
      })

      context.restore()
    }

    layout()
    render()

    let hidden = document.hidden
    const onVisibility = () => { hidden = document.hidden }
    document.addEventListener('visibilitychange', onVisibility)

    const ticker = timer((elapsed) => {
      if (hidden) return
      if (!dragging && !reduced) {
        rotation[0] = -20 + elapsed * spin
        projection.rotate(rotation)
      }
      render(reduced ? 0 : elapsed)
    })

    const onResize = () => { layout(); render() }
    window.addEventListener('resize', onResize)

    const onPointerDown = (event) => {
      dragging = true
      canvas.setPointerCapture(event.pointerId)
      const startX = event.clientX
      const startY = event.clientY
      const origin = [rotation[0], rotation[1]]

      const onPointerMove = (move) => {
        rotation[0] = origin[0] + (move.clientX - startX) * 0.35
        rotation[1] = Math.max(-80, Math.min(80, origin[1] - (move.clientY - startY) * 0.35))
        projection.rotate(rotation)
        render()
      }
      const onPointerUp = () => {
        dragging = false
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerUp)
      }

      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointercancel', onPointerUp)
    }

    canvas.addEventListener('pointerdown', onPointerDown)

    return () => {
      ticker.stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointerdown', onPointerDown)
    }
  }, [size, spin])

  return (
    <div className="globe" ref={wrapRef}>
      <canvas ref={canvasRef} className="globe-c" role="img" aria-label="Rotating wireframe globe" />
    </div>
  )
}
