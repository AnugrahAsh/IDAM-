import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RecordCard, { CardIcon } from '../../components/workbench/RecordCard'
import DetailHeader from '../../components/shell/DetailHeader'
import { useApp } from '../../store/AppContext'
import SmsPage from './SmsPage'
import { SMS_CLIENTS, SMS_PROVIDERS, SMS_TEMPLATES } from '../shared/comms/commsData'
import { ProviderForm, TemplateForm, openClientDrawer } from './SmsForms'
import SmsHealth from './SmsHealth'
import {
  authType, commitTemplate, encryptionShort, passwordLinkHolder, providerType,
  serializerShort, templateType, toggleStatus, upsertRow, withTemplateType,
} from './smsData'

/* Providers, templates and clients are the three things an operator configures,
   in the order they depend on each other. Health answers "is any of it
   working", and the delivery log is the register — neither is configuration,
   so they sit last. */
export const CONFIG_TABS = [
  { id: 'providers', label: 'Providers', icon: 'server' },
  { id: 'templates', label: 'Templates', icon: 'file' },
  { id: 'clients', label: 'Clients', icon: 'users' },
  { id: 'health', label: 'Health check', icon: 'shield' },
  { id: 'messages', label: 'Delivery log', icon: 'sms' },
]

export const CONFIG_TAB_IDS = CONFIG_TABS.map((t) => t.id)

const TEMPLATE_VIEWS = [
  { id: 'cards', label: 'Cards', icon: 'apps', desc: 'One card per template, with its endpoint' },
  { id: 'table', label: 'Table', icon: 'menu', desc: 'Dense register with sortable columns' },
]

