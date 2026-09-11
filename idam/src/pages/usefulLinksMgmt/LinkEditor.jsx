import Select from '../../components/primitives/Select'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { useApp } from '../../store/AppContext'
import { useState } from 'react'
import AudiencePicker from '../comms/AudiencePicker'
import { audienceIssue, describeAudience, reachIsExact, reachOf, readAudience, writeAudience } from '../comms/audienceModel'
import { num } from '../../lib/format'

// Visibility used to be a fixed group plus a single attribute comparison. It is
// now the same audience control the notification centre uses, so "who sees
// this" is asked once, the same way, wherever it is asked — and a link can
// finally be shown to a named handful of people.
export const ATTR_OPERATORS = ['is', 'is not', 'contains']

const ICONS = ['link', 'file', 'help', 'globe', 'shield', 'book', 'server', 'apps']

const STATUSES = ['Published', 'Hidden']

/**
 * The quick-link editor.
 *
 * Tabbed, like the announcement editor it sits beside in the console. The
 * audience was previously a card in a third-width column, which left the
 * picker's three modes as three crushed slivers — the same control reads
 * properly at full width, and "who sees this" is the second question about a
 * link, not a footnote to the first.
 */
export default function LinkEditor({ record, onSave, onCancel, onDelete }) {
  const { toast } = useApp()
  const [form, setForm] = useState(() => ({ ...record }))
  // Read forward from whatever the record carries: the new shape, or the old
  // fixed audience, or the old single attribute comparison.
  const [audience, setAudience] = useState(() => readAudience(record, 'visibility'))
  const [tab, setTab] = useState('link')
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState({})
  const creating = record.id == null

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }

  const scopeLabel = describeAudience(audience)
  const estimated = reachOf(audience)

  const submit = () => {
    const next = {}
    if (!form.label.trim()) next.label = 'A title is required.'
    if (!form.url.trim()) next.url = 'A URL is required.'
    else if (!/^https?:\/\//.test(form.url)) next.url = 'The URL must start with http:// or https://'
    setErrors(next)
    if (Object.keys(next).length) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    const issue = audienceIssue(audience)
    if (issue) { toast('warn', 'Check the audience', issue); return }
    onSave({ ...form, ...writeAudience(audience, 'visibility') })
  }

  return (
    <>
      <DetailHeader
        backTo="/iam/usefullinks/manage"
        backLabel="Quick Links Management"
        eyebrow={creating ? 'New link' : 'Quick link'}
        title={form.label || 'Untitled link'}
        sub={form.description || 'A shortcut surfaced on the Quick Links page.'}
        badges={
          <>
            <Pill tone={form.status === 'Hidden' ? 'mut' : 'ok'} dot>{form.status === 'Hidden' ? 'Hidden' : 'Published'}</Pill>
            <Tag>{scopeLabel}</Tag>
          </>
        }
        meta={
          !creating && (
            <>
              <Fact icon="history" label="Created on" value={record.createdOn} />
              <Fact icon="user" label="Created by" value={record.createdBy} />
            </>
          )
        }
        actions={
          <>
            <Button icon="external" onClick={() => toast('info', 'Opening', form.url || 'No URL set')}>Open</Button>
            {!creating && <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>}
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'link', label: 'Link', icon: 'link' },
              { id: 'audience', label: 'Audience', icon: 'users' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'link' && (
          <div className="detail-cols">
            <Card title="Link" sub="What users see and where it takes them.">
              <div className="stack">
                <Field label="Title" required error={errors.label}>
                  <TextInput value={form.label} onChange={set('label')} placeholder="Administrator guide" />
                </Field>
                <Field label="URL" required error={errors.url}>
                  <TextInput value={form.url} onChange={set('url')} placeholder="https://docs.tanflow.com" />
                </Field>
                <Field label="Description" hint="One line explaining what the destination is for.">
                  <TextInput value={form.description} onChange={set('description')} />
                </Field>
                <div className="grid grid-2">
                  <Field label="Icon" hint="Drawn on the tile in Quick Links.">
                    <Select value={form.icon} options={ICONS} onChange={set('icon')} />
                  </Field>
                  {/* Status was only reachable from the register's row menu, so
                      the screen that owns the link could not answer whether it
                      was live. */}
                  <Field label="Status" hint="Hidden keeps the link out of Quick Links without deleting it.">
                    <Select value={form.status} options={STATUSES} onChange={set('status')} />
                  </Field>
                </div>
              </div>
            </Card>

            <Card title="Preview" sub="As it appears on Quick Links">
              <div className="tile">
                <div className="tile-k"><Icon name={form.icon} size={12} />{scopeLabel}</div>
                <div className="t-h3" style={{ marginTop: 6 }}>{form.label || 'Untitled link'}</div>
                <div className="t-xs t-mut" style={{ marginTop: 4 }}>{form.description || 'No description'}</div>
                <div className="code" style={{ marginTop: 10, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {form.url || 'https://'}
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'audience' && (
          <div className="grid grid-2">
            <Card title="Who sees this link" sub="Evaluated each time Quick Links is opened." className="aud-card">
              <AudiencePicker
                value={audience}
                onChange={(v) => { setAudience(v); setDirty(true) }}
                idPrefix="lk-aud"
                label="Visibility"
                hint="A standing group, named people, or everyone matching a condition."
              />
            </Card>

            <Card title="Reach" sub="How many identities the current scope resolves to.">
              <div className="stack">
                <div className="tile">
                  <div className="tile-k"><Icon name="users" size={12} />In scope</div>
                  <div className="t-display num" style={{ marginTop: 6 }}>{num(estimated)}</div>
                  <div className="t-xs t-mut" style={{ marginTop: 4 }}>
                    {reachIsExact(audience)
                      ? 'Exactly this many identities match the scope.'
                      : 'Estimated by the platform from the current directory.'}
                  </div>
                </div>
                <div className="banner" data-tone="info">
                  <Icon name="info" size={15} />
                  <div>
                    Everyone outside this scope reaches Quick Links without seeing the link at all.
                    Hiding a link and scoping it are different things: a hidden link is shown to nobody.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{creating ? 'Add Link' : 'Save changes'}</Button>
      </StickyActions>
    </>
  )
}
