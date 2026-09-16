import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RecordCard, { CardIcon } from '../../components/workbench/RecordCard'
import StickyActions from '../../components/shell/StickyActions'
import { ME } from '../../data/seed'
import { useApp } from '../../store/AppContext'
import EmailsPage from './EmailsPage'
import { EMAIL_PROVIDERS, TEMPLATES } from '../shared/comms/commsData'
import { DeliveryFields, SmtpFields } from './EmailForms'
import EmailHealth from './EmailHealth'
import TemplateRecord from './TemplateRecord'
import {
  authType, encryptionShort, fromProviderDraft, providerErrors, toProviderDraft, toggleStatus, upsertRow,
} from './emailData'

/* ---------------------------------------------------------------------------
   Email Management.

   One relay, the templates it renders, and the register of what it carried.

   It used to be a list of providers, a list of templates and a list of clients,
   each edited through a dialog that held a screen of fields. A tenant sends
   through one relay; a provider register asked an operator to pick a row before
   it would tell them anything about the only row there was. Configuration is
   now the thing itself, on the page, split into the questions it answers:
   where mail goes, what happens when it will not go, and whether any of it
   works.
   --------------------------------------------------------------------------- */

export const CONFIG_TABS = [
  { id: 'smtp', label: 'SMTP', icon: 'server' },
  { id: 'templates', label: 'Templates', icon: 'file' },
  { id: 'health', label: 'Health check', icon: 'shield' },
  { id: 'messages', label: 'Delivery log', icon: 'logs' },
]

export const CONFIG_TAB_IDS = CONFIG_TABS.map((t) => t.id)

const TEMPLATE_VIEWS = [
  { id: 'cards', label: 'Cards', icon: 'apps', desc: 'One card per template, with its subject' },
  { id: 'table', label: 'Table', icon: 'menu', desc: 'Dense register with sortable columns' },
]

