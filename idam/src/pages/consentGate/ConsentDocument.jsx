import { useId } from 'react'
import Icon from '../../components/primitives/Icon'
import Select from '../../components/primitives/Select'
import { bodyOf, isRtl, languageLabel, languagesOf } from './consentGateData'
import './ConsentGate.css'

/**
 * A published consent document, as the person being asked reads it.
 *
 * Both consent screens show the same artefact and must keep showing the same
 * one: the post-login gate and the registration overlay differ only in what
 * they ask you to do at the bottom, so the header, the notice line, the
 * language selector and the bounded body live here and the footer is handed in.
 *
 * The header carries the three facts a consent screen is legally obliged to
 * carry — who is asking, which document, and which version of it — because an
 * acceptance is worthless if the record cannot name the text that was read.
 */
export default function ConsentDocument({
  doc, lang, onLang, footer, titleAs = 'h1', className = '',
}) {
  const titleId = useId()
  const codes = languagesOf(doc)
  const active = codes.includes(lang) ? lang : doc.defaultLang
  const Title = titleAs

  return (
    <section className={`cdoc ${className}`.trim()}>
      <header className="cdoc-h">
        <span className="cdoc-brand">{doc.tenant}</span>
        <span className="cdoc-hm">
          <span className="cdoc-eyebrow">Consent &amp; privacy policy</span>
          <Title className="cdoc-title" id={titleId}>{doc.title}</Title>
        </span>
        <span className="cdoc-ver">Version {doc.version}</span>
      </header>

      <div className="cdoc-notice">
        <p className="cdoc-notice-t">
          <Icon name="info" size={14} />
          Please read the following terms carefully.
        </p>
        {/* The language set belongs to the document, not to the console: a
            notice published in three languages offers three, and a notice
            published in one offers no choice at all. */}
        {codes.length > 1 && (
          <label className="cdoc-lang">
            <span className="cdoc-lang-k">Language</span>
            <Select
              value={active}
              options={codes.map((c) => ({ value: c, label: languageLabel(c) }))}
              onChange={(e) => onLang(e.target.value)}
            />
          </label>
        )}
      </div>

      {/* Bounded and scrollable, and therefore focusable: a panel that only a
          mouse wheel can move is a panel a keyboard reader cannot finish.
          Keyed on the language so that switching it returns the reader to the
          top of the new text rather than to wherever the old one was cut. */}
      <div
        className="cdoc-body"
        role="region"
        aria-labelledby={titleId}
        tabIndex={0}
        dir={isRtl(active) ? 'rtl' : 'ltr'}
        lang={active}
        key={active}
        dangerouslySetInnerHTML={{ __html: bodyOf(doc, active) }}
      />

      {footer && <footer className="cdoc-f">{footer}</footer>}
    </section>
  )
}
