import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { SkeletonStats } from '../../components/primitives/Skeleton'
import { nextId } from '../../data/seed'
import { useApp } from '../../store/AppContext'
import { AttributeEditor } from './facetControls'
import {
  blankAttribute, familyOf, mapperIcon, mapperLabel, releasedName, sourceSummary, tokenTargets,
} from './attributeModel'

/**
 * Attribute configuration for one application.
 *
 * Summary cards, then the mapper register. Adding or editing a mapper opens
 * the editor above the register rather than inside it, so the list being
 * edited stays readable underneath. The mapper types follow the application's
 * own protocol: a SAML service provider is offered SAML mappers, an OIDC or
 * OAuth client its own.
 */
// `loading` is the application record's own settling flag, handed down rather
// than started again here: this panel is one of that record's tabs, and a
// register running its own timer would land at a different moment from the
// masthead above it.
export default function AttributesTab({ app, onPatch, loading = false }) {
  const { toast, confirm } = useApp()
  const [draft, setDraft] = useState(null)
  const [facet, setFacet] = useState('all')
  const facet_ = app.sso

  if (!facet_) {
    return <Banner tone="info">This application has no SSO facet, so it releases nothing.</Banner>
  }
  if (facet_.protocol === 'Link') {
    return (
      <Banner tone="info">
        {app.displayName} opens a URL. No assertion and no token is issued, so no attribute is released. Give it a
        SAML, OIDC or JWT facet if the destination needs to know who the identity is.
      </Banner>
    )
  }

  const saml = familyOf(facet_.protocol) === 'SAML'
  const rows = facet_.attrs
  const setRows = (next) => onPatch(app.id, (r) => ({ sso: { ...r.sso, attrs: next } }))
  const released = saml ? 'attribute' : 'claim'

  const save = () => {
    if (draft.id) {
      setRows(rows.map((r) => (r.id === draft.id ? { ...r, ...draft } : r)))
      toast('ok', 'Mapper saved', `${draft.name} is a ${mapperLabel(draft.mapperType).toLowerCase()} mapper.`)
    } else {
      setRows([...rows, { ...draft, id: nextId(rows) }])
      toast('ok', 'Mapper added', saml ? `${draft.name} is released in the next assertion.` : `${draft.name} is written into the next token.`)
    }
    setDraft(null)
  }

  const removeRows = (list, done) => confirm({
    title: list.length === 1 ? `Remove the ${list[0].name} mapper?` : `Remove ${list.length} mappers?`,
    body: saml
      ? 'The values stop being released from the next sign-in. Sessions already established keep what they were issued.'
      : 'The claims stop being written from the next token. Tokens already issued keep what they were minted with.',
    confirmLabel: list.length === 1 ? 'Remove mapper' : 'Remove mappers',
    onConfirm: () => {
      const ids = new Set(list.map((r) => r.id))
      setRows(rows.filter((r) => !ids.has(r.id)))
      toast('ok', list.length === 1 ? 'Mapper removed' : 'Mappers removed', list.length === 1 ? list[0].name : `${list.length} mappers removed.`)
      if (draft && ids.has(draft.id)) setDraft(null)
      if (done) done()
    },
  })

  const setRequired = (ids, required, done) => {
    const set = new Set(ids.map(String))
    setRows(rows.map((r) => (set.has(String(r.id)) ? { ...r, required } : r)))
    toast('ok', required ? 'Marked required' : 'Marked optional', `${ids.length} ${ids.length === 1 ? 'mapper' : 'mappers'} updated.`)
    if (done) done()
  }

  const startAdd = () => setDraft(blankAttribute(''))
  const types = new Set(rows.map((r) => r.mapperType))
  const required = rows.filter((r) => r.required).length
  const shown = rows.filter((r) => (facet === 'required' ? r.required : facet === 'optional' ? !r.required : true))

  const columns = [
    {
      key: 'name', label: 'Mapper', cls: 'td-main td-flex', locked: true, width: 220,
      value: (r) => `${r.name} ${r.description || ''}`,
      render: (r) => (
        <span className="cell-stack" title={r.description || r.name}>
          <span className="trunc">{r.name}</span>
          {r.description && <span className="cell-sub trunc">{r.description}</span>}
        </span>
      ),
    },
    {
      key: 'mapperType', label: 'Mapper type', width: 190,
      value: (r) => mapperLabel(r.mapperType),
      render: (r) => (
        <span className="cell-id">
          <Icon name={mapperIcon(r.mapperType)} size={13} style={{ color: 'var(--mut)' }} />
          <span className="trunc">{mapperLabel(r.mapperType)}</span>
        </span>
      ),
    },
    { key: 'source', label: 'Source', cls: 'td-mono td-flex', width: 200, value: sourceSummary, render: (r) => <span className="trunc" title={sourceSummary(r)}>{sourceSummary(r)}</span> },
    { key: 'released', label: saml ? 'SAML attribute' : 'Token claim', cls: 'td-mono td-flex', width: 200, value: releasedName, render: (r) => <span className="trunc" title={releasedName(r)}>{releasedName(r)}</span> },
    saml
      ? { key: 'nameFormat', label: 'NameFormat', width: 170, render: (r) => <span className="mono t-xs">{r.nameFormat || '—'}</span> }
      : { key: 'targets', label: 'Written into', width: 190, value: tokenTargets, render: (r) => <span className="t-xs">{tokenTargets(r)}</span> },
    {
      key: 'required', label: 'Required', width: 110,
      value: (r) => (r.required ? 'Required' : 'Optional'),
      render: (r) => (r.required ? <Pill tone="acc" dot>Required</Pill> : <span className="t-mut">Optional</span>),
    },
    {
      key: 'ops', label: 'Operation', width: 96, sortable: false,
      render: (r) => (
        <span className="row" style={{ gap: 2 }}>
          <IconButton icon="edit" size="sm" label={`Edit ${r.name}`} onClick={(e) => { e.stopPropagation(); setDraft({ ...r }) }} />
          <IconButton icon="trash" size="sm" label={`Remove ${r.name}`} onClick={(e) => { e.stopPropagation(); removeRows([r]) }} />
        </span>
      ),
    },
  ]

  return (
    <div className="stack">
      {loading ? <SkeletonStats count={4} /> : (
        <StatCards
          items={[
            { id: 'all', icon: 'swap', label: 'Mappers', value: rows.length, chip: facet_.protocol, sub: `${released}s ${saml ? 'released in the assertion' : 'written into the token'}` },
            { id: 'required', icon: 'lock', label: 'Required', value: required, chipTone: 'acc', chip: required ? 'refuse when empty' : 'none', sub: saml ? 'sign-in refused without a value' : 'token refused without a value' },
            { id: 'optional', icon: 'checkC', label: 'Optional', value: rows.length - required, sub: 'omitted when the source is empty' },
            { icon: 'layers', label: 'Mapper types', value: types.size, sub: types.size ? [...types].slice(0, 2).map(mapperLabel).join(', ') + (types.size > 2 ? '…' : '') : 'none in use' },
          ]}
          value={facet}
          onChange={setFacet}
          label="Filter mappers"
        />
      )}

      {!loading && draft && (
        <section className="card">
          <AttributeEditor
            key={draft.id || 'new'}
            protocol={facet_.protocol}
            draft={draft}
            onDraft={setDraft}
            onCancel={() => setDraft(null)}
            onSave={save}
            idPrefix="sattr"
          />
        </section>
      )}

      <DataWorkbench
        id={`app-attrs-${app.id}`}
        rows={shown}
        columns={columns}
        loading={loading}
        selectable
        searchPlaceholder={`Search mappers by name, source or ${released}…`}
        toolbar={<Button size="sm" variant="pri" icon="plus" disabled={!!draft} onClick={startAdd}>Add mapper</Button>}
        onRowClick={(r) => setDraft({ ...r })}
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" icon="lock" onClick={() => setRequired(ids, true, clear)}>Mark required</Button>
            <Button size="sm" onClick={() => setRequired(ids, false, clear)}>Mark optional</Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => removeRows(rows.filter((r) => ids.map(String).includes(String(r.id))), clear)}>Remove</Button>
          </>
        )}
        emptyTitle={facet === 'all' ? 'No mappers configured' : `No ${facet} mappers`}
        emptyBody={saml
          ? 'Without at least a subject mapper the service provider cannot resolve who signed in.'
          : 'Without at least one mapper the token carries authentication only, with no identity claims.'}
        emptyIcon="swap"
        footNote={saml
          ? `Values are resolved at every sign-in · applies to the next assertion issued to ${facet_.sourceName}`
          : `Values are resolved every time a token is minted · applies to the next token for ${facet_.sourceName}`}
      />
    </div>
  )
}
