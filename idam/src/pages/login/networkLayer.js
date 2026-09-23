import { geoInterpolate } from 'd3-geo'

export const NODES = [
  { lng: -74.0, lat: 40.7, label: 'us-east', status: 'secure' },
  { lng: -122.4, lat: 37.8, label: 'us-west', status: 'secure' },
  { lng: -0.1, lat: 51.5, label: 'eu-west', status: 'secure' },
  { lng: 8.7, lat: 50.1, label: 'eu-central', status: 'secure' },
  { lng: 55.3, lat: 25.2, label: 'me-south', status: 'blocked' },
  { lng: 72.9, lat: 19.1, label: 'ap-south', status: 'secure' },
  { lng: 103.8, lat: 1.35, label: 'ap-southeast', status: 'secure' },
  { lng: 139.7, lat: 35.7, label: 'ap-northeast', status: 'secure' },
  { lng: 151.2, lat: -33.9, label: 'ap-southeast-2', status: 'blocked' },
  { lng: -46.6, lat: -23.5, label: 'sa-east', status: 'secure' },
]

export const NODE_TONE = {
  secure: { core: 'rgba(150,232,255,0.92)', ring: '94,196,255' },
  blocked: { core: 'rgba(255,196,120,0.95)', ring: '245,170,90' },
}

const LINKS = [[5, 2], [5, 6], [2, 0], [0, 1], [3, 4], [6, 7], [6, 8], [2, 9], [4, 5], [3, 2]]
const STEPS = 26

export const ARCS = LINKS.map(([a, b], i) => {
  const from = NODES[a]
  const to = NODES[b]
  const interp = geoInterpolate([from.lng, from.lat], [to.lng, to.lat])
  const points = Array.from({ length: STEPS + 1 }, (_, s) => interp(s / STEPS))
  return { points, phase: (i * 0.37) % 1, speed: 0.16 + (i % 4) * 0.035 }
})
