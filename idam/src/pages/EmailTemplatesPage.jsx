import './styles/EmailTemplatesPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DetailHeader, { Fact } from '../components/shell/DetailHeader'
import StickyActions from '../components/shell/StickyActions'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import StatChip from '../components/primitives/StatChip'
import Pill from '../components/primitives/Pill'
import Tag from '../components/primitives/Tag'
import Tabs from '../components/primitives/Tabs'
import Field from '../components/primitives/Field'
import TextInput from '../components/primitives/TextInput'
import Select from '../components/primitives/Select'
import EmptyState from '../components/primitives/EmptyState'
import { useApp } from '../store/AppContext'
import { serialColumn } from '../lib/format'
import { TEMPLATES, PLACEHOLDERS, EMAIL_EVENTS, OUTBOX, stamp } from './comms/commsData'
import { ME } from '../data/seed'

const blank = () => ({
  id: null, name: '', description: '', subject: '', event: EMAIL_EVENTS[0],
  status: 'Active', sender: 'no-reply@tanflow.com', replyTo: 'support@tanflow.com',
  body: 'Hello {{firstName}},\n\n\n\nThe {{tenantName}} identity team',
  updated: stamp(0),
})

const render = (text, tone) => text
  .replace(/\{\{firstName\}\}/g, 'Shubham')
  .replace(/\{\{lastName\}\}/g, 'Jain')
  .replace(/\{\{username\}\}/g, ME.username)
  .replace(/\{\{email\}\}/g, ME.email)
  .replace(/\{\{organization\}\}/g, ME.organization)
  .replace(/\{\{tenantName\}\}/g, 'Tanflow Corp')
  .replace(/\{\{supportEmail\}\}/g, 'support@tanflow.com')
  .replace(/\{\{expiryHours\}\}/g, '24')
  .replace(/\{\{actionUrl\}\}/g, tone === 'plain' ? 'https://id.tanflow.com/a/8f21c4' : 'ACTION_LINK')

