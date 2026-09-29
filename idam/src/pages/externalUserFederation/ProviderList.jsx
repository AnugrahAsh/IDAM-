import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RegisterHeader from '../../components/workbench/RegisterHeader'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import { serialColumn, statusTone } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { BASE, PROVIDER_KIND, testConnection, vendorLabel } from './federationData'

/* ---------------------------------------------------------------------------
   The provider register.

   This page used to be a hand-rolled grid of cards, and it was the only list
   in the console that was: every other register — LDAP Applications, the
   identity directory, applications, the SMS providers — is a DataWorkbench,
   with a RegisterHeader carrying the counts and the filter above rows that
   sort, search, page and hide columns. A card grid could do none of that, had
   to reinvent its own layout, spacing and empty state to approximate the look
   of one, and was where every "the CSS is broken" report on this screen came
   from. There is nothing about a directory provider that a directory (LDAP
   Applications, one nav entry below this one) does not also have, so this
   register is now built the same way that one is.

   Nothing on the record is lost in the move. What a card carried down its
   face — name, vendor, status, connection URL, users DN, edit mode, the
   enabled switch and the directory's own last error — is a column here, and
   the Actions kebab the client asked for is the workbench's own row menu,
   with the vocabulary every other register's menu already uses.
   ------------------------------------------------------------------------- */

const FACETS = {
  all: () => true,
  enabled: (p) => p.enabled,
  disabled: (p) => !p.enabled,
  attention: (p) => !p.enabled || p.status === 'Failed',
}

const LABELS = {
  all: 'providers',
  enabled: 'enabled',
  disabled: 'disabled',
  attention: 'need attention',
}

const HINTS = {
  all: 'Every directory this tenant federates users from',
  enabled: 'Answering for their users now',
  disabled: 'Configured but not answering',
  attention: 'Switched off, or failed on their last probe',
}

/* The register header settles with the rows it describes: landing first with
   counts the rows below cannot yet corroborate reads as a page half broken.
   Built from the real rule's own classes so the bars sit exactly where the
   figures will. */
