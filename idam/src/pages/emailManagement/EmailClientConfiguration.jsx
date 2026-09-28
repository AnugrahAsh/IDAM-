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
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm,
} from '../../components/primitives/Skeleton'
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

/* The SMTP tab was one scroll: the binding, then the retry rules, then two
   tests. Reading the retry interval meant scrolling past a screen of
   connection fields, and the tests — the things an operator comes here to run
   — were below the fold on every screen size. They are four questions, so they
   are four tabs, nested the way the delivery log nests its own two registers.

   "What happens on failure" is deliberately not a fifth tab. It is the retry
   settings read back as consequences: it says nothing the controls beside it
   do not set, and it changes as they are changed. Putting the cause on one tab
   and its effect on another is two tabs nobody can read at once, so it sits
   next to the policy it describes. */
const SMTP_TABS = [
  { id: 'config', label: 'Configuration', icon: 'server' },
  { id: 'retry', label: 'Retry policy', icon: 'refresh' },
  { id: 'test', label: 'Connection test', icon: 'activity' },
  { id: 'message', label: 'Test message', icon: 'mail' },
]

const TEMPLATE_VIEWS = [
  { id: 'cards', label: 'Cards', icon: 'apps', desc: 'One card per template, with its subject' },
  { id: 'table', label: 'Table', icon: 'menu', desc: 'Dense register with sortable columns' },
]