function TemplateEditor({ record, onSave, onCancel, onDelete }) {
  const { toast, setDrawer } = useApp()
  const [form, setForm] = useState(() => ({ ...record }))
  const [tab, setTab] = useState('content')
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState({})
  const creating = record.id == null

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }))
    setDirty(true)
  }

  const insert = (token) => {
    setForm((f) => ({ ...f, body: `${f.body}${f.body.endsWith('\n') || f.body === '' ? '' : ' '}${token}` }))
    setDirty(true)
  }

  const submit = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'A template name is required.'
    if (!form.subject.trim()) next.subject = 'A subject line is required.'
    if (!form.body.trim()) next.body = 'The body cannot be empty.'
    setErrors(next)
    if (Object.keys(next).length) {
      toast('bad', 'Cannot save', 'Fix the highlighted fields and try again.')
      return
    }
    onSave({ ...form, updated: stamp(0) })
  }

  const sendTest = () => setDrawer({
    title: 'Send a test message',
    sub: form.name || 'Untitled template',
    footer: (
      <>
        <Button onClick={() => setDrawer(null)}>Cancel</Button>
        <Button variant="pri" icon="mail" onClick={() => { setDrawer(null); toast('ok', 'Test queued', 'A rendered copy is on its way.') }}>Send test</Button>
      </>
    ),
    children: (
      <div className="stack">
        <Field label="Destination address" required hint="Placeholders are filled with your own identity.">
          <TextInput defaultValue={ME.email} />
        </Field>
      </div>
    ),
  })

  const used = PLACEHOLDERS.filter((p) => form.body.includes(p.token) || form.subject.includes(p.token))

  return (
    <>
      <DetailHeader
        backTo="/iam/emailTemplates"
        backLabel="Email Templates"
        eyebrow={creating ? 'New template' : 'Email template'}
        title={form.name || 'Untitled template'}
        sub={form.description || 'Transactional message issued by the identity platform.'}
        badges={
          <>
            <Pill tone={form.status === 'Active' ? 'ok' : 'mut'} dot>{form.status}</Pill>
            <Tag>{form.event}</Tag>
          </>
        }
        meta={
          !creating && (
            <>
              <Fact icon="clock" label="Updated" value={record.updated} />
            </>
          )
        }
        actions={
          <>
            <Button icon="mail" onClick={sendTest}>Send test</Button>
            {!creating && <Button icon="copy" onClick={() => toast('ok', 'Duplicated', `${form.name} copy created.`)}>Duplicate</Button>}
            {!creating && <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>}
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'content', label: 'Content', icon: 'file' },
              { id: 'placeholders', label: 'Placeholders', icon: 'code', count: PLACEHOLDERS.length },
              { id: 'settings', label: 'Settings', icon: 'sliders' },
              { id: 'delivery', label: 'Delivery history', icon: 'activity' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'content' && (
          <div className="detail-cols">
            <div className="stack">
              <Card title="Message" sub="Placeholders resolve against the recipient at send time.">
                <div className="stack">
                  <Field label="Template name" required error={errors.name}>
                    <TextInput value={form.name} onChange={set('name')} placeholder="Welcome" />
                  </Field>
                  <Field label="Description" hint="Shown in the template list so operators know when it fires.">
                    <TextInput value={form.description} onChange={set('description')} />
                  </Field>
                  <Field label="Subject" required error={errors.subject}>
                    <TextInput value={form.subject} onChange={set('subject')} />
                  </Field>
                  <Field label="Body" required error={errors.body}>
                    <TextInput as="textarea" rows={16} value={form.body} onChange={set('body')} style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-xs)' }} />
                  </Field>
                </div>
              </Card>

              <Card title="Insert a placeholder" sub="Click to append it to the body.">
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {PLACEHOLDERS.map((p) => (
                    <button type="button" className="chip" key={p.token} title={p.desc} onClick={() => insert(p.token)}>
                      <Icon name="plus" size={11} />
                      <span className="mono">{p.token}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <div className="stack">
              <Card title="Live preview" sub="Rendered with your own identity">
                <div className="mail-preview">
                  <div className="mail-preview-h">
                    <div className="t-xs t-mut">From</div>
                    <div className="t-sm">{form.sender}</div>
                    <div className="t-xs t-mut" style={{ marginTop: 6 }}>Subject</div>
                    <div className="t-sm" style={{ fontWeight: 600 }}>{render(form.subject || '(no subject)')}</div>
                  </div>
                  <div className="mail-preview-b">{render(form.body, 'plain')}</div>
                </div>
              </Card>

              <Card title="Placeholders in use" sub={`${used.length} of ${PLACEHOLDERS.length} referenced`}>
                {used.length === 0 ? (
                  <div className="t-sm t-mut">This template contains no placeholders, so every recipient receives identical text.</div>
                ) : (
                  used.map((p) => (
                    <div className="kv-row" key={p.token}>
                      <span className="kv-ic"><Icon name="code" size={12} /></span>
                      <span className="kv-m">
                        <span className="kv-k mono">{p.token}</span>
                        <span className="kv-v">{p.desc}</span>
                      </span>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        )}

        {tab === 'placeholders' && (
          <Card title="Available merge fields" sub="Every token the rendering engine understands." flush>
            <table className="tbl">
              <thead><tr><th>Token</th><th>Resolves to</th><th>Example</th></tr></thead>
              <tbody>
                {PLACEHOLDERS.map((p) => (
                  <tr key={p.token}>
                    <td className="td-mono td-main">{p.token}</td>
                    <td>{p.desc}</td>
                    <td className="td-mono">{render(p.token, 'plain')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === 'settings' && (
          <div className="grid grid-2">
            <Card title="Trigger" sub="The platform event that sends this template.">
              <div className="stack">
                <Field label="Event" hint="One template per event; the newest active version wins.">
                  <Select value={form.event} options={EMAIL_EVENTS} onChange={set('event')} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} options={['Active', 'Inactive']} onChange={set('status')} />
                </Field>
              </div>
            </Card>
            <Card title="Addressing">
              <div className="stack">
                <Field label="From address"><TextInput value={form.sender} onChange={set('sender')} /></Field>
                <Field label="Reply-to"><TextInput value={form.replyTo} onChange={set('replyTo')} /></Field>
              </div>
            </Card>
          </div>
        )}

        {tab === 'delivery' && (
          <Card title="Recent deliveries" sub={`Messages sent from ${form.name || 'this template'}`} flush>
            {(() => {
              const rows = OUTBOX.filter((o) => o.template === record.name)
              if (!rows.length) {
                return <EmptyState icon="mail" title="No deliveries yet" body="Nothing has been sent from this template in the retention window." size="sm" />
              }
              return (
                <table className="tbl">
                  <thead><tr><th>Recipient</th><th>Email</th><th>Status</th><th>Sent</th><th>Gateway</th></tr></thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.id}>
                        <td className="td-main">{o.user}</td>
                        <td>{o.email}</td>
                        <td><Pill tone={o.status === 'Sent' ? 'ok' : o.status === 'Failed' ? 'bad' : 'warn'} dot>{o.status}</Pill></td>
                        <td className="td-mono">{o.sent || '—'}</td>
                        <td className="td-mono">{o.gateway}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
          </Card>
        )}
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{creating ? 'Create template' : 'Save changes'}</Button>
      </StickyActions>
    </>
  )
}

export default function EmailTemplatesPage({ segments = [], embedded }) {
  const { navigate, toast, confirm, setModal } = useApp()
  const [rows, setRows] = useState(() => TEMPLATES.map((t) => ({ ...t })))
  const [chip, setChip] = useState(null)

  const rowFilter = useMemo(() => (chip === 'active' ? (r) => r.status === 'Active' : undefined), [chip])
  const pickChip = (id) => setChip((c) => (c === id ? null : id))

  const mode = segments[0]
  const record = useMemo(
    () => (mode && mode !== 'add' ? rows.find((r) => String(r.id) === String(mode)) : null),
    [mode, rows],
  )

  if (mode === 'add') {
    return (
      <TemplateEditor
        record={blank()}
        onCancel={() => navigate('/iam/emailTemplates')}
        onDelete={() => {}}
        onSave={(v) => {
          setRows((rs) => [...rs, { ...v, id: rs.reduce((m, r) => Math.max(m, r.id), 0) + 1 }])
          toast('ok', 'Template created', v.name)
          navigate('/iam/emailTemplates')
        }}
      />
    )
  }

  if (mode) {
    if (!record) {
      return (
        <>
          <PageBar
            title="Template not found"
            sub="The template may have been deleted in this session, or the link may be stale."
            crumbs={[{ label: 'Email Templates', to: 'emailTemplates' }, { label: 'Not found' }]}
          />
          <Card>
            <EmptyState
              icon="file"
              title="No such template"
              body={`Template ${mode} does not exist. It may have been deleted.`}
              actions={<Button variant="pri" onClick={() => navigate('/iam/emailTemplates')}>Back to templates</Button>}
            />
          </Card>
        </>
      )
    }
    return (
      <TemplateEditor
        record={record}
        onCancel={() => navigate('/iam/emailTemplates')}
        onSave={(v) => {
          setRows((rs) => rs.map((r) => (r.id === v.id ? v : r)))
          toast('ok', 'Template saved', v.name)
          navigate('/iam/emailTemplates')
        }}
        onDelete={(r) => confirm({
          title: `Delete ${r.name}?`,
          body: 'The event that fires this template will stop sending mail until another active template claims it.',
          confirmLabel: 'Delete template',
          onConfirm: () => {
            setRows((rs) => rs.filter((x) => x.id !== r.id))
            toast('ok', 'Template deleted', r.name)
            navigate('/iam/emailTemplates')
          },
        })}
      />
    )
  }

  const preview = (r) => setModal({
    title: r.name,
    tone: 'acc',
    icon: 'mail',
    size: 'lg',
    cancelLabel: 'Close',
    children: (
      <div className="mail-preview" style={{ margin: 0 }}>
        <div className="mail-preview-h">
          <div className="t-xs t-mut">Subject</div>
          <div className="t-sm" style={{ fontWeight: 600 }}>{render(r.subject)}</div>
        </div>
        <div className="mail-preview-b">{render(r.body, 'plain')}</div>
      </div>
    ),
  })

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Template', cls: 'td-main', locked: true,
      render: (r) => (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.name}</span>
          <span className="cell-sub">{r.description}</span>
        </span>
      ),
    },
    { key: 'description', label: 'Description' },
    { key: 'subject', label: 'Subject' },
    { key: 'event', label: 'Event', cls: 'td-mono', render: (r) => <Tag>{r.event}</Tag> },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill> },
    { key: 'updated', label: 'Updated', cls: 'td-mono' },
  ]

  return (
    <>
      {!embedded && (
        <PageBar
          title="Email Templates"
          sub="Every transactional message the platform sends, with the event that triggers it."
          crumbs={[{ label: 'Email Templates' }]}
          actions={
            <>
              <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Templates exported as JSON.')}>Export</Button>
              <Button variant="pri" icon="plus" onClick={() => navigate('/iam/emailTemplates/add')}>Add Template</Button>
            </>
          }
          rail={
            <>
              <StatChip icon="file" active={!chip} onClick={() => setChip(null)}>{rows.length} templates</StatChip>
              <StatChip icon="checkC" active={chip === 'active'} onClick={() => pickChip('active')}>{rows.filter((r) => r.status === 'Active').length} active</StatChip>
            </>
          }
        />
      )}

      <DataWorkbench
        id="email-templates"
        filter={rowFilter}
        rows={rows}
        columns={columns}
        selectable
        searchPlaceholder="Search by name, subject or event…"
        onRowClick={(r) => navigate(`/iam/emailTemplates/${r.id}`)}
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" icon="checkC" onClick={() => {
              const s = new Set(ids.map(String))
              setRows((rs) => rs.map((r) => (s.has(String(r.id)) ? { ...r, status: 'Active' } : r)))
              clear(); toast('ok', 'Templates activated', `${ids.length} updated.`)
            }}>Activate</Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => confirm({
              title: `Delete ${ids.length} templates?`,
              body: 'Events bound to these templates stop sending mail until replaced.',
              confirmLabel: `Delete ${ids.length}`,
              onConfirm: () => {
                const s = new Set(ids.map(String))
                setRows((rs) => rs.filter((r) => !s.has(String(r.id))))
                clear(); toast('ok', 'Templates deleted', `${ids.length} removed.`)
              },
            })}>Delete</Button>
          </>
        )}
        rowActions={(r) => [
          { id: 'edit', label: 'View / Edit', icon: 'edit', onSelect: () => navigate(`/iam/emailTemplates/${r.id}`) },
          { id: 'prev', label: 'Preview', icon: 'eye', onSelect: () => preview(r) },
          { id: 'dup', label: 'Duplicate', icon: 'copy', onSelect: () => toast('ok', 'Duplicated', `${r.name} copy created.`) },
          { divider: true },
          {
            id: 'del', label: 'Delete', icon: 'trash', danger: true,
            onSelect: () => confirm({
              title: `Delete ${r.name}?`,
              body: 'The event that fires this template stops sending mail until another active template claims it.',
              confirmLabel: 'Delete template',
              onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Template deleted', r.name) },
            }),
          },
        ]}
        emptyTitle="No templates match"
        emptyBody="Adjust the search to widen the result set."
        emptyIcon="file"
      />
    </>
  )
}
