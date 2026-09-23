import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import Switch from '../../components/primitives/Switch'
import { CHANNELS, POPUP_FREQUENCIES, POPUP_SIZES } from '../shared/comms/commsData'
import { useState } from 'react'
import AudiencePicker from '../shared/comms/AudiencePicker'
import {
  audienceIssue, describeAudience, reachIsExact, reachOf, readAudience, writeAudience,
} from '../shared/comms/audienceModel'
import { useNotificationTaxonomy } from '../settings/settingsStore'
import { statusTone } from './announcementData'

export default function AnnouncementEditor({ record, onSave, onCancel, onDelete, onPublish }) {
  const { toast, navigate } = useApp()
  /* Both dropdowns are tenant vocabulary, edited under Settings → Notification
     Management Setup. Read rather than imported, so a category added there is
     offered here without a build. */
  const taxonomy = useNotificationTaxonomy()
  const categories = taxonomy.categories.map((c) => c.label)
  const severities = taxonomy.severities.map((sv) => sv.label)
  const toneOf = (label) => taxonomy.categories.find((c) => c.label === label)?.tone || 'mut'

  const [form, setForm] = useState(() => ({
    popupFrequency: POPUP_FREQUENCIES[0],
    popupSize: POPUP_SIZES[1],
    popupDismissLabel: 'Got it',
    popupAcknowledge: false,
    popupBlocking: false,
    category: taxonomy.categories[0]?.label || '',
    ...record,
  }))
  // The audience is edited as its own object and flattened back onto the record
  // on save, so the legacy `audience` string stays populated for the register.
  const [audience, setAudience] = useState(() => readAudience(record))
  const [tab, setTab] = useState('content')
  const [dirty, setDirty] = useState(false)
  const isPopup = String(form.channel || '').includes('Pop-up')
  const [errors, setErrors] = useState({})
  const creating = record.id == null

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }

  const compose = () => ({ ...form, ...writeAudience(audience) })

  const submit = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'A title is required.'
    if (!form.description.trim()) next.description = 'A body is required.'
    setErrors(next)
    if (Object.keys(next).length) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    const issue = audienceIssue(audience)
    if (issue) { toast('warn', 'Check the audience', issue); return }
    onSave(compose())
  }

  const estimated = reachOf(audience)
  const audienceLabel = describeAudience(audience)

  return (
    <>
      <DetailHeader
        backTo="/iam/notifications/manage"
        backLabel="Notification Management"
        eyebrow={creating ? 'New announcement' : 'Announcement'}
        title={form.title || 'Untitled announcement'}
        sub={`Delivered to ${audienceLabel} over ${form.channel}.`}
        badges={
          <>
            <Pill tone={statusTone[form.status]} dot>{form.status}</Pill>
            <Pill tone={toneOf(form.category)}>{form.category}</Pill>
            <SeverityBadge level={form.severity === 'info' ? 'low' : form.severity === 'warn' ? 'medium' : form.severity === 'high' ? 'high' : 'critical'}>
              {form.severity}
            </SeverityBadge>
          </>
        }
        meta={
          !creating && (
            <>
              <Fact icon="users" label="Reach" value={num(record.reach)} />
              <Fact icon="clock" label="Schedule on" value={form.scheduleOn || 'Not scheduled'} />
            </>
          )
        }
        actions={
          <>
            {form.status !== 'Published' && (
              <Button variant="pri" icon="bell" onClick={() => onPublish(compose())}>Publish now</Button>
            )}
            {!creating && <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>}
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'content', label: 'Content', icon: 'file' },
              { id: 'audience', label: 'Audience', icon: 'users' },
              { id: 'schedule', label: 'Schedule', icon: 'calendar' },
              { id: 'delivery', label: 'Delivery', icon: 'activity' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'content' && (
          <div className="detail-cols">
            <Card title="Message" sub="Shown in the notification center and, if selected, by email.">
              <div className="stack">
                <Field label="Title" required error={errors.title}>
                  <TextInput value={form.title} onChange={set('title')} placeholder="Scheduled maintenance" />
                </Field>
                <Field label="Body" required error={errors.description} hint="Keep it to two or three sentences; link out for detail.">
                  <TextInput as="textarea" rows={8} value={form.description} onChange={set('description')} />
                </Field>
                <div className="grid grid-2">
                  <Field label="Category" hint="How the notice is filed and filtered in the notification center." htmlFor="an-cat">
                    <Select id="an-cat" value={form.category} options={categories} onChange={set('category')} />
                  </Field>
                  <Field label="Severity" hint="Drives the icon tone and whether it pins to the top." htmlFor="an-sev">
                    <Select id="an-sev" value={form.severity} options={severities} onChange={set('severity')} />
                  </Field>
                </div>
                {/* Where these two lists come from. Without it the only way to
                    discover that they are editable is to go looking. */}
                <p className="t-xs t-mut" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sliders" size={12} />
                  <span>
                    These options are tenant vocabulary.{' '}
                    <button type="button" className="link" onClick={() => navigate('settings')}>
                      Manage categories and severities in Settings
                    </button>.
                  </span>
                </p>
              </div>
            </Card>

            <Card title="Preview" sub="How it appears in the notification center">
              <div className="feed">
                <div className="feed-it">
                  <span className="feed-ic" data-tone={form.severity === 'info' ? 'acc' : form.severity === 'warn' ? 'warn' : 'bad'}>
                    <Icon name={form.severity === 'info' ? 'info' : 'warn'} size={13} />
                  </span>
                  <div className="feed-m">
                    <div className="feed-t"><b>{form.title || 'Untitled announcement'}</b></div>
                    <div className="t-sm t-mut" style={{ marginTop: 4, lineHeight: 1.55 }}>
                      {form.description || 'The body of the announcement appears here.'}
                    </div>
                    <div className="feed-s" style={{ marginTop: 6 }}>
                      <span>{audienceLabel}</span>
                      <Tag>{form.category}</Tag>
                      <Tag>{form.channel}</Tag>
                    </div>
                  </div>
                  <span className="feed-time">{form.scheduleOn || 'now'}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'audience' && (
          <div className="grid grid-2">
            <Card title="Who receives it" sub="Evaluated when the announcement publishes." className="aud-card">
              <div className="stack">
                <AudiencePicker
                  value={audience}
                  onChange={(v) => { setAudience(v); setDirty(true) }}
                  idPrefix="an-aud"
                  hint="A standing group, named people, or everyone matching a condition."
                />
                <Field label="Channel" htmlFor="an-chan"><Select id="an-chan" value={form.channel} options={CHANNELS} onChange={set('channel')} /></Field>
              </div>
            </Card>
            {isPopup && (
              <Card title="Pop-up behaviour" sub="How the modal is shown when the identity next signs in">
                <div className="stack">
                  <Field label="How often" hint="How many times an identity is shown the pop-up.">
                    <Select value={form.popupFrequency} options={POPUP_FREQUENCIES} onChange={set('popupFrequency')} />
                  </Field>
                  <Field label="Size">
                    <Select value={form.popupSize} options={POPUP_SIZES} onChange={set('popupSize')} />
                  </Field>
                  <Field label="Dismiss button" hint="Text on the button that closes the pop-up.">
                    <TextInput value={form.popupDismissLabel} placeholder="Got it" onChange={set('popupDismissLabel')} />
                  </Field>
                  <div className="row" style={{ gap: 10 }}>
                    <Switch checked={!!form.popupAcknowledge} onChange={(v) => { setForm((f) => ({ ...f, popupAcknowledge: v })); setDirty(true) }} label="Require acknowledgement" />
                    <span className="t-sm">Record who acknowledged it, and keep showing it until they do</span>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <Switch checked={!!form.popupBlocking} onChange={(v) => { setForm((f) => ({ ...f, popupBlocking: v })); setDirty(true) }} label="Block the console" />
                    <span className="t-sm">Block the console behind the pop-up until it is dismissed</span>
                  </div>
                </div>
              </Card>
            )}

            {isPopup && (
              <Card title="Pop-up preview" sub="What the identity sees on their next sign-in">
                <div className="popup-preview" data-size={form.popupSize}>
                  <div className="popup-card">
                    <div className="popup-h">
                      <span className="feed-ic" data-tone={form.severity === 'info' ? 'acc' : form.severity === 'warn' ? 'warn' : 'bad'}>
                        <Icon name={form.severity === 'info' ? 'info' : 'warn'} size={13} />
                      </span>
                      <span className="t-h3">{form.title || 'Untitled announcement'}</span>
                    </div>
                    <div className="popup-b t-sm">
                      {form.description || 'The body of the announcement appears here.'}
                    </div>
                    <div className="popup-f">
                      {form.popupAcknowledge && <span className="t-xs t-mut">Acknowledgement is recorded</span>}
                      <span className="spacer" />
                      <span className="popup-btn">{form.popupDismissLabel || 'Got it'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card title="Delivery estimate" sub="Based on the current audience">
              <div className="stat-strip">
                <div className="stat-cell">
                  <span className="stat-k">{reachIsExact(audience) ? 'Identities in scope' : 'Estimated reach'}</span>
                  <span className="stat-v">{num(estimated)}</span>
                </div>
                <div className="stat-cell"><span className="stat-k">Channel</span><span className="stat-v" style={{ fontSize: '.9375rem' }}>{form.channel}</span></div>
                {isPopup && <div className="stat-cell"><span className="stat-k">Shown</span><span className="stat-v" style={{ fontSize: '.9375rem' }}>{form.popupFrequency}</span></div>}
              </div>
              {form.channel.includes('Email') && (
                <Banner tone="warn" style={{ marginTop: 14 }}>
                  This will generate <b>{num(estimated)} emails</b> through the relay. Check the daily
                  send cap on Email Configuration before publishing to a large audience.
                </Banner>
              )}
            </Card>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="grid grid-2">
            <Card title="When it publishes">
              <div className="stack">
                <Field label="Schedule on" hint="Leave blank to publish immediately when you press Publish now.">
                  <TextInput value={form.scheduleOn} onChange={set('scheduleOn')} placeholder="2026-08-12 09:00" />
                </Field>
                <Field label="Status"><Select value={form.status} options={['Draft', 'Scheduled', 'Published']} onChange={set('status')} /></Field>
              </div>
            </Card>
            <Card title="Lifecycle">
              <div className="tl">
                <div className="tl-it" data-tone={form.status === 'Draft' ? 'acc' : 'ok'}>
                  <span className="tl-dot"><Icon name="edit" size={8} stroke={3} /></span>
                  <div className="tl-t">Draft</div>
                  <div className="tl-s">Visible only to administrators.</div>
                </div>
                <div className="tl-it" data-tone={form.status === 'Scheduled' ? 'acc' : form.status === 'Published' ? 'ok' : 'mut'}>
                  <span className="tl-dot"><Icon name="calendar" size={8} stroke={3} /></span>
                  <div className="tl-t">Scheduled</div>
                  <div className="tl-s">{form.scheduleOn ? `Publishes at ${form.scheduleOn}.` : 'No publish time set.'}</div>
                </div>
                <div className="tl-it" data-tone={form.status === 'Published' ? 'ok' : 'mut'}>
                  <span className="tl-dot"><Icon name="bell" size={8} stroke={3} /></span>
                  <div className="tl-t">Published</div>
                  <div className="tl-s">Appears in the notification center for everyone in scope.</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Two columns, as on every other tab of this editor: the outcome alone
            left a page-wide panel holding two figures. */}
        {tab === 'delivery' && (
          <div className="grid grid-2">
            <Card title="Delivery outcome" sub={record.status === 'Published' ? 'Measured since publication' : 'Available once published'}>
              {record.status !== 'Published' ? (
                <EmptyState icon="activity" title="Not published yet" body="Delivery and read statistics appear once the announcement has been published." size="sm" />
              ) : (
                <div className="stat-strip">
                  <div className="stat-cell"><span className="stat-k">Reached</span><span className="stat-v">{num(record.reach)}</span></div>
                  <div className="stat-cell"><span className="stat-k">Published</span><span className="stat-v" style={{ fontSize: '.8125rem' }}>{record.scheduleOn}</span></div>
                </div>
              )}
            </Card>
            <Card title="Where it went" sub="The scope and channel this announcement was sent on">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Audience', v: audienceLabel, icon: 'users' },
                  { k: 'Channel', v: form.channel, icon: 'bell' },
                  { k: 'Category', v: form.category, icon: 'layers' },
                  { k: 'Severity', v: form.severity, icon: 'warn' },
                ]}
              />
            </Card>
          </div>
        )}
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{creating ? 'Create announcement' : 'Save changes'}</Button>
      </StickyActions>
    </>
  )
}