function RegisterHeaderSkeleton({ tabs = 4, summary = 2 }) {
  return (
    <div className="reg" aria-hidden="true">
      <div className="reg-row">
        <div className="reg-tabs">
          {Array.from({ length: tabs }, (_, i) => (
            <span className="reg-f fed-reg-skel-f" key={i}>
              <span className="skel" style={{ width: 22 + (i % 3) * 8 }} />
              <span className="skel" style={{ width: 58 + (i % 3) * 22, height: 9 }} />
            </span>
          ))}
        </div>
        <div className="reg-sum">
          {Array.from({ length: summary }, (_, i) => (
            <span className="skel" key={i} style={{ width: 84 + (i % 2) * 28, height: 9 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProviderList({ rows, onToggle, onDelete }) {
  const { navigate, toast } = useApp()
  const [facet, setFacet] = useState('all')
  const [mutedAlert, setMutedAlert] = useState(null)
  /* One flag for the register, settling on arrival — including on the way back
     from a provider's own form, which is a route away and back. Faceting is a
     filter over rows already held, so it does not settle again. */
  const loading = useLoading()

  const list = useMemo(() => rows.filter(FACETS[facet] || FACETS.all), [rows, facet])

  const enabled = rows.filter((r) => r.enabled)
  const disabled = rows.filter((r) => !r.enabled)
  const failed = rows.filter((r) => r.status === 'Failed')

  /* The register says what is wrong before it says how many of everything
     there is, and names it — the directory's own last error, read off the
     record rather than left for the operator to open three providers to find. */
  const alert = useMemo(() => {
    if (!failed.length) return null
    const lead = failed[0]
    return {
      tone: 'bad',
      title: failed.length === 1
        ? `${lead.name} is not answering`
        : `${failed.length} of ${rows.length} providers are not answering`,
      detail: lead.lastError || undefined,
      filterId: 'attention',
      actionLabel: 'Show these',
    }
  }, [rows])

  const headerItems = [
    { id: 'all', value: rows.length, label: LABELS.all, hint: HINTS.all },
    { id: 'enabled', value: enabled.length, label: LABELS.enabled, hint: HINTS.enabled },
    { id: 'disabled', value: disabled.length, label: LABELS.disabled, tone: disabled.length ? 'warn' : undefined, hint: HINTS.disabled },
    {
      id: 'attention',
      value: rows.filter(FACETS.attention).length,
      label: LABELS.attention,
      tone: failed.length ? 'bad' : disabled.length ? 'warn' : undefined,
      hint: HINTS.attention,
    },
  ]

  const runQuickTest = (provider) => {
    const result = testConnection(provider)
    toast(result.ok ? 'ok' : 'warn', `Connection ${result.ok ? 'succeeded' : 'failed'}`, `${provider.name} — ${result.summary}`)
  }

  /* Six columns an operator actually asks the register for: what it is, whose
     product, whether it works, where it reads from and whether it is on. The
     rest of the record belongs to the provider's own form and is one click
     away in the row. */
  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Provider', locked: true, cls: 'td-main td-wide', width: 260,
      value: (r) => `${r.name} ${r.connectionUrl} ${vendorLabel(r.vendor)} ${r.usersDn}`,
      render: (r) => (
        <span className="cell-id">
          {/* The tone rides a wrapper, not the icon: Icon forwards className
              and style only, so a data attribute set on it never reaches the
              DOM and the rule keyed on it would never match. */}
          <span className="fed-row-ic" data-tone={statusTone(r.status)}><Icon name="plug" size={14} /></span>
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.name}</span>
            <span className="cell-sub mono">{r.connectionUrl}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'vendor', label: 'Vendor', width: 168,
      value: (r) => vendorLabel(r.vendor),
      render: (r) => vendorLabel(r.vendor) || '—',
    },
    {
      key: 'status', label: 'Status', width: 118,
      /* The directory's own reason, on the verdict that reports it — a failed
         provider used to carry its error in a red strip across the card. */
      render: (r) => (
        <span title={r.status !== 'Healthy' && r.lastError ? r.lastError : undefined}>
          <Pill tone={statusTone(r.status)} dot>{r.status || 'Unknown'}</Pill>
        </span>
      ),
    },
    { key: 'usersDn', label: 'Users DN', cls: 'td-mono td-flex' },
    { key: 'editMode', label: 'Edit mode', width: 124 },
    {
      key: 'enabled', label: 'Enabled', width: 116, sortable: false,
      value: (r) => (r.enabled ? 'Enabled' : 'Disabled'),
      /* The switch is the one control that acts from inside a row, so it stops
         the click reaching the row underneath it — pressing Disable must not
         also open the provider. */
      render: (r) => (
        <span className="fed-sw" onClick={(e) => e.stopPropagation()}>
          <Switch checked={r.enabled} label={`${r.name} enabled`} onChange={() => onToggle(r)} />
          <span className="fed-sw-t">{r.enabled ? 'Enabled' : 'Disabled'}</span>
        </span>
      ),
    },
    { key: 'kind', label: 'Type', width: 96, optional: true, value: () => PROVIDER_KIND, render: () => PROVIDER_KIND },
    {
      key: 'lastError', label: 'Last error', cls: 'td-flex', optional: true,
      render: (r) => (r.lastError ? <span className="trunc" title={r.lastError}>{r.lastError}</span> : '—'),
    },
  ]

  /* The Actions control the client reported missing. Same vocabulary, same
     order and same danger marking as every other register's row menu. */
  const rowActions = (r) => [
    { id: 'view', label: 'View / Edit provider', icon: 'eye', onSelect: () => navigate(`${BASE}/${r.id}`) },
    {
      id: 'toggle',
      label: r.enabled ? 'Disable' : 'Enable',
      icon: r.enabled ? 'ban' : 'checkC',
      onSelect: () => onToggle(r),
    },
    { id: 'test', label: 'Test connection', icon: 'activity', onSelect: () => runQuickTest(r) },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete(r) },
  ]

  return (
    <>
      {loading ? (
        <Skeleton label="Loading the federation provider register">
          <SkeletonPageBar actions={1} crumbs={1} />
        </Skeleton>
      ) : (
        <PageBar
          title="User Federation"
          sub="User federation provides access to external databases and directories."
          crumbs={[{ label: 'External User Federation' }]}
          actions={<Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/new`)}>Add Provider</Button>}
        />
      )}

      <DataWorkbench
        id="external-user-federation"
        rows={list}
        columns={columns}
        loading={loading}
        header={loading ? <RegisterHeaderSkeleton tabs={headerItems.length} summary={0} /> : (
          <RegisterHeader
            items={headerItems}
            value={facet}
            onChange={setFacet}
            resetId="all"
            label="Filter the provider register"
            alert={facet === 'attention' || (alert && mutedAlert === alert.title) ? null : alert}
            onDismissAlert={() => setMutedAlert(alert ? alert.title : null)}
          />
        )}
        searchPlaceholder="Search by name, URL, vendor or users DN…"
        rowActions={rowActions}
        onRowClick={(r) => navigate(`${BASE}/${r.id}`)}
        emptyTitle={rows.length === 0 ? 'No providers yet' : 'No provider matches'}
        emptyBody={rows.length === 0
          ? 'Add a provider to federate users from an external database or directory.'
          : 'Adjust the search or the filter above to see the rest of the register.'}
        emptyIcon="plug"
      />
    </>
  )
}
