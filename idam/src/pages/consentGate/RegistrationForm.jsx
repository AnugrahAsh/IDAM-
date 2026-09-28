import { useEffect, useRef, useState } from 'react'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import Field from '../../components/primitives/Field'
import FileDrop, { formatSize } from '../../components/primitives/FileDrop'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import {
  REGISTRATION_SECTIONS, blankRegistration, missingRequired, optionsFor,
} from './consentGateData'

/* A tenant-defined attribute is not a platform one, and the recipient has no
   other way to tell "Region" from "Test attribute 2". The marker says which
   fields the organization added for its own records. */
const tenantMark = <span className="ci-tenant">tenant</span>

const labelFor = (f) => (f.tenant ? <>{f.label} {tenantMark}</> : f.label)

/**
 * The form behind a tokenised invitation.
 *
 * The consent checkbox is disabled until the document has actually been opened.
 * That is the point of the screen rather than a nicety: an agreement ticked by
 * someone who was never shown the text is not evidence of anything, so the
 * control that records the agreement stays inert until the text has been put in
 * front of them and dismissed with "I Understand".
 */
export default function RegistrationForm({
  invitation, doc, acknowledged, onOpenDocument, onSubmit, onCancel,
}) {
  const [values, setValues] = useState(() => blankRegistration(invitation))
  const [files, setFiles] = useState([])
  const [agreed, setAgreed] = useState(false)
  const [attempted, setAttempted] = useState(false)
  /* Counted rather than flagged: the second refusal has to move the page as
     much as the first did, and a boolean only changes once. */
  const [refused, setRefused] = useState(0)
  const [open, setOpen] = useState(() => new Set(REGISTRATION_SECTIONS.map((s) => s.id)))
  const shortRef = useRef(null)
  const agreeRef = useRef(null)

  const set = (id, v) => setValues((x) => ({ ...x, [id]: v }))
  const toggle = (id) => setOpen((o) => {
    const next = new Set(o)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const missing = missingRequired(values)
  const err = (f) => (attempted && f.required && !String(values[f.id] ?? '').trim()
    ? `${f.label} is required.`
    : undefined)

  const submit = () => {
    setAttempted(true)
    if (!missing.length && agreed) {
      onSubmit({ values, files })
      return
    }
    /* Both sections are reopened on a failed submit: a required field hidden
       inside a collapsed section is an error the recipient cannot see. */
    if (missing.length) setOpen(new Set(REGISTRATION_SECTIONS.map((s) => s.id)))
    setRefused((n) => n + 1)
  }

  /* Submit sits in the footer, outside the part of the panel that scrolls, so
     it can be pressed from a resting position that does not show the answer it
     produces — on a 1100x700 window the shortfall summary rendered 26px below
     the body's own bottom edge with nothing having scrolled to it, and the one
     line that names which fields are empty was unreachable unless the reader
     worked out there was a second scroller. A refusal has to put its own reason
     on screen. `nearest` because a summary already in view must not be yanked
     to the top of the panel under the reader. */
  useEffect(() => {
    if (!refused) return
    const el = shortRef.current || agreeRef.current
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [refused])

  const renderField = (f) => {
    if (f.locked) {
      return (
        <Field key={f.id} label={labelFor(f)} required={f.required} hint="Issued with your invitation.">
          <TextInput value={values[f.id] || ''} disabled />
        </Field>
      )
    }
    if (f.type === 'select') {
      const opts = optionsFor(f)
      const v = values[f.id] || ''
      // A value the invitation carried that is not in the list is still the
      // value on record, so it is offered rather than silently dropped.
      const list = v && !opts.includes(v) ? [v, ...opts] : opts
      return (
        <Field key={f.id} label={labelFor(f)} required={f.required} error={err(f)}>
          <Select
            value={v}
            placeholder={`Select ${f.label}`}
            options={list}
            onChange={(e) => set(f.id, e.target.value)}
          />
        </Field>
      )
    }
    return (
      <Field key={f.id} label={labelFor(f)} required={f.required} error={err(f)}>
        <TextInput
          type={f.type === 'tel' || f.type === 'date' ? f.type : 'text'}
          value={values[f.id] || ''}
          placeholder={f.type === 'date' ? undefined : `Enter ${f.label}`}
          onChange={(e) => set(f.id, e.target.value)}
        />
      </Field>
    )
  }

  /* The body and the decision are siblings rather than nested, so the panel
     that holds them can scroll the one and keep the other — the form is the
     part that gives when the window is short, and Submit stays on the bottom
     edge where every other long form in this console keeps it. */
  return (
    <>
      <div className="ci-form">
        {/* At the head of the form rather than at its foot. It is a summary of
            the form, and a summary read after the thing it summarises is no use
            to anyone; the console's own banners sit above the content they are
            about for the same reason. It also means the panel's resting
            position — where a reader who has filled nothing in still is — shows
            it without moving at all. */}
        {attempted && missing.length > 0 && (
          <p className="ci-short" role="alert" ref={shortRef}>
            <Icon name="warn" size={12} />
            {missing.length} required {missing.length === 1 ? 'field is' : 'fields are'} still empty:{' '}
            {missing.map((f) => f.label).join(', ')}.
          </p>
        )}

        {REGISTRATION_SECTIONS.map((s) => {
          const expanded = open.has(s.id)
          const shortCount = attempted ? s.fields.filter((f) => f.required && !String(values[f.id] ?? '').trim()).length : 0
          return (
            <section key={s.id} className="ci-sec">
              <button
                type="button"
                className="ci-sec-h"
                aria-expanded={expanded}
                aria-controls={`ci-sec-${s.id}`}
                onClick={() => toggle(s.id)}
              >
                <Icon name={expanded ? 'chevD' : 'chevR'} size={14} />
                <span className="ci-sec-t">{s.name}</span>
                <span className="ci-sec-rule" aria-hidden="true" />
                {/* The head used to end in "9 fields · 2 tenant-defined". A
                    recipient cannot do anything with either number — the fields
                    are in front of them and the badge already marks which ones
                    the organization added — so the only count kept here is the
                    one that asks for an action. */}
                {shortCount > 0 && (
                  <span className="t-xs ci-sec-err">
                    <Icon name="warn" size={11} />
                    {shortCount} missing
                  </span>
                )}
              </button>
              {expanded && (
                <div className="ci-sec-b" id={`ci-sec-${s.id}`}>
                  {s.fields.map(renderField)}
                </div>
              )}
            </section>
          )
        })}

        {/* The two blocks that close the form. Neither is a grid of fields, and
            on a wide panel each on its own row left a 1000px dashed bar above a
            1000px checkbox — so they share a row instead, which is also a
            screenful less to scroll past on a short window. */}
        <div className="ci-tail">
          <div className="ci-tail-c">
            <Field
              label="Upload document"
              hint="Proof of identity or employment. PDF, JPG or PNG, up to 5 MB."
            >
              <FileDrop
                accept=".pdf,.jpg,.jpeg,.png"
                label={files.length ? 'Attach another document' : 'Choose a file, or drag it here'}
                hint={files.length ? `${files.length} attached` : 'Optional — an administrator may ask for one later'}
                onFiles={(picked) => setFiles((f) => [...f, ...picked])}
              />
            </Field>

            {files.length > 0 && (
              <ul className="ci-docs">
                {files.map((f, i) => (
                  <li key={`${f.name}-${f.size}`} className="ci-doc">
                    <Icon name="file" size={13} />
                    <span className="ci-doc-n">{f.name}</span>
                    <span className="ci-doc-s">{formatSize(f.size)}</span>
                    <IconButton
                      icon="x"
                      size="sm"
                      label={`Remove ${f.name}`}
                      onClick={() => setFiles((list) => list.filter((_, n) => n !== i))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ci-agree" data-locked={!acknowledged || undefined} ref={agreeRef}>
            <Check
              checked={agreed}
              disabled={!acknowledged}
              onChange={setAgreed}
              label={`I agree to the ${doc.title}`}
            />
            <div className="ci-agree-m">
              <p className="ci-agree-t">
                I agree to the{' '}
                <button type="button" className="link" onClick={onOpenDocument}>
                  Terms &amp; Policy
                  <Icon name="external" size={12} />
                </button>
              </p>
              {acknowledged ? (
                <p className="ci-agree-s" data-done="true">
                  <Icon name="checkC" size={12} />
                  You opened version {doc.version} of the Terms &amp; Policy. Tick the box to agree to it.
                </p>
              ) : (
                <p className="ci-agree-s">
                  <Icon name="lock" size={12} />
                  Open the Terms &amp; Policy and click <b>I Understand</b> to enable this checkbox.
                </p>
              )}
              {/* Submit does nothing while the box is clear, so it has to say why —
                  and why differs depending on whether the document has been read. */}
              {attempted && !agreed && (
                <p className="ci-agree-e" role="alert">
                  <Icon name="warn" size={11} />
                  {acknowledged
                    ? 'Registration cannot be submitted until you agree to the Terms & Policy.'
                    : 'Open the Terms & Policy before submitting — the agreement cannot be given until it has been read.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ci-foot">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="check" onClick={submit}>Submit</Button>
      </div>
    </>
  )
}
