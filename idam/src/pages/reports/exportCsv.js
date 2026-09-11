// Client-side CSV export. Nothing leaves the browser.

const cell = (v) => {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (columns, rows) => {
  const head = columns.map((c) => cell(c.label)).join(',')
  const body = rows.map((r) => columns
    .map((c) => cell(c.csv ? c.csv(r) : r[c.key]))
    .join(','))
  return [head, ...body].join('\r\n')
}

export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const downloadCsv = (filename, csv) => {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const exportRows = (report, columns, rows, stampedOn) => {
  const filename = `${slugify(report.name)}-${stampedOn}.csv`
  downloadCsv(filename, toCsv(columns, rows))
  return filename
}
