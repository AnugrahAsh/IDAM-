import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { ME } from '../../data/seed'
import { PLACEHOLDERS } from '../shared/comms/commsData'
import HtmlEditor from './HtmlEditor'
import { render } from './emailTemplateData'

/**
 * One template, on a page of its own.
 *
 * This was a dialog, and a dialog is the wrong container for it: the body
 * source sits beside a live preview, and both were competing for height with a
 * scrolling modal and a footer pinned over them. On a page they get the room
 * they need and the address bar names what is being edited.
 *
 * What a template *is* — its code, the event that fires it, the provider that
 * carries it, its name — is fixed at creation and is not editable here. Those
 * are the identifiers other configuration is written against; changing one
 * from an edit screen silently breaks whatever points at it. What an author
 * actually changes is the wording: the subject, the body and the addressing.
 */
export default function TemplateRecord({ record, onSave, onDelete, backTo }) {
  const { toast, navigate } = useApp()
  const [d, setD] = useState(() => ({ ...record }))
  const [errors, setErrors] = useState({})
  const set = (patch) => { setErrors({}); setD((p) => ({ ...p, ...patch })) }

  if (!record) {
    return (
      <EmptyState
        icon="file"
        title="No such template"
        body="The template may have been deleted, or the link is stale. Open the register to find the current one."
        actions={<Button variant="pri" icon="chevL" onClick={() => navigate(backTo)}>Back to templates</Button>}
      />
    )
  }

  const dirty = d.subject !== record.subject
    || d.body !== record.body
    || d.description !== record.description
    || d.sender !== record.sender
    || d.replyTo !== record.replyTo

  const submit = () => {
    const e = {}
    if (!String(d.subject || '').trim()) e.subject = 'A subject line is required.'
    if (!String(d.body || '').trim()) e.body = 'The body cannot be empty.'
    setErrors(e)
    if (Object.keys(e).length) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    onSave(d)
  }

  // Appending is the only insertion point a plain textarea offers without
  // taking over its selection handling, and it is where an author is typing.
  const insert = (token) => set({
    body: `${d.body}${d.body.endsWith('\n') || d.body === '' ? '' : ' '}${token}`,
  })

  return (
    <>
      <DetailHeader
        backTo={backTo}
        backLabel="Templates"
        eyebrow="Email template"
        title={d.name}
        sub={d.description || 'The message this event renders and sends.'}
        media={(
          <span className="feed-ic" data-tone="acc" style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)' }}>
            <Icon name="mail" size={22} />
          </span>
        )}
        badges={(
          <>
            <Pill tone={d.status === 'Active' ? 'ok' : 'mut'} dot>{d.status}</Pill>
            <Tag><span className="mono">{d.code}</span></Tag>
          </>
        )}
        meta={(
          <>
            <Fact icon="tag" label="Template code" value={d.code} />
            <Fact icon="bolt" label="Event" value={d.event} />
            <Fact icon="at" label="From" value={d.sender} />
          </>
        )}
        actions={(
          <>
            <Button
              icon="mail"
              onClick={() => toast('ok', 'Test queued', `A rendered copy of ${d.name} is on its way to ${ME.email}.`)}
            >
              Send test
            </Button>
            <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>
          </>
        )}
      />

      <div className="detail-body">
        <div className="stack">
          <Card title="Identity" sub="Fixed at creation — other configuration is written against these">
            <div className="grid grid-2">
              <Field label="Template Name" hint="The name the register and every reference use.">
                <TextInput value={d.name} disabled readOnly />
              </Field>
              <Field label={<>Description<span className="em-lbl-hint">shown in the register</span></>}>
                <TextInput value={d.description || ''} onChange={(e) => set({ description: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Subject" sub="Placeholders are filled per recipient when the message is rendered">
            <Field label="Subject" required error={errors.subject} htmlFor="em-tpl-subject">
              <TextInput
                id="em-tpl-subject"
                value={d.subject}
                placeholder="Your Tanflow account is ready"
                onChange={(e) => set({ subject: e.target.value })}
              />
            </Field>
          </Card>

          <Card title="Body" sub="HTML source on the left, rendered with your own identity on the right">
            <div className="em-body">
              <Field
                label={<>HTML Source<span className="em-lbl-hint">the preview renders as you type</span></>}
                required
                error={errors.body}
                htmlFor="em-tpl-body"
              >
                <HtmlEditor
                  id="em-tpl-body"
                  rows={20}
                  value={d.body}
                  invalid={!!errors.body}
                  onChange={(v) => set({ body: v })}
                />
              </Field>
              <div className="stack">
                <div className="em-prev-l">Preview — rendered with your own identity</div>
                <div className="mail-preview">
                  <div className="mail-preview-h">
                    <div className="t-xs t-mut">From</div>
                    <div className="t-sm">{d.sender}</div>
                    <div className="t-xs t-mut" style={{ marginTop: 6 }}>Subject</div>
                    <div className="t-sm" style={{ fontWeight: 600 }}>{render(d.subject || '(no subject)')}</div>
                  </div>
                  {/* Rendered, not escaped: the point of a preview is to show
                      what the recipient's mail client will draw. */}
                  <div className="mail-render" dangerouslySetInnerHTML={{ __html: render(d.body) }} />
                </div>
              </div>
            </div>
            <div className="em-tokens">
              {PLACEHOLDERS.map((p) => (
                <button type="button" className="chip" key={p.token} title={p.desc} onClick={() => insert(p.token)}>
                  <Icon name="plus" size={11} />
                  <span className="mono">{p.token}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Addressing" sub="What the recipient sees in the From and Reply-To headers">
            <div className="grid grid-2">
              <Field label="From Address" htmlFor="em-tpl-from">
                <TextInput id="em-tpl-from" value={d.sender} onChange={(e) => set({ sender: e.target.value })} />
              </Field>
              <Field label="Reply-To" htmlFor="em-tpl-reply">
                <TextInput id="em-tpl-reply" value={d.replyTo} onChange={(e) => set({ replyTo: e.target.value })} />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        message={dirty ? 'Unsaved changes to this template' : `Saved · ${d.code}`}
      >
        <Button onClick={() => navigate(backTo)}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!dirty} onClick={submit}>Save template</Button>
      </StickyActions>
    </>
  )
}
