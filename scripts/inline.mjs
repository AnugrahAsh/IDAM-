import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, process.env.DIST || 'dist')
const out = process.argv[2] || join(dist, 'standalone.html')

const mime = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

function dataUri(file) {
  const ext = extname(file).toLowerCase()
  const type = mime[ext] || 'application/octet-stream'
  const body = readFileSync(join(dist, file))
  if (ext === '.svg') {
    return `data:${type};utf8,${encodeURIComponent(body.toString('utf8')).replace(/'/g, '%27')}`
  }
  return `data:${type};base64,${body.toString('base64')}`
}

function assetFiles() {
  const dir = join(dist, 'assets')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
}

let html = readFileSync(join(dist, 'index.html'), 'utf8')

const files = assetFiles()
const css = files.filter((f) => f.endsWith('.css'))
const js = files.filter((f) => f.endsWith('.js'))
const media = files.filter((f) => !f.endsWith('.css') && !f.endsWith('.js'))

const inlined = new Map()
for (const f of media) inlined.set(f, dataUri(`assets/${f}`))

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function swapAssetRefs(text) {
  let next = text
  for (const [file, uri] of inlined) {
    next = next.replace(new RegExp(`[^"'()\\s\`]*assets/${escape(file)}`, 'g'), uri)
  }
  return next
}

html = html.replace(/<link[^>]+rel="stylesheet"[^>]*>/g, '')
html = html.replace(/<script[^>]+type="module"[^>]*><\/script>/g, '')
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '')

const styleBlock = css
  .map((f) => swapAssetRefs(readFileSync(join(dist, 'assets', f), 'utf8')))
  .join('\n')

const scriptBlock = js
  .map((f) => swapAssetRefs(readFileSync(join(dist, 'assets', f), 'utf8')))
  .join('\n;\n')

const safeScript = scriptBlock.replace(/<\/script>/gi, '<\\/script>')
html = html.replace('</head>', () => `<style>${styleBlock}</style>\n</head>`)
html = html.replace('</body>', () => `<script>${safeScript}</script>\n</body>`)
html = swapAssetRefs(html)

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html, 'utf8')

const kb = (n) => `${(n / 1024).toFixed(1)} kB`
console.log(`inlined -> ${out}`)
console.log(`  css ${css.length} file(s)  ${kb(styleBlock.length)}`)
console.log(`  js  ${js.length} file(s)  ${kb(scriptBlock.length)}`)
console.log(`  media ${media.length} inlined as data URIs`)
console.log(`  total ${kb(html.length)}`)
if (/<(link|script)[^>]+(href|src)="\.?\/?assets\//.test(html)) {
  console.error('FAIL: external asset reference survived')
  process.exit(1)
}
console.log('self-contained: no external asset references remain')
