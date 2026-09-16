import { useLayoutEffect, useMemo, useRef } from 'react'

/**
 * A source editor for the template body.
 *
 * Templates are HTML, so the author edits HTML: syntax highlighting and line
 * numbers are not decoration here, they are how a missing closing tag is found.
 * The highlight layer is a rendered copy sitting exactly under a transparent
 * textarea — the textarea keeps native editing, selection and undo, and the
 * layer scrolls with it.
 */

const escape = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

/* Order matters: comments, then merge tokens, then tags, then the attribute
   pieces inside what the tag rule already wrapped. */
const highlight = (src) => {
  let out = escape(src)
  out = out.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-com">$1</span>')
  out = out.replace(/(\{\{\s*[\w.]+\s*\}\})/g, '<span class="hl-tok">$1</span>')
  out = out.replace(
    /(&lt;\/?)([a-zA-Z][\w-]*)((?:[^&]|&(?!gt;))*?)(\/?&gt;)/g,
    (m, open, name, attrs, close) => {
      const a = attrs
        .replace(/([\w-]+)(=)(&quot;[^&]*?&quot;|"[^"]*"|'[^']*')/g,
          '<span class="hl-attr">$1</span><span class="hl-punct">$2</span><span class="hl-str">$3</span>')
        .replace(/(\s)([\w-]+)(?=\s|$)/g, '$1<span class="hl-attr">$2</span>')
      return `<span class="hl-punct">${open}</span><span class="hl-tag">${name}</span>${a}<span class="hl-punct">${close}</span>`
    },
  )
  return out
}

export default function HtmlEditor({ value, onChange, rows = 20, id, invalid }) {
  const taRef = useRef(null)
  const preRef = useRef(null)
  const gutterRef = useRef(null)

  const lines = useMemo(() => String(value || '').split('\n').length, [value])
  const html = useMemo(() => `${highlight(value || '')}\n`, [value])

  // The three layers have to agree on their scroll offset or the numbers drift
  // away from the lines they belong to.
  const sync = () => {
    const ta = taRef.current
    if (!ta) return
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop
      preRef.current.scrollLeft = ta.scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop
  }

  useLayoutEffect(sync, [value])

  const onKeyDown = (e) => {
    // Tab indents rather than leaving the field — this is a code editor, and
    // the field is reachable by every other means.
    if (e.key !== 'Tab' || e.shiftKey) return
    e.preventDefault()
    const ta = e.currentTarget
    const { selectionStart: a, selectionEnd: b } = ta
    const next = `${value.slice(0, a)}  ${value.slice(b)}`
    onChange(next)
    requestAnimationFrame(() => { ta.selectionStart = a + 2; ta.selectionEnd = a + 2 })
  }

  return (
    <div className="hed" data-invalid={invalid || undefined}>
      <div className="hed-gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <div className="hed-stack">
        <pre className="hed-hl" ref={preRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
        <textarea
          id={id}
          ref={taRef}
          className="hed-ta"
          spellCheck="false"
          wrap="off"
          rows={rows}
          value={value}
          aria-label="Template HTML source"
          onScroll={sync}
          onKeyDown={onKeyDown}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
