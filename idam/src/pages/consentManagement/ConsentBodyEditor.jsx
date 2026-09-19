import { useMemo, useRef, useState } from 'react'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'

/** The languages a tenant can publish a notice in. */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'ur', label: 'Urdu' },
]

export const LANG_LABEL = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.label]))

/** Right-to-left scripts have to be authored and previewed in their own direction. */
const RTL = new Set(['ar', 'ur'])

/* The character-formatting tools show the letter they apply, styled the way
   they will render — a bold B reads faster than any glyph standing in for it. */
const TOOLS = [
  { cmd: 'bold', label: 'Bold', text: 'B', cls: 'cbe-b' },
  { cmd: 'italic', label: 'Italic', text: 'I', cls: 'cbe-i' },
  { cmd: 'underline', label: 'Underline', text: 'U', cls: 'cbe-u' },
  { cmd: 'formatBlock:h3', label: 'Heading', text: 'H', cls: 'cbe-h' },
  { divider: true },
  { cmd: 'insertUnorderedList', icon: 'menu', label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: 'sort', label: 'Numbered list' },
  { cmd: 'createLink', icon: 'link', label: 'Link' },
  { divider: true },
  { cmd: 'removeFormat', icon: 'x', label: 'Clear formatting' },
]

/**
 * The consent body, per language.
 *
 * A consent is a legal artefact: the wording an identity is shown has to be the
 * wording in their own language, and the same acceptance record has to point at
 * the version they actually read. So the body is a map of language code to
 * markup rather than a single string, and the editor makes the *authored*
 * language explicit at all times — there is no "current locale" the author has
 * to keep in their head.
 */
export default function ConsentBodyEditor({ bodies, defaultLang, error, onChange, onDefaultChange }) {
  const { toast, confirm } = useApp()
  const codes = useMemo(() => Object.keys(bodies), [bodies])
  const [lang, setLang] = useState(() => (codes.includes(defaultLang) ? defaultLang : codes[0] || 'en'))
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState('')
  const ref = useRef(null)
  const active = codes.includes(lang) ? lang : codes[0]

  const available = LANGUAGES.filter((l) => !codes.includes(l.code))

  const exec = (cmd) => {
    ref.current?.focus()
    if (cmd === 'createLink') {
      const url = window.prompt('Link address', 'https://')
      if (url) document.execCommand('createLink', false, url)
    } else if (cmd.startsWith('formatBlock:')) {
      document.execCommand('formatBlock', false, cmd.split(':')[1])
    } else {
      document.execCommand(cmd, false, null)
    }
    onChange({ ...bodies, [active]: ref.current.innerHTML })
  }

  const addLanguage = () => {
    if (!pending) return
    onChange({ ...bodies, [pending]: '' })
    setLang(pending)
    toast('ok', 'Language added', `${LANG_LABEL[pending]} is now authored separately. It is not published until it has text.`)
    setPending('')
    setAdding(false)
  }

  const removeLanguage = (code) => confirm({
    title: `Remove the ${LANG_LABEL[code]} version?`,
    body: code === defaultLang
      ? 'This is the default language. Identities with no matching translation would have nothing to read — set another default first.'
      : `Identities whose locale is ${LANG_LABEL[code]} fall back to the ${LANG_LABEL[defaultLang]} text. Acceptance records already captured against it are retained.`,
    confirmLabel: 'Remove language',
    onConfirm: () => {
      const next = { ...bodies }
      delete next[code]
      onChange(next)
      setLang(Object.keys(next)[0])
      toast('ok', 'Language removed', LANG_LABEL[code])
    },
  })

  const empty = codes.filter((c) => !stripTags(bodies[c]).trim())

  return (
    <div className="stack">
      <div className="cbe-langs" role="tablist" aria-label="Consent languages">
        {codes.map((c) => (
          <span className="cbe-lang" key={c} data-on={c === active || undefined}>
            <button
              type="button"
              role="tab"
              aria-selected={c === active}
              onClick={() => setLang(c)}
            >
              {LANG_LABEL[c] || c}
              {c === defaultLang && <Tag tone="acc">Default</Tag>}
              {!stripTags(bodies[c]).trim() && <Tag tone="warn">Empty</Tag>}
            </button>
            {codes.length > 1 && (
              <IconButton icon="x" size="sm" label={`Remove ${LANG_LABEL[c] || c}`} onClick={() => removeLanguage(c)} />
            )}
          </span>
        ))}
        {available.length > 0 && !adding && (
          <Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add another language</Button>
        )}
        {adding && (
          <span className="cbe-add">
            <Select
              value={pending}
              options={available.map((l) => ({ value: l.code, label: l.label }))}
              placeholder="Choose a language"
              aria-label="Language to add"
              onChange={(e) => setPending(e.target.value)}
            />
            <Button size="sm" variant="pri" icon="check" disabled={!pending} onClick={addLanguage}>Add</Button>
            <Button size="sm" onClick={() => { setAdding(false); setPending('') }}>Cancel</Button>
          </span>
        )}
      </div>

      <Field
        label={`Consent text · ${LANG_LABEL[active] || active}`}
        required
        error={error}
        hint="What the identity reads before accepting. Formatting is preserved exactly as shown."
      >
        <div className="cbe" data-invalid={error ? true : undefined}>
          <div className="cbe-bar" role="toolbar" aria-label="Formatting">
            {TOOLS.map((t, i) => (t.divider ? (
              <span className="cbe-div" key={`d${i}`} aria-hidden="true" />
            ) : (
              <button
                type="button"
                key={t.cmd}
                className="cbe-tool"
                title={t.label}
                aria-label={t.label}
                // Keeps the selection in the editor: without this the button
                // takes focus first and the command has nothing to apply to.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(t.cmd)}
              >
                {t.icon ? <Icon name={t.icon} size={13} /> : <span className={t.cls}>{t.text}</span>}
              </button>
            )))}
            <span className="spacer" />
            <span className="t-xs t-mut">{stripTags(bodies[active]).trim().length} characters</span>
          </div>
          <div
            ref={ref}
            className="cbe-body"
            contentEditable
            suppressContentEditableWarning
            dir={RTL.has(active) ? 'rtl' : 'ltr'}
            role="textbox"
            aria-multiline="true"
            aria-label={`Consent text in ${LANG_LABEL[active] || active}`}
            // Keyed on the language so switching tabs re-seeds the editor. The
            // value is deliberately not fed back on every keystroke: doing so
            // would reset the caret to the start of the field on each character.
            key={active}
            dangerouslySetInnerHTML={{ __html: bodies[active] || '' }}
            onInput={(e) => onChange({ ...bodies, [active]: e.currentTarget.innerHTML })}
          />
        </div>
      </Field>

      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label="Default language" hint="Shown to identities whose locale has no translation.">
          <Select
            value={defaultLang}
            options={codes.map((c) => ({ value: c, label: LANG_LABEL[c] || c }))}
            onChange={(e) => onDefaultChange(e.target.value)}
          />
        </Field>
      </div>

      {empty.length > 0 && (
        <Banner tone="warn">
          {empty.map((c) => LANG_LABEL[c] || c).join(', ')} {empty.length === 1 ? 'has' : 'have'} no text.
          {' '}An identity in {empty.length === 1 ? 'that language' : 'those languages'} is shown the{' '}
          {LANG_LABEL[defaultLang]} version instead.
        </Banner>
      )}
    </div>
  )
}

export const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