const statusPill = (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill>

export default function SmsClientConfiguration({ tab, onTab, messages, onMessagesChange, openId }) {
  const { toast, confirm, navigate, setDrawer } = useApp()
  const [providers, setProviders] = useState(() => SMS_PROVIDERS.map((p) => ({ ...p })))
  const [templates, setTemplates] = useState(() => SMS_TEMPLATES.map(withTemplateType))
  const [clients, setClients] = useState(() => SMS_CLIENTS.map((c) => ({ ...c })))
  // Template codes repeat across providers, so the register is read one
  // provider at a time as often as it is read whole.
  const [providerFilter, setProviderFilter] = useState('')

  const providerCodes = useMemo(() => providers.map((p) => p.code), [providers])

  const [templateView, setTemplateView] = useState('cards')

  /* A provider and a template are each a screen of fields — a provider carries
     five groups and a signature builder — and a dialog that scrolls its own
     body inside a page that also scrolls is two scrollbars competing to show
     one form. Those two stay pages. */
  const openProvider = (r) => navigate(`/iam/sms/providers/${r ? r.id : 'add'}`)
  const openTemplate = (r) => navigate(`/iam/sms/templates/${r ? r.id : 'add'}`)

  /* A client is three fields and one lookup, which never justified a page:
     opening one replaced the register being read, and closing it returned to
     the top of that register. It is a drawer, so the rows stay on screen and a
     save lands in the row already in front of the operator. */
  const editClient = useCallback((r) => openClientDrawer({
    record: r,
    providers,
    setDrawer,
    toast,
    onSave: (v) => {
      setClients((cs) => upsertRow(cs, r, v))
      toast('ok', r ? 'Client saved' : 'Client added', `${v.code} routes through ${v.provider}.`)
    },
  }), [providers, setDrawer, toast])

  /* The register used to link to /iam/sms/clients/<id|add>, and those links are
     in bookmarks and in the address bar of anyone who was mid-edit. They still
     resolve: the register renders, the address is put back to the register's
     own — with `replace`, so closing the drawer does not step back into a page
     that no longer exists — and the record opens in the drawer over it.
     `navigate` clears any open drawer, so the two calls are in that order. */
  const clientLink = tab === 'clients' && openId ? String(openId) : null
  const handledLink = useRef(null)

  useEffect(() => {
    if (!clientLink) { handledLink.current = null; return }
    if (handledLink.current === clientLink) return
    handledLink.current = clientLink
    const record = clientLink === 'add' ? null : clients.find((c) => String(c.id) === clientLink)
    navigate('/iam/sms/clients', { replace: true })
    if (clientLink !== 'add' && !record) {
      toast('warn', 'Client not found', `No client with id ${clientLink}. It may have been deleted, or the link is stale.`)
      return
    }
    editClient(record)
  }, [clientLink, clients, navigate, toast, editClient])

  const remove = (setter, kind, r, body) => confirm({
    title: `Delete ${r.name}?`,
    body,
    confirmLabel: `Delete ${kind}`,
    onConfirm: () => {
      setter((list) => list.filter((x) => x.id !== r.id))
      toast('ok', `${kind[0].toUpperCase()}${kind.slice(1)} deleted`, r.name)
    },
  })

  const toggle = (setter, kind, r) => {
    const status = toggleStatus(r.status)
    setter((list) => list.map((x) => (x.id === r.id ? { ...x, status } : x)))
    toast('ok', status === 'Active' ? `${kind} activated` : `${kind} deactivated`, r.name)
  }

  // Edit, Delete, then the status switch — the same three in the same order on
  // every register, so the kebab never has to be read to be used.
  const rowMenu = (r, onEdit, onDelete, onToggle) => [
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => onEdit(r) },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete(r) },
    {
      id: 'toggle',
      label: r.status === 'Active' ? 'Deactivate' : 'Activate',
      icon: r.status === 'Active' ? 'ban' : 'checkC',
      onSelect: () => onToggle(r),
    },
  ]

  const providerColumns = [
    { key: 'code', label: 'Provider code', cls: 'td-main td-mono', locked: true },
    { key: 'name', label: 'Name' },
    {
      key: 'type',
      label: 'Type',
      value: (r) => providerType(r.type).label,
      render: (r) => {
        const t = providerType(r.type)
        return <Tag tone={t.tone}><Icon name={t.icon} size={11} />{t.label}</Tag>
      },
    },
    {
      key: 'auth',
      label: 'Auth',
      value: (r) => authType(r.auth).short,
      // An unauthenticated binding is the absence of a credential, not a kind
      // of one, so it reads as plain muted text rather than another tag.
      render: (r) => (r.auth === 'NONE'
        ? <span className="t-faint">None</span>
        : <Tag>{authType(r.auth).short}</Tag>),
    },
    {
      key: 'serializer',
      label: 'Serializer',
      value: (r) => serializerShort(r.serializer),
      render: (r) => <Tag><span className="mono">{serializerShort(r.serializer)}</span></Tag>,
    },
    {
      key: 'encryption',
      label: 'Encryption',
      value: (r) => encryptionShort(r.encryption),
      render: (r) => (r.encryption
        ? <Tag tone="bad"><Icon name="lock" size={11} />{encryptionShort(r.encryption)}</Tag>
        : <span className="t-faint">—</span>),
    },
    { key: 'responseCheck', label: 'Response check', render: (r) => <Tag><span className="mono">{r.responseCheck}</span></Tag> },
    { key: 'timeout', label: 'Timeout', render: (r) => <Tag><span className="num">{r.timeout}ms</span></Tag> },
    { key: 'retries', label: 'Retries', render: (r) => <span className="num">{r.retries}</span> },
    { key: 'status', label: 'Status', render: statusPill },
  ]

  const templateRows = useMemo(
    () => (providerFilter ? templates.filter((t) => t.provider === providerFilter) : templates),
    [templates, providerFilter],
  )

  const templateColumns = [
    { key: 'code', label: 'Template code', cls: 'td-main td-mono', locked: true },
    { key: 'name', label: 'Name' },
    {
      key: 'type',
      label: 'Type',
      value: (r) => templateType(r.type).label,
      render: (r) => {
        const t = templateType(r.type)
        return <Tag tone={t.tone}><Icon name={t.icon} size={11} />{t.label}</Tag>
      },
    },
    {
      // Held by at most one template, so the column is mostly empty by design —
      // that emptiness is what makes the one row carrying the role findable.
      key: 'passwordCreationLinkSms',
      label: 'Password link',
      value: (r) => (r.passwordCreationLinkSms ? 'Password creation link' : ''),
      render: (r) => (r.passwordCreationLinkSms
        ? <Tag tone="acc"><Icon name="key" size={11} />Password link</Tag>
        : <span className="t-faint">—</span>),
    },
    {
      key: 'apiUrl',
      label: 'API URL',
      render: (r) => <span className="sms-url mono trunc" title={r.apiUrl}>{r.apiUrl}</span>,
    },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status', render: statusPill },
  ]

  const clientColumns = [
    { key: 'code', label: 'Client code', cls: 'td-main td-mono', locked: true },
    { key: 'name', label: 'Name' },
    { key: 'provider', label: 'Provider', render: (r) => <Tag>{r.provider}</Tag> },
    { key: 'status', label: 'Status', render: statusPill },
  ]

  /* ------------------------------------------------------------------ *
   * The provider and template editors, each on its own page.
   * ------------------------------------------------------------------ */

  const recordPage = (kind) => {
    const cfg = {
      providers: {
        list: providers, label: 'Providers', eyebrow: 'SMS provider', icon: 'server',
        back: '/iam/sms/providers',
        blankSub: 'A gateway binding: where messages are posted, how the request is signed, and how the answer is read.',
      },
      templates: {
        list: templates, label: 'Templates', eyebrow: 'SMS template', icon: 'file',
        back: '/iam/sms/templates',
        blankSub: 'The endpoint one event posts to, and the payload it posts.',
      },
    }[kind]

    const adding = openId === 'add'
    const record = adding ? null : cfg.list.find((x) => String(x.id) === String(openId))

    if (!adding && !record) {
      return (
        <>
          <DetailHeader backTo={cfg.back} backLabel={cfg.label} eyebrow={cfg.eyebrow} title="Not found" />
          <EmptyState
            icon={cfg.icon}
            title={`No ${kind.slice(0, -1)} with id ${openId}`}
            body="It may have been deleted, or the link is stale. Open the register to find the current record."
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate(cfg.back)}>Back to {cfg.label}</Button>}
          />
        </>
      )
    }

    const done = () => navigate(cfg.back)
    const holder = kind === 'templates' ? passwordLinkHolder(templates, record ? record.id : null) : null

    return (
      <>
        <DetailHeader
          backTo={cfg.back}
          backLabel={cfg.label}
          eyebrow={cfg.eyebrow}
          title={record ? record.name : `Add ${cfg.eyebrow.replace('SMS ', '')}`}
          sub={record ? `${record.code} \u00b7 saving replaces the stored binding.` : cfg.blankSub}
          media={(
            <span className="feed-ic" data-tone="acc" style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)' }}>
              <Icon name={cfg.icon} size={22} />
            </span>
          )}
          badges={record ? <>{statusPill(record)}<Tag><span className="mono">{record.code}</span></Tag></> : undefined}
        />
        <div className="detail-body">
          {kind === 'providers' && (
            <ProviderForm
              record={record}
              onCancel={done}
              /* The header above this form carries the stored record's status
                 pill and is sticky, so the form's Activate/Deactivate commits
                 at once rather than waiting for Save — otherwise both pills
                 are on screen disagreeing. Adding has no stored record and no
                 badge, so there is nothing to keep in step. */
              onStatusChange={record ? (status) => {
                setProviders((ps) => ps.map((p) => (p.id === record.id ? { ...p, status } : p)))
                toast('ok', status === 'Active' ? 'Provider activated' : 'Provider deactivated', record.name)
              } : undefined}
              onSave={(v) => {
                setProviders((ps) => upsertRow(ps, record, v))
                toast('ok', record ? 'Provider saved' : 'Provider added', `${v.code} runs the ${providerType(v.type).label} engine.`)
                done()
              }}
            />
          )}
          {kind === 'templates' && (
            <TemplateForm
              record={record}
              providers={providers}
              linkHolder={holder}
              onCancel={done}
              onSave={(v) => {
                setTemplates((ts) => commitTemplate(ts, record, v))
                const moved = v.passwordCreationLinkSms && holder
                toast('ok', record ? 'Template saved' : 'Template added', moved
                  ? `${v.code} on ${v.provider}. Password creation links moved from ${holder.name} on ${holder.provider}.`
                  : `${v.code} on ${v.provider}.`)
                done()
              }}
            />
          )}
        </div>
      </>
    )
  }

  if (openId && ['providers', 'templates'].includes(tab)) return recordPage(tab)

  /* Compact: a template row is a name, a code and one endpoint or subject. At
     the standard card size a screen of them was mostly padding, and the same
     twelve templates needed three times the scrolling. */
  const renderTemplateCard = (r, ctx) => (
    <RecordCard
      compact
      ctx={ctx}
      label={r.name}
      media={<CardIcon name="sms" tone={r.status === 'Active' ? 'ok' : 'mut'} />}
      title={r.name}
      sub={r.code}
      tags={(
        <>
          {statusPill(r)}
          {r.passwordCreationLinkSms && <Tag tone="acc"><Icon name="key" size={11} />Password link</Tag>}
          <span className="spacer" />
          <Tag tone={templateType(r.type).tone}>{templateType(r.type).label}</Tag>
        </>
      )}
      line={<span className="trunc mono">{r.apiUrl}</span>}
      meta={[
        { k: 'Provider', v: r.provider },
        { k: 'Method', v: r.method },
      ]}
      footL={`Updated ${r.updated || '\u2014'}`}
      footR="Open to edit"
    />
  )

  return (
    <>
      <Tabs
        value={tab}
        onChange={onTab}
        tabs={CONFIG_TABS.map((t) => ({
          ...t,
          count: t.id === 'providers' ? providers.length
            : t.id === 'templates' ? templates.length
              : t.id === 'clients' ? clients.length
                : t.id === 'messages' ? messages.length
                  : undefined,
        }))}
      />

      {tab === 'providers' && (
        <DataWorkbench
          id="sms-providers"
          rows={providers}
          columns={providerColumns}
          searchPlaceholder="Search providers by code, name or auth\u2026"
          toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => openProvider(null)}>Add Provider</Button>}
          onRowClick={(r) => openProvider(r)}
          actionsLabel="Actions"
          rowActions={(r) => rowMenu(
            r,
            openProvider,
            (x) => remove(setProviders, 'provider', x, 'Templates and clients bound to this provider stop sending until they are re-pointed.'),
            (x) => toggle(setProviders, 'Provider', x),
          )}
          emptyTitle="No providers"
          emptyBody="Add a gateway before any text message can leave the platform."
          emptyIcon="server"
        />
      )}

      {/* The wrapper scopes the card-view density override in the page's
          stylesheet; the register itself is the shared workbench. */}
      {tab === 'templates' && (
        <div className="sms-tpl-cards">
        <DataWorkbench
          id="sms-templates"
          rows={templateRows}
          columns={templateColumns}
          views={TEMPLATE_VIEWS}
          view={templateView}
          onViewChange={setTemplateView}
          renderCard={renderTemplateCard}
          cardSize="compact"
          searchPlaceholder="Search templates by code, name or endpoint\u2026"
          toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => openTemplate(null)}>Add Template</Button>}
          filters={(
            <label className="sms-filter">
              Filter by Provider
              <Select
                value={providerFilter}
                placeholder="All Providers"
                options={providerCodes}
                onChange={(e) => setProviderFilter(e.target.value)}
              />
            </label>
          )}
          onRowClick={(r) => openTemplate(r)}
          actionsLabel="Actions"
          rowActions={(r) => rowMenu(
            r,
            openTemplate,
            (x) => remove(setTemplates, 'template', x, x.passwordCreationLinkSms
              ? 'The event bound to this template stops sending text messages, and no template is left carrying the password creation link.'
              : 'The event bound to this template stops sending text messages.'),
            (x) => toggle(setTemplates, 'Template', x),
          )}
          emptyTitle="No templates"
          emptyBody={providerFilter ? `No template is bound to ${providerFilter}.` : 'Add a template so an event can reach a provider endpoint.'}
          emptyIcon="file"
        />
        </div>
      )}

      {tab === 'clients' && (
        <DataWorkbench
          id="sms-clients"
          rows={clients}
          columns={clientColumns}
          searchPlaceholder="Search clients by code, name or provider\u2026"
          toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => editClient(null)}>Add Client</Button>}
          onRowClick={(r) => editClient(r)}
          actionsLabel="Actions"
          rowActions={(r) => rowMenu(
            r,
            editClient,
            (x) => remove(setClients, 'client', x, 'Traffic for this client stops until it is pointed at another provider.'),
            (x) => toggle(setClients, 'Client', x),
          )}
          emptyTitle="No clients"
          emptyBody="Add a client to route its traffic through a provider."
          emptyIcon="users"
        />
      )}

      {tab === 'health' && <SmsHealth providers={providers} messages={messages} />}

      {tab === 'messages' && <SmsPage embedded rows={messages} onRowsChange={onMessagesChange} />}
    </>
  )
}