const statusPill = (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill>

/* A bar at the line box the text it stands in for is set in, the way the
   Settings sections draw theirs — the height comes from the token the real type
   carries rather than from a round number that looks close. */
const LINE_XS = 'calc(var(--t-xs) * var(--t-body-lh))'
const LINE_SM = 'calc(var(--t-sm) * var(--t-body-lh))'
const LINE_MICRO = 'calc(var(--t-micro) * var(--t-body-lh))'

/* One `.field` — its label, its control, and, where the real field carries one,
   the hint line under it. The class is the form's own, so the 5px between the
   three comes from the rule `Field` is drawn by rather than from here. */
function SkelField({ label = '46%', hint, span }) {
  return (
    <div className="field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <span className="skel" style={{ width: label, height: LINE_XS }} />
      <span className="skel em-skel-inp" />
      {hint && <span className="skel" style={{ width: hint, height: LINE_XS }} />}
    </div>
  )
}

/* One `Section` of `SmtpFields`: the heading line — which `SkeletonForm` has no
   notion of, and which is most of the 500px the flat form skeleton was short by
   once its five sections and their 20px rhythm are counted — then the rows. */
function SkelSection({ head = '38%', children }) {
  return (
    <section className="em-fs">
      <div className="em-fs-hr">
        <h3 className="em-fs-h">
          <span className="skel em-skel-fs-ic" />
          <span className="skel" style={{ width: head, height: LINE_MICRO }} />
        </h3>
      </div>
      <div className="stack">{children}</div>
    </section>
  )
}

/* One `SwitchRow`: the box, and the title over the sentence that says what
   turning it off costs. A retry panel of four plain fields is barely half the
   card without these three. */
function SkelSwitch({ title = '38%', body = '78%' }) {
  return (
    <div className="em-sw em-skel-sw">
      <span className="skel em-skel-check" />
      <span className="em-sw-m">
        <span className="skel" style={{ width: title, height: LINE_SM }} />
        <span className="skel" style={{ width: body, height: LINE_XS }} />
      </span>
    </div>
  )
}

/* The SMTP panel, holding its place.
 *
 * Configuration and Retry policy are forms, but they are forms filled from the
 * stored relay — nothing in them is the operator's own typing until the record
 * they were drawn from has arrived. Connection test and Test message are not
 * here: a test log nobody has run yet and an address box waiting to be typed
 * into have nothing to read, so they are drawn straight away rather than made
 * to look like they are fetching something.
 *
 * Both panels are drawn from `EmailForms`' own markup rather than from the
 * kit's flat field grid. The kit's grid knows nothing about the five headed
 * sections `SmtpFields` is built from, the warning banner the seeded relay
 * always renders, or the three switch rows under `DeliveryFields` — and this is
 * the tab Email Management lands on, so anything the shape leaves out is the
 * page growing by that much the moment the settle ends. */
function SmtpSkeleton({ tab }) {
  if (tab === 'retry') {
    return (
      <div className="grid grid-2">
        <SkeletonCard>
          {/* `DeliveryFields`: four fields, three of which carry a hint line —
              the fourth puts its qualifier beside the label — then the three
              behaviour switches, at the form's own 20px rhythm. */}
          <div className="em-form">
            <SkelField label="34%" hint="72%" />
            <SkelField label="30%" hint="46%" />
            <SkelField label="36%" hint="84%" />
            <SkelField label="58%" />
            <SkelSwitch title="32%" body="82%" />
            <SkelSwitch title="38%" body="88%" />
            <SkelSwitch title="34%" body="76%" />
          </div>
        </SkeletonCard>
        {/* The consequences panel is the shorter of the pair, and grid items
            stretch to the row, so the policy beside it sets the height. */}
        <SkeletonCard lines={8} />
      </div>
    )
  }
  // Five field groups: basic info, runtime engine, authentication, encryption
  // and sender identity, at the rows each one lands with.
  return (
    <SkeletonCard>
      <div className="em-form">
        <SkelSection head="30%">
          <div className="grid grid-2">
            <SkelField label="48%" />
            <SkelField label="52%" />
          </div>
        </SkelSection>

        <SkelSection head="40%">
          <SkelField label="44%" />
          <SkelField label="32%" />
          <div className="grid grid-2">
            <SkelField label="40%" />
            <SkelField label="36%" />
          </div>
        </SkelSection>

        {/* The banner under Auth Type renders for every auth type but NONE, and
            the stored relay authenticates — so it is held rather than omitted. */}
        <SkelSection head="44%">
          <SkelField label="34%" />
          <span className="skel em-skel-banner" />
          <div className="grid grid-2">
            <SkelField label="38%" />
            <SkelField label="58%" />
          </div>
        </SkelSection>

        {/* Encryption's own banner is the one that is not held: it appears only
            when transport security is off, and the stored relay negotiates
            STARTTLS. */}
        <SkelSection head="32%">
          <SkelField label="46%" />
        </SkelSection>

        <SkelSection head="42%">
          <div className="grid grid-2">
            <SkelField label="36%" span={2} />
            <SkelField label="42%" />
            <SkelField label="34%" />
          </div>
        </SkelSection>
      </div>
    </SkeletonCard>
  )
}

export default function EmailClientConfiguration({
  tab, onTab, messages, onMessagesChange, openTemplateId, loading = false,
}) {
  const { toast, confirm, navigate } = useApp()
  /* One relay, not a list of them. The register carried several because the
     record shape allows it; the tenant has always sent through the first. */
  const [smtp, setSmtp] = useState(() => toProviderDraft(EMAIL_PROVIDERS[0]))
  const [draft, setDraft] = useState(() => toProviderDraft(EMAIL_PROVIDERS[0]))
  const [errors, setErrors] = useState({})
  /* Not carried in the URL: the outer tab is a location an operator links to
     and returns to, the sub-tab is where they happen to be standing inside it.
     Reloading onto Configuration is the right place to land. */
  const [smtpTab, setSmtpTab] = useState('config')
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
    if (next) {
      // Every field `providerErrors` can reject lives on Configuration, and the
      // save bar is reachable from all four sub-tabs — so a rejection has to
      // bring the operator to the fields it highlighted rather than tell them
      // about marks on a tab they are not looking at.
      setSmtpTab('config')
      toast('bad', 'Cannot save', 'Fix the highlighted fields.')
      return
    }
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
    /* A template is a record page: the masthead is the first thing that lands,
       so it is the first thing held. The cards below stand in for the editor's
       own four — identity, subject, body and addressing — because a single
       card of bars would let the page grow by two screens when the real form
       arrived. */
    if (loading) {
      return (
        <Skeleton label="Loading the email template">
          <SkeletonDetailHeader facts={3} actions={2} />
          <div className="detail-body">
            <div className="stack">
              <SkeletonCard><SkeletonForm fields={2} cols={2} actions={false} /></SkeletonCard>
              <SkeletonCard><SkeletonForm fields={1} cols={1} actions={false} /></SkeletonCard>
              <SkeletonCard lines={12} />
              <SkeletonCard><SkeletonForm fields={2} cols={2} actions={false} /></SkeletonCard>
            </div>
          </div>
        </Skeleton>
      )
    }

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
          <div className="stack">
            {/* Same mechanism and same treatment as the delivery log's own
                Outbox / Delivery log pair, so the two nestings read as one
                pattern. The badge is the one piece of state that matters from
                any of the four tabs: a relay switched off dispatches nothing,
                whichever tab you happen to be reading. */}
            <Tabs
              value={smtpTab}
              onChange={setSmtpTab}
              tabs={SMTP_TABS.map((t) => (t.id === 'config' && smtp.status !== 'Active'
                ? { ...t, badge: 'Inactive', badgeTone: 'warn' }
                : t))}
            />

            {/* The sub-tabs are chrome and stay put; the panel under them is
                the relay record, so that is what is held. No announcing region
                of its own: the section above has already said the screen is
                loading, and these shapes are decoration under it. */}
            {loading && (smtpTab === 'config' || smtpTab === 'retry') && (
              <SmtpSkeleton tab={smtpTab} />
            )}

            {!loading && smtpTab === 'config' && (
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
            )}

            {!loading && smtpTab === 'retry' && (
              <div className="grid grid-2">
                <Card title="Retry policy" sub="Applied to any message the relay rejects with a transient error">
                  <DeliveryFields d={draft} set={set} />
                </Card>

                <Card title="What happens on failure" sub="Current behaviour given the settings beside it">
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
            )}

            {/* The two tests stay apart because they prove different things:
                the handshake proves the binding, the send proves the binding
                plus DKIM plus rendering. Each banner names the other, so the
                discrepancy between them stays readable one tab away. */}
            {smtpTab === 'test' && (
              <Card
                title="Connection test"
                sub="Runs a live SMTP handshake without sending mail"
                actions={<Button size="sm" icon="activity" onClick={runConnectionTest}>Test Config</Button>}
              >
                <div className="stack">
                  {testLog ? (
                    <div className="log-view">
                      {testLog.map((l, i) => <div className={`lg-${l.tone}`} key={i}>{l.text}</div>)}
                    </div>
                  ) : (
                    <div className="t-sm t-mut">No test has been run in this session.</div>
                  )}
                  <Banner tone="info">
                    The handshake stops before DATA, so it proves reachability, TLS and authentication without putting a
                    message in anybody&rsquo;s inbox. Test message proves rendering and DKIM on top of that.
                  </Banner>
                </div>
              </Card>
            )}

            {smtpTab === 'message' && (
              <Card title="Send a test message" sub="Delivers a rendered diagnostic email end to end">
                <div className="stack">
                  {/* One field on a full-width tab is a text box the width of
                      the canvas; the grid holds it to a readable measure and
                      collapses with every other two-column form. */}
                  <div className="grid grid-2">
                    <Field
                      label="Destination address"
                      required
                      hint="Use an address you control; the message contains no real identity data."
                      htmlFor="em-test-to"
                    >
                      <TextInput id="em-test-to" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                    </Field>
                  </div>
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
            )}
          </div>

          {/* Outside the sub-tabs, and outside the wrapper the sub-tabs sit in:
              the draft spans Configuration and Retry policy, both tests run
              against it rather than against what was saved, and the bar's
              growth chain is anchored on the section's own stack. Hiding it on
              two of four tabs would hide a dirty draft. */}
          {!loading && (
            <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes to the relay' : `Saved · ${smtp.host}:${smtp.port}`}>
              <Button icon="refresh" disabled={!dirty} onClick={revert}>Revert</Button>
              <Button variant="pri" icon="save" disabled={!dirty} onClick={saveSmtp}>Save configuration</Button>
            </StickyActions>
          )}
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
          loading={loading}
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

      {tab === 'health' && <EmailHealth smtp={smtp} messages={messages} loading={loading} />}

      {tab === 'messages' && <EmailsPage embedded rows={messages} onRowsChange={onMessagesChange} loading={loading} />}
    </>
  )
}