const statusPill = (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill>

export default function EmailClientConfiguration({
  tab, onTab, messages, onMessagesChange, openTemplateId,
}) {
  const { toast, confirm, navigate } = useApp()
  /* One relay, not a list of them. The register carried several because the
     record shape allows it; the tenant has always sent through the first. */
  const [smtp, setSmtp] = useState(() => toProviderDraft(EMAIL_PROVIDERS[0]))
  const [draft, setDraft] = useState(() => toProviderDraft(EMAIL_PROVIDERS[0]))
  const [errors, setErrors] = useState({})
  const [templates, setTemplates] = useState(() => TEMPLATES.map((t) => ({ ...t })))
  const [templateView, setTemplateView] = useState('cards')
  const [testLog, setTestLog] = useState(null)
  const [testTo, setTestTo] = useState(ME.email)

  const set = (patch) => { setErrors({}); setDraft((p) => ({ ...p, ...patch })) }
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(smtp),
    [draft, smtp],
  )

  const saveSmtp = () => {
    const next = providerErrors(draft)
    setErrors(next || {})
    if (next) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    const committed = fromProviderDraft(draft)
    setSmtp(committed)
    setDraft(committed)
    toast('ok', 'SMTP saved', `Mail leaves through ${committed.host}:${committed.port}.`)
  }

  const revert = () => { setDraft(smtp); setErrors({}) }

  /* The handshake, run on demand. It opens a connection and stops before DATA,
     so it proves reachability, TLS and authentication without putting a message
     in anybody's inbox. */
  const runConnectionTest = () => {
    const r = draft
    setTestLog([
      { tone: 'dim', text: `connect ${r.host}:${r.port}` },
      { tone: 'ok', text: `220 ${r.host} ready` },
      {
        tone: 'dim',
        text: r.encryption
          ? `${encryptionShort(r.encryption)} negotiated · TLS_AES_256_GCM_SHA384`
          : 'no transport security negotiated',
      },
      {
        tone: r.auth === 'NONE' ? 'dim' : 'ok',
        text: r.auth === 'NONE'
          ? 'no authentication configured'
          : `authenticated with ${authType(r.auth).short} from process.env.${r.authEnvRef}`,
      },
      {
        tone: r.dkim ? 'ok' : 'warn',
        text: r.dkim
          ? 'DKIM selector tanflow._domainkey resolved'
          : 'DKIM signing disabled — mail may be marked as spam',
      },
      {
        tone: r.status === 'Active' ? 'ok' : 'bad',
        text: r.status === 'Active'
          ? 'connection healthy · handshake 142 ms'
          : 'relay inactive — nothing will be dispatched',
      },
    ])
    toast(
      r.status === 'Active' ? 'ok' : 'warn',
      r.status === 'Active' ? 'Connection successful' : 'Relay inactive',
      `${r.host}:${r.port} · ${encryptionShort(r.encryption) || 'no TLS'}`,
    )
  }

  /* ------------------------------------------------------------------ *
   * Templates
   * ------------------------------------------------------------------ */

  const openTemplate = (r) => navigate(`/iam/emails/templates/${r.id}`)

  const deleteTemplate = (r) => confirm({
    title: `Delete ${r.name}?`,
    body: 'The event bound to this template stops sending mail until another template claims it.',
    confirmLabel: 'Delete template',
    onConfirm: () => {
      setTemplates((list) => list.filter((x) => x.id !== r.id))
      toast('ok', 'Template deleted', r.name)
      navigate('/iam/emails/templates')
    },
  })

  const toggleTemplate = (r) => {
    const status = toggleStatus(r.status)
    setTemplates((list) => list.map((x) => (x.id === r.id ? { ...x, status } : x)))
    toast('ok', status === 'Active' ? 'Template activated' : 'Template deactivated', r.name)
  }

  const templateColumns = [
    { key: 'name', label: 'Name', cls: 'td-main', locked: true },
    { key: 'code', label: 'Template code', cls: 'td-mono' },
    { key: 'subject', label: 'Subject' },
    { key: 'event', label: 'Event', render: (r) => <Tag><span className="mono">{r.event}</span></Tag> },
    { key: 'status', label: 'Status', render: statusPill },
  ]

  /* Compact: a template row is a name, a code and one endpoint or subject. At
     the standard card size a screen of them was mostly padding, and the same
     twelve templates needed three times the scrolling. */
  const renderTemplateCard = (r, ctx) => (
    <RecordCard
      compact
      ctx={ctx}
      label={r.name}
      media={<CardIcon name="mail" tone={r.status === 'Active' ? 'ok' : 'mut'} />}
      title={r.name}
      sub={r.code}
      tags={(
        <>
          {statusPill(r)}
          <span className="spacer" />
          <Tag><span className="mono">{r.event}</span></Tag>
        </>
      )}
      line={<span className="trunc">{r.subject}</span>}
      meta={[
        { k: 'From', v: r.sender },
        { k: 'Reply-To', v: r.replyTo },
      ]}
      footL={r.description || 'No description'}
      footR="Open to edit"
    />
  )

  /* A link into a single template renders that template's page rather than the
     register — the editor is a page now, not a dialog raised over one. */
  if (openTemplateId) {
    const found = templates.find((t) => String(t.id) === String(openTemplateId))
    return (
      <TemplateRecord
        key={openTemplateId}
        record={found}
        backTo="/iam/emails/templates"
        onDelete={deleteTemplate}
        onSave={(v) => {
          setTemplates((ts) => upsertRow(ts, found, v))
          toast('ok', 'Template saved', `${v.name} updated.`)
          navigate('/iam/emails/templates')
        }}
      />
    )
  }

  return (
    <>
      <Tabs
        value={tab}
        onChange={onTab}
        tabs={CONFIG_TABS.map((t) => ({
          ...t,
          count: t.id === 'templates' ? templates.length
            : t.id === 'messages' ? messages.length
              : undefined,
        }))}
      />

      {tab === 'smtp' && (
        <>
          <Card
            title="SMTP configuration"
            sub="The single relay every transactional message leaves through"
            actions={(
              <>
                <Pill tone={smtp.status === 'Active' ? 'ok' : 'mut'} dot>{smtp.status}</Pill>
                <Button
                  size="sm"
                  icon={smtp.status === 'Active' ? 'ban' : 'checkC'}
                  onClick={() => {
                    const status = toggleStatus(smtp.status)
                    setSmtp((p) => ({ ...p, status }))
                    setDraft((p) => ({ ...p, status }))
                    toast('ok', status === 'Active' ? 'Relay activated' : 'Relay deactivated', smtp.code)
                  }}
                >
                  {smtp.status === 'Active' ? 'Deactivate' : 'Activate'}
                </Button>
              </>
            )}
          >
            <SmtpFields d={draft} set={set} errors={errors} />
          </Card>

          {/* The relay, what it does with mail it could not hand over, and
              whether any of it works are one configuration, so they are one
              page: the rules are meaningless without the binding above them,
              and the test is how you find out whether either is right. */}
          <div className="grid grid-2">
            <Card title="Retry policy" sub="Applied to any message the relay rejects with a transient error">
              <DeliveryFields d={draft} set={set} />
            </Card>

            <Card title="What happens on failure" sub="Current behavior given the settings above">
              <div className="tl">
                <div className="tl-it" data-tone="warn">
                  <span className="tl-dot"><Icon name="warn" size={8} /></span>
                  <div className="tl-t">Transient rejection</div>
                  <div className="tl-s">
                    {Number(draft.retries) > 0
                      ? <>Retried up to <b>{draft.retries}</b> {Number(draft.retries) === 1 ? 'time' : 'times'}, {draft.retryInterval} apart.</>
                      : <>Not retried — retry attempts are set to zero, so a transient rejection is a failure.</>}
                  </div>
                </div>
                <div className="tl-it" data-tone="bad">
                  <span className="tl-dot"><Icon name="x" size={8} /></span>
                  <div className="tl-t">Hard bounce</div>
                  <div className="tl-s">
                    {draft.bounceHandling
                      ? 'Address marked undeliverable after three hard failures.'
                      : 'Bounce handling is off — a dead address keeps being written to on every send.'}
                  </div>
                </div>
                <div className="tl-it" data-tone="acc">
                  <span className="tl-dot"><Icon name="checkC" size={8} /></span>
                  <div className="tl-t">Exhausted</div>
                  <div className="tl-s">Message moves to Failed in the delivery log and raises an operations alert.</div>
                </div>
                <div className="tl-it" data-tone="mut">
                  <span className="tl-dot"><Icon name="clock" size={8} /></span>
                  <div className="tl-t">Over the daily cap</div>
                  <div className="tl-s">
                    Beyond <b>{draft.dailyCap}</b> messages a day, mail stays Queued until the window resets.
                    {draft.sandbox && <> Sandbox mode is on, so nothing reaches a real recipient in any case.</>}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-2">
          <Card
            title="Connection test"
            sub="Runs a live SMTP handshake without sending mail"
            actions={<Button size="sm" icon="activity" onClick={runConnectionTest}>Test Config</Button>}
          >
            {testLog ? (
              <div className="log-view">
                {testLog.map((l, i) => <div className={`lg-${l.tone}`} key={i}>{l.text}</div>)}
              </div>
            ) : (
              <div className="t-sm t-mut">No test has been run in this session.</div>
            )}
          </Card>

          <Card title="Send a test message" sub="Delivers a rendered diagnostic email end to end">
            <div className="stack">
              <Field
                label="Destination address"
                required
                hint="Use an address you control; the message contains no real identity data."
                htmlFor="em-test-to"
              >
                <TextInput id="em-test-to" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              </Field>
              <div className="row">
                <Button
                  variant="pri"
                  icon="mail"
                  disabled={!testTo.trim()}
                  onClick={() => toast('ok', 'Test queued', `A diagnostic message is on its way to ${testTo.trim()}.`)}
                >
                  Send test message
                </Button>
              </div>
              <Banner tone="info">
                A successful send proves relay, authentication, DKIM and rendering together. A failed connection test
                with a successful send usually means an egress firewall rule.
              </Banner>
            </div>
          </Card>
          </div>

          <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes to the relay' : `Saved · ${smtp.host}:${smtp.port}`}>
            <Button icon="refresh" disabled={!dirty} onClick={revert}>Revert</Button>
            <Button variant="pri" icon="save" disabled={!dirty} onClick={saveSmtp}>Save configuration</Button>
          </StickyActions>
        </>
      )}

      {/* The wrapper scopes the card-view density override in the page's
          stylesheet; the register itself is the shared workbench. */}
      {tab === 'templates' && (
        <div className="em-tpl-cards">
        <DataWorkbench
          id="email-templates"
          rows={templates}
          columns={templateColumns}
          views={TEMPLATE_VIEWS}
          view={templateView}
          onViewChange={setTemplateView}
          renderCard={renderTemplateCard}
          cardSize="compact"
          searchPlaceholder="Search templates by name, code, subject or event…"
          onRowClick={openTemplate}
          actionsLabel="Actions"
          rowActions={(r) => [
            { id: 'edit', label: 'Open', icon: 'edit', onSelect: () => openTemplate(r) },
            { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => deleteTemplate(r) },
            {
              id: 'toggle',
              label: r.status === 'Active' ? 'Deactivate' : 'Activate',
              icon: r.status === 'Active' ? 'ban' : 'checkC',
              onSelect: () => toggleTemplate(r),
            },
          ]}
          emptyTitle="No templates"
          emptyBody="No template matches the current search."
          emptyIcon="file"
        />
        </div>
      )}

      {tab === 'health' && <EmailHealth smtp={smtp} messages={messages} />}

      {tab === 'messages' && <EmailsPage embedded rows={messages} onRowsChange={onMessagesChange} />}
    </>
  )
}
