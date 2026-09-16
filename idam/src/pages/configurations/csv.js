/* CSV parsing for the Configurations uploads. No React, no DOM.
 *
 * Every upload in Configuration is validated against an exact header row before
 * anything is applied, so this only has to turn text into rows — the shape
 * checks live in rules.js next to the messages they raise. */

/* Dependency-free CSV parser. Handles quoted cells, escaped quotes and CRLF. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQ = false
  const pushCell = () => { row.push(cell.trim()); cell = '' }
  const pushRow = () => {
    pushCell()
    if (row.some((c) => c !== '')) rows.push(row)
    row = []
  }
  const src = String(text || '')
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 1 } else inQ = false
      } else cell += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') pushCell()
    else if (ch === '\n') pushRow()
    else if (ch !== '\r') cell += ch
  }
  pushRow()
  return rows
}
