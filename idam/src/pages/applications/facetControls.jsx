import './ApplicationsPage.css'
import { Fragment, useMemo, useRef, useState } from 'react'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import Meter from '../../components/primitives/Meter'
import Switch from '../../components/primitives/Switch'
import Check from '../../components/primitives/Check'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import EmptyState from '../../components/primitives/EmptyState'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { nextId } from '../../data/seed'
import { IDAM_ATTRS, SAMPLE_IDENTITY } from '../shared/provisioning/shared'
import {
  ERROR_CATEGORIES, IDAM_ATTR_PARAM_OPTIONS, NONCE_TOKEN,
  PARAM_INPUT_TYPES, QUERY_JOINS, SAML_NAME_FORMATS, URL_LIMIT,
  blankParam, buildPattern, certFromText, fieldIssue, fieldOptions, isDefaultErrorClass,
  fieldRequired, linkIssues, manualPayloadTemplate, parseMetadataXml, parsePattern, patternAttrs, sampleLaunchUrl, sampleNonce,
  specFor, specGroups, targetAttrsFor, uniqueTargetFor, urlConfigLabel, visibleSpec,
} from './appModel'
import {
  MAPPERS_FOR, attributeIssues, familyOf, mapperType, releasedName, withMapperType,
} from './attributeModel'

export function StatStrip({ items }) {
  return (
    <div className="stat-strip">
      {items.filter(Boolean).map((s) => (
        <div className="stat-cell" key={s.k}>
          <span className="stat-k"><Icon name={s.icon} size={12} />{s.k}</span>
          <span className="stat-v" style={s.tone ? { color: `var(--${s.tone})` } : undefined}>{s.v}</span>
          {s.sub && <span className="t-xs t-mut">{s.sub}</span>}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Connector-specific connection settings (item 14)
// ---------------------------------------------------------------------------

/**
 * `after` places a node inside the same grid directly beneath a named field —
 * used where a decision belongs next to the field it is read with rather than
 * in a card of its own. A key that matches no visible field falls to the end of
 * the grid, so a slot never disappears with the connector that named it.
 */
export function ConnectionFields({
  connector, value = {}, onChange, showErrors = false, idPrefix = 'conn', after = {},
  // What the connection itself cannot know — currently the operations the
  // application is allowed to perform, which decide whether the Create, Update
  // and Delete API sections are asked for at all.
  ctx = {},
}) {
  // A JSON payload is judged when the operator leaves the field, not on every
  // keystroke — half a document is not an error, it is a document being typed.
  // A field that is required and empty is still flagged straight away.
  const [blurred, setBlurred] = useState({})
  if (specFor(connector).length === 0) {
    return (
      <div className="banner" data-tone="info">
        <Icon name="info" size={15} />
        <div>This connector type has no endpoint. Accounts are recorded manually and reconciled from an upload.</div>
      </div>
    )
  }
  // A field whose `when` predicate is false is not rendered at all, and the
  // validator skips it for the same reason — an operator is never held back by
  // a requirement on a control that is not on screen.
  const groups = specGroups(connector, value, ctx)
  const shown = groups.flatMap((g) => g.fields)
  const placed = new Set(shown.map((f) => f.id).filter((id) => after[id]))
  const orphans = Object.keys(after).filter((k) => after[k] && !placed.has(k))

  const renderField = (f) => {
    const v = value[f.id] == null ? '' : value[f.id]
    const pending = f.json && !blurred[f.id] && String(v).trim() !== ''
    const error = showErrors && !pending ? fieldIssue(f, value, '', ctx) || undefined : undefined
    const fieldId = `${idPrefix}-${f.id}`
    return (
      <Fragment key={f.id}>
        <Field label={f.label} required={fieldRequired(f, value, ctx)} span={f.span} hint={f.hint} htmlFor={fieldId} error={error}>
          {f.options ? (
            <Select
              id={fieldId}
              className={f.mono ? 'mono' : undefined}
              value={v}
              placeholder={f.placeholder}
              options={fieldOptions(f, value, ctx)}
              onChange={(e) => onChange({ [f.id]: e.target.value })}
            />
          ) : f.type === 'textarea' ? (
            <TextInput
              as="textarea"
              id={fieldId}
              className={f.mono ? 'mono' : undefined}
              rows={f.rows || 4}
              spellCheck="false"
              value={v}
              placeholder={f.placeholder}
              onChange={(e) => onChange({ [f.id]: e.target.value })}
              onBlur={f.json ? () => setBlurred((b) => (b[f.id] ? b : { ...b, [f.id]: true })) : undefined}
            />
          ) : (
            <TextInput
              id={fieldId}
              className={f.mono ? 'mono' : undefined}
              type={f.secret ? 'password' : 'text'}
              inputMode={f.numeric ? 'numeric' : undefined}
              autoComplete="off"
              spellCheck="false"
              value={v}
              placeholder={f.placeholder}
              onChange={(e) => onChange({ [f.id]: f.numeric ? e.target.value.replace(/[^0-9]/g, '') : e.target.value })}
            />
          )}
        </Field>
        {after[f.id]}
      </Fragment>
    )
  }

  /* A spec with no groups renders exactly as it always did — one grid. A
     grouped spec is not one form: authentication, response handling and one
     configuration per lifecycle operation are four separate decisions, and a
     flat list of twenty-six fields asked the operator to work out for
     themselves which six belonged to Create. */
  const grouped = groups.some((g) => g.group)
  if (!grouped) {
    return (
      <div className="grid grid-2">
        {shown.map(renderField)}
        {orphans.map((k) => <Fragment key={`slot-${k}`}>{after[k]}</Fragment>)}
      </div>
    )
  }

  return (
    <div className="stack">
      {groups.map((g, i) => (
        // A spec can carry more than one ungrouped run of fields (REST API
        // opens on a bare base URL and closes on a bare resource path either
        // side of its named groups), so the index disambiguates rather than
        // two unrelated buckets colliding on the same 'ungrouped' key.
        <div className="conn-group" key={g.group ? g.group : `ungrouped-${i}`}>
          {g.group && <div className="conn-group-h">{g.group}</div>}
          <div className="grid grid-2">{g.fields.map(renderField)}</div>
        </div>
      ))}
      {orphans.length > 0 && (
        <div className="grid grid-2">
          {orphans.map((k) => <Fragment key={`slot-${k}`}>{after[k]}</Fragment>)}
        </div>
      )}
    </div>
  )
}

/**
 * Extra authentication parameters, for a dynamic bearer connector.
 *
 * Key/value because the names belong to the target: a tenant id, an API
 * version, a subscription key. A fixed field list cannot carry names the
 * platform does not know in advance, so it carries pairs instead.
 */
export function AuthExtraFields({ rows = [], onChange, idPrefix = 'ax' }) {
  const set = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const add = () => onChange([...rows, { id: nextId(rows), key: '', value: '' }])

  return (
    <Card
      title="Additional authentication parameters"
      sub="Sent alongside the authorization value on every request. Names are the target's own."
      flush
      actions={<Button size="sm" icon="plus" onClick={add}>Add extra field</Button>}
    >
      {rows.length === 0 ? (
        <div className="conn-empty">
          None configured. The authorization value is sent on its own.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <colgroup>
              <col style={{ width: 240 }} />
              <col />
              <col style={{ width: 48 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Extra key</th>
                <th>Extra value</th>
                <th className="td-act"><span className="vis-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <TextInput
                      id={`${idPrefix}-k-${r.id}`}
                      className="mono"
                      value={r.key}
                      placeholder="X-Tenant-Id"
                      spellCheck="false"
                      aria-label={`Extra parameter name ${i + 1}`}
                      onChange={(e) => set(r.id, { key: e.target.value })}
                    />
                  </td>
                  <td>
                    <TextInput
                      className="mono"
                      value={r.value}
                      placeholder="acme"
                      spellCheck="false"
                      aria-label={`Extra parameter value ${i + 1}`}
                      onChange={(e) => set(r.id, { value: e.target.value })}
                    />
                  </td>
                  <td className="td-act">
                    <IconButton
                      icon="trash"
                      size="sm"
                      label={`Remove extra parameter ${i + 1}`}
                      onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Manual payload (MS-Entra, SCIM, REST API)
//
// These three connectors have no JSON body of their own — their target
// attributes come from a static catalogue, not from a payload an operator
// authors. Ticking this hands the operator a body anyway, pre-filled from
// that same catalogue, ahead of the attribute mapping it stands in for.
// ---------------------------------------------------------------------------

export function ManualPayloadField({ connector, value = {}, onChange, idPrefix = 'mp' }) {
  const [blurred, setBlurred] = useState(false)
  const enabled = !!value.manualPayload
  const raw = value.manualPayloadValue || ''
  let error
  if (blurred && raw.trim()) {
    try {
      JSON.parse(raw)
    } catch (e) {
      error = `Manual payload is not valid JSON: ${e.message}`
    }
  }

  const toggle = (on) => {
    const patch = { manualPayload: on }
    if (on && !raw.trim()) patch.manualPayloadValue = manualPayloadTemplate(connector)
    onChange(patch)
  }

  return (
    <div className="capi-block">
      <div className="sso-toggle">
        <div className="sso-toggle-m">
          <div className="sso-toggle-t">Manual payload</div>
          <div className="sso-toggle-s">Author the request body sent to the target by hand, instead of leaving it to the attribute mapping below.</div>
        </div>
        <Switch checked={enabled} onChange={toggle} label="Manual payload" />
      </div>
      {enabled && (
        <div style={{ marginTop: 12 }}>
          <Field
            label="Manual payload"
            htmlFor={`${idPrefix}-payload`}
            hint="Pre-filled from this connector's attribute catalogue. Edit freely — it is sent exactly as written."
            error={error}
            span={2}
          >
            <TextInput
              as="textarea"
              id={`${idPrefix}-payload`}
              className="mono"
              rows={8}
              spellCheck="false"
              value={raw}
              onChange={(e) => onChange({ manualPayloadValue: e.target.value })}
              onBlur={() => setBlurred(true)}
            />
          </Field>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Unique attribute pair (client item 2)
//
// One decision with two sides: the attribute the identity is known by here and
// the attribute the account is known by on the target. They sit side by side
// because neither is meaningful alone — a key is a pair of names or it is not a
// key. The same control renders on the wizard's connector step and on the
// Provisioning tab, so the pair cannot be designated twice with two answers.
// ---------------------------------------------------------------------------

export function UniqueAttributeFields({
  connector, rows = [], idamValue, targetValue, onChange, idPrefix = 'ua',
}) {
  const targets = targetAttrsFor(connector, rows)
  const targetOptions = targetValue && !targets.includes(targetValue) ? [...targets, targetValue] : targets
  // Every identity attribute is offered, and each option says what it currently
  // writes to — an operator choosing a key needs to see that the attribute they
  // are about to match on is not mapped at all.
  const idamOptions = IDAM_ATTRS.map((a) => {
    const row = rows.find((r) => r.idam === a.value)
    return { value: a.value, label: `${a.label} · ${row && row.target ? `writes ${row.target}` : 'not mapped'}` }
  })
  const unmapped = !!idamValue && !rows.some((r) => r.idam === idamValue)

  return (
    <>
      <Field
        label="Unique app attribute"
        htmlFor={`${idPrefix}-target`}
        hint="The attribute an account is identified by on the target."
      >
        <Select
          id={`${idPrefix}-target`}
          className="mono"
          value={targetValue || ''}
          placeholder="Select a target attribute"
          options={targetOptions}
          onChange={(e) => onChange({ uniqueTargetAttribute: e.target.value })}
        />
      </Field>
      <Field
        label="Unique IDAM attribute"
        htmlFor={`${idPrefix}-idam`}
        hint="The identity attribute matched against it during provisioning and reconciliation."
        error={unmapped ? 'This attribute has no mapping, so no value is written for it.' : undefined}
      >
        <Select
          id={`${idPrefix}-idam`}
          value={idamValue || ''}
          placeholder="Not set"
          options={idamOptions}
          onChange={(e) => {
            // The two sides are one pairing, so choosing the identity attribute
            // proposes the target its mapping already writes to. An operator
            // whose target differs overrides it in the field beside this one.
            const next = e.target.value
            const mapped = uniqueTargetFor(rows, next)
            onChange({ uniqueAttribute: next, ...(mapped ? { uniqueTargetAttribute: mapped } : {}) })
          }}
        />
      </Field>
    </>
  )
}

// ---------------------------------------------------------------------------
// Error classification (client item 4)
//
// A condition-to-category table rather than a text box, because the platform
// acts differently per category and an operator needs to say more than one
// thing: 422 is a bad record and should not be retried, 401 stops the run.
// ---------------------------------------------------------------------------

/**
 * Error classification keywords.
 *
 * A category and the responses that fall into it. It was a two-column table of
 * one condition per row, which is the same information laid out so that a
 * category with six keywords occupied six rows and could not be read as one
 * thing. Keywords are badges under the category they belong to now: what the
 * platform will do with a 401 is a property of "Authentication error", and that
 * is the level the reader is deciding at.
 */
export function ErrorClassification({ rows = [], onChange }) {
  const [category, setCategory] = useState(ERROR_CATEGORIES[0])
  const [keyword, setKeyword] = useState('')

  const byCategory = ERROR_CATEGORIES.map((cat) => ({
    cat,
    rows: rows.filter((r) => r.category === cat),
  }))

  const trimmed = keyword.trim()
  // A keyword classifies a response once; the same keyword under a second
  // category would be dead configuration.
  const duplicate = trimmed
    ? rows.find((r) => String(r.match).trim().toLowerCase() === trimmed.toLowerCase())
    : null

  const add = () => {
    if (!trimmed || duplicate) return
    onChange([...rows, { id: nextId(rows), match: trimmed, category }])
    setKeyword('')
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      {rows.length === 0 ? (
        <span className="t-sm t-mut">
          No condition is classified. Every failure is recorded as an unclassified error and retried on the default
          backoff.
        </span>
      ) : (
        <div className="ec-cats">
          {byCategory.filter((g) => g.rows.length > 0).map((g) => (
            <div className="ec-cat" key={g.cat}>
              <div className="ec-cat-k">{g.cat}</div>
              <div className="ec-cat-list">
                {g.rows.map((r) => (isDefaultErrorClass(r) ? (
                  <span className="chip mono" key={r.id} title="Default keyword · cannot be removed">
                    {r.match}
                    <Icon name="lock" size={9} />
                    <span className="vis-hidden">default, cannot be removed</span>
                  </span>
                ) : (
                  <span className="chip mono" key={r.id}>
                    {r.match}
                    <button
                      type="button"
                      className="chip-x"
                      aria-label={`Remove ${r.match} from ${g.cat}`}
                      onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                    >
                      <Icon name="x" size={9} />
                    </button>
                  </span>
                )))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ec-add-wrap">
        <div className="ec-add">
          <Select id="ec-cat" aria-label="Category" value={category} options={ERROR_CATEGORIES} onChange={(e) => setCategory(e.target.value)} />
          <TextInput
            id="ec-kw"
            aria-label="New keyword"
            value={keyword}
            placeholder="Enter new keyword"
            spellCheck="false"
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          />
          <Button variant="pri" icon="plus" disabled={!trimmed || !!duplicate} onClick={add}>Add</Button>
        </div>
        {duplicate && <span className="ec-add-err">“{trimmed}” is already a {duplicate.category} keyword.</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Signing certificate (item 3)
// ---------------------------------------------------------------------------

/**
 * The signing certificate.
 *
 * Nothing is shown until a certificate is actually supplied. The card used to
 * fall back to the platform key material and render its subject, issuer,
 * fingerprint and validity, which read as "this application has a certificate
 * configured" when no one had configured one.
 */
/* `readOnly` states the certificate without offering to replace it — the View
   page shows what is configured, and changing it belongs on the Edit page. */
export function CertificateCard({ cert, onChange, sub, readOnly = false }) {
  const { toast } = useApp()
  const [pasting, setPasting] = useState(false)
  const [pem, setPem] = useState('')
  const fileRef = useRef(null)
  const tone = cert ? (cert.daysLeft < 30 ? 'bad' : cert.daysLeft < 90 ? 'warn' : 'ok') : 'mut'

  const applyText = (text, source) => {
    const parsed = certFromText(text, source)
    if (!parsed) {
      toast('warn', 'Certificate not readable', 'The supplied content does not look like certificate material.')
      return
    }
    onChange(parsed)
    setPasting(false)
    setPem('')
    toast('ok', 'Certificate applied', `Fingerprint ${parsed.fingerprint.slice(0, 23)}… expires ${parsed.notAfter}.`)
  }

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => applyText(String(reader.result || ''), `Uploaded · ${file.name}`)
    reader.readAsText(file)
  }

  return (
    <Card
      title="Certificate"
      sub={sub || 'Signing certificate published in the metadata document and used to sign every assertion.'}
      actions={readOnly ? undefined : (
        <>
          <input ref={fileRef} type="file" accept=".pem,.crt,.cer,.txt" style={{ display: 'none' }} onChange={onFile} aria-label="Upload signing certificate" />
          <Button size="sm" icon="upload" onClick={() => fileRef.current && fileRef.current.click()}>Upload certificate</Button>
          <Button size="sm" icon="edit" onClick={() => setPasting((p) => !p)}>{pasting ? 'Close paste' : 'Paste PEM'}</Button>
          {cert && <Button size="sm" icon="trash" onClick={() => { onChange(null); toast('ok', 'Certificate removed', 'Assertions are signed with the platform key material until another is supplied.') }}>Remove</Button>}
        </>
      )}
    >
      {pasting && !readOnly && (
        <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
          <TextInput
            as="textarea"
            rows={4}
            className="mono"
            value={pem}
            placeholder={'-----BEGIN CERTIFICATE-----\nMIIC…\n-----END CERTIFICATE-----'}
            onChange={(e) => setPem(e.target.value)}
            aria-label="Certificate PEM"
          />
          <div className="row">
            <span className="t-xs t-mut">The certificate is parsed locally. Nothing is written until the record is saved.</span>
            <span className="spacer" />
            <Button size="sm" variant="pri" icon="check" disabled={!pem.trim()} onClick={() => applyText(pem, 'Pasted PEM')}>Apply certificate</Button>
          </div>
        </div>
      )}

      {!cert ? (
        <EmptyState
          size="sm"
          icon="certify"
          title="No certificate supplied"
          body={readOnly
            ? 'None is configured. Assertions are signed with the platform key material.'
            : 'Upload or paste the certificate material. Nothing is shown here until one is provided — assertions are signed with the platform key in the meantime.'}
        />
      ) : (
        <>
          <div className="row-between" style={{ marginBottom: 7 }}>
            <span className="t-micro t-mut">Validity remaining</span>
            <span className="t-xs num" style={{ color: tone === 'ok' ? undefined : `var(--${tone})`, fontWeight: 600 }}>
              {cert.daysLeft} days
            </span>
          </div>
          <Meter value={Math.max(2, Math.min(100, (cert.daysLeft / 730) * 100))} tone={tone} height={7} />
          <div style={{ marginTop: 12 }}>
            <KeyValue
              cols={1}
              rows={[
                { k: 'Subject', v: cert.subject, icon: 'certify' },
                { k: 'Issuer', v: cert.issuer, icon: 'building' },
                { k: 'Fingerprint (SHA-1)', v: <span className="mono t-xs app-cert-fingerprint">{cert.fingerprint}</span>, icon: 'key' },
                { k: 'Valid', v: `${cert.notBefore} to ${cert.notAfter}`, icon: 'calendar' },
                { k: 'Source', node: <Tag tone="acc">{cert.source}</Tag>, icon: 'file' },
              ]}
            />
          </div>
          {cert.daysLeft < 90 && (
            <div className="banner" data-tone={tone} style={{ marginTop: 12 }}>
              <Icon name="warn" size={15} />
              <div>This certificate expires in {cert.daysLeft} days. Upload replacement key material before service providers start rejecting assertions.</div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Metadata XML upload (item 6)
// ---------------------------------------------------------------------------

export function MetadataUpload({ onParsed, size = 'sm' }) {
  const { toast } = useApp()
  const fileRef = useRef(null)

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseMetadataXml(String(reader.result || ''))
      if (!parsed.entityId && !parsed.acs) {
        toast('warn', 'Metadata not recognised', `${file.name} does not contain an entityID or an AssertionConsumerService location.`)
        return
      }
      onParsed(parsed, file.name)
      toast('ok', 'Metadata imported', [
        parsed.entityId && 'Entity ID',
        parsed.acs && 'ACS URL',
        parsed.slo && 'Logout URL',
        parsed.certificate && 'signing certificate',
      ].filter(Boolean).join(', ') + ` prefilled from ${file.name}.`)
    }
    reader.readAsText(file)
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".xml,text/xml" style={{ display: 'none' }} onChange={onFile} aria-label="Upload SAML metadata XML" />
      <Button size={size} icon="upload" onClick={() => fileRef.current && fileRef.current.click()}>Upload metadata XML</Button>
    </>
  )
}

// ---------------------------------------------------------------------------
// Attribute configuration (client items 1 and 4)
//
// An attribute is configured in two halves. The claim half — the name the
// service provider expects — is always the same. The source half depends
// entirely on where the value comes from, so the operator chooses a matter type
// first and only the fields that matter type needs are then rendered.
// ---------------------------------------------------------------------------

// One matter type's source fields, driven entirely by its `fields` spec so a
// new matter type needs no changes here.
export function MapperFields({ type, value, onChange, showErrors = false, idPrefix = 'mf' }) {
  if (!type) return null
  return (
    <div className="grid grid-2">
      {type.fields.map((f) => {
        const v = value[f.id] == null ? '' : value[f.id]
        const blocked = f.dependsOn && !value[f.dependsOn]
        const fieldId = `${idPrefix}-${f.id}`
        const error = showErrors && f.required && !String(v).trim() ? `${f.label} is required.` : undefined

        if (f.control === 'switch') {
          return (
            <Field key={f.id} label=" " span={f.span} hint={f.hint}>
              <div className="row" style={{ minHeight: 31 }}>
                <Switch checked={!!value[f.id]} onChange={(on) => onChange({ [f.id]: on })} label={f.label} />
                <span className="t-sm">{f.label}</span>
              </div>
            </Field>
          )
        }

        return (
          <Field key={f.id} label={f.label} required={f.required} span={f.span} hint={f.hint} htmlFor={fieldId} error={error}>
            {f.control === 'select' ? (
              <Select
                id={fieldId}
                className={f.mono ? 'mono' : undefined}
                value={v}
                disabled={blocked}
                placeholder={blocked ? f.blockedPlaceholder || 'Not available yet' : f.placeholder}
                /* A register that can change while the console is open — the
                   client list, the application groups, the central attribute
                   names — is declared as a function and read here, so a client
                   registered a minute ago is offerable without a reload. */
                options={typeof f.options === 'function' ? f.options() : f.options}
                onChange={(e) => onChange({ [f.id]: e.target.value })}
              />
            ) : (
              <TextInput
                as={f.control === 'textarea' ? 'textarea' : undefined}
                rows={f.rows}
                id={fieldId}
                className={f.mono ? 'mono' : undefined}
                spellCheck="false"
                value={v}
                placeholder={f.placeholder}
                onChange={(e) => onChange({ [f.id]: e.target.value })}
              />
            )}
          </Field>
        )
      })}
    </div>
  )
}

// The matter-type picker. It is deliberately the first thing in the editor:
// nothing below it can be filled in until the source is known.
export function MapperTypePicker({ protocol, value, onChange, idPrefix = 'mt' }) {
  return (
    <div className="matter-grid">
      {MAPPERS_FOR(protocol).map((t) => (
        <button
          key={t.id}
          type="button"
          id={`${idPrefix}-${t.id}`}
          className="matter-card"
          data-on={value === t.id || undefined}
          aria-pressed={value === t.id}
          onClick={() => onChange(t.id)}
        >
          <span className="row" style={{ gap: 8 }}>
            <span className="feed-ic" data-tone={value === t.id ? 'acc' : 'mut'} style={{ width: 26, height: 26 }}>
              <Icon name={t.icon} size={13} />
            </span>
            <span className="t-sm" style={{ fontWeight: 600 }}>{t.label}</span>
            {value === t.id && <Icon name="checkC" size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
          </span>
          <span className="t-xs t-mut" style={{ lineHeight: 1.45 }}>{t.sub}</span>
        </button>
      ))}
    </div>
  )
}

// The full editor, shared by the application tab, the Add Application wizard and
// the application record so both stay in step.
export function AttributeEditor({
  protocol = 'SAML', draft, onDraft, onCancel, onSave, idPrefix = 'attr',
}) {
  const type = mapperType(draft.mapperType)
  const [attempted, setAttempted] = useState(false)
  const issues = attributeIssues(draft)
  const set = (patch) => onDraft({ ...draft, ...patch })
  const family = familyOf(protocol)

  const commit = () => {
    if (issues.length) { setAttempted(true); return }
    onSave()
  }

  return (
    <div className="card-b attr-editor">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="t-h3">{draft.id ? 'Edit mapper' : 'New mapper'}</span>
        <IconButton icon="x" size="sm" label="Discard" onClick={onCancel} />
      </div>

      <div className="section-head" style={{ marginBottom: 8 }}>
        <span className="section-title">1 · Mapper type</span>
        <span className="section-sub">
          {family === 'SAML'
            ? 'SAML mapper types. Each one releases a named attribute into the assertion, and the fields below change to match.'
            : 'OIDC / OAuth mapper types. Each one writes a claim into the token, and the fields below change to match.'}
        </span>
      </div>
      <MapperTypePicker
        protocol={protocol}
        value={draft.mapperType}
        onChange={(id) => onDraft(withMapperType(draft, id))}
        idPrefix={`${idPrefix}-mt`}
      />

      {!type ? (
        <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
          <Icon name="info" size={15} />
          <div>Choose a mapper type to configure it.</div>
        </div>
      ) : (
        <>
          <div className="section-head" style={{ margin: '18px 0 8px' }}>
            <span className="section-title">2 · Mapper name</span>
            <span className="section-sub">How this mapper is listed on the application. It is not what the application receives.</span>
          </div>
          <div className="grid grid-2">
            <Field
              label="Name" required
              htmlFor={`${idPrefix}-name`}
              error={attempted && !String(draft.name).trim() ? 'A mapper name is required.' : undefined}
            >
              <TextInput id={`${idPrefix}-name`} value={draft.name} placeholder="Email attribute" onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Description" span={2} htmlFor={`${idPrefix}-desc`}>
              <TextInput id={`${idPrefix}-desc`} value={draft.description || ''} placeholder="What this mapper is for and who consumes it." onChange={(e) => set({ description: e.target.value })} />
            </Field>
          </div>

          <div className="section-head" style={{ margin: '18px 0 8px' }}>
            <span className="section-title">3 · {type.label} configuration</span>
            <span className="section-sub">{type.detail}</span>
          </div>
          <MapperFields
            type={type}
            value={draft}
            onChange={set}
            showErrors={attempted}
            idPrefix={`${idPrefix}-src`}
          />

          <div className="row" style={{ marginTop: 14 }}>
            <Switch checked={!!draft.required} onChange={(v) => set({ required: v })} label="Required" />
            <span className="t-sm">
              {family === 'SAML'
                ? 'Refuse the sign-in when the source returns no value'
                : 'Refuse to mint the token when the source returns no value'}
            </span>
          </div>
        </>
      )}

      {attempted && issues.length > 0 && (
        <div className="banner" data-tone="warn" style={{ marginTop: 14 }}>
          <Icon name="warn" size={15} />
          <div>{issues[0]}</div>
        </div>
      )}

      <div className="row" style={{ marginTop: 14 }}>
        <span className="spacer" />
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!type} onClick={commit}>{draft.id ? 'Save mapper' : 'Add mapper'}</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Operation configuration (client item 11)
// ---------------------------------------------------------------------------

export function OperationChecks({
  value = {}, onChange, specs, idPrefix = 'ops', disabledIds = [],
}) {
  return (
    <div className="op-grid">
      {specs.map((o) => {
        // A locked operation (Create, on a new application) is always on and
        // cannot be argued with from this control — the checkbox says so
        // rather than merely refusing the click.
        const locked = disabledIds.includes(o.id)
        return (
          <label className="op-row" key={o.id} htmlFor={`${idPrefix}-${o.id}`}>
            <Check
              checked={locked || !!value[o.id]}
              disabled={locked}
              onChange={(v) => onChange({ ...value, [o.id]: v })}
              label={o.label}
            />
            <span className="op-m">
              <span className="op-t" id={`${idPrefix}-${o.id}`}>{o.label}</span>
              <span className="op-s">{locked ? `${o.hint} Always enabled for a new application.` : o.hint}</span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
// ---------------------------------------------------------------------------
// URL configurations (item 8)
// ---------------------------------------------------------------------------

/**
 * URL configuration.
 *
 * The address an identity is launched at, and the attributes carried on its
 * query string. Both halves are chosen rather than typed: the base address
 * comes from the URLs the application has already published in its own
 * specification, and each parameter takes its value from an attribute the
 * application actually releases. Free-typing a pattern let an operator
 * reference `{mail}` on an application that releases no such attribute, and the
 * mistake only surfaced at a sign-in.
 */
export function UrlConfigCard({ rows, onChange, baseUrls = [], attributes = [] }) {
  const { toast, confirm } = useApp()
  const [draft, setDraft] = useState(null)
  const atLimit = rows.length >= URL_LIMIT
  const legacy = rows.length > URL_LIMIT

  const released = [...new Set(attributes.map(releasedName).filter((n) => n && n !== '—'))]
  const attrNames = [...new Set([...released, ...rows.flatMap((r) => patternAttrs(r.pattern))])]
  /* Whatever a saved configuration already launches at stays selectable, even
     when it is a deeper path than any address published on the record —
     editing a URL never silently moves it to the application root. */
  const savedBases = rows.map((r) => parsePattern(r.pattern).base).filter(Boolean)
  const baseOptions = [...new Set([...baseUrls, ...savedBases].filter(Boolean))]

  /* The stored value is still one pattern string, so everything downstream —
     the register, the launch tile, the export — is unchanged. Building and
     parsing it live in the model, beside the separator and input-type
     definitions they have to agree with. */
  const patternOf = (d) => buildPattern(d.base, d.params, d.join)

  /* An existing row is read back into its halves so editing it is the same
     control as creating it. */
  const draftFrom = (row) => ({ ...row, ...parsePattern(row.pattern) })

  const ready = draft && patternOf(draft)

  const save = () => {
    const pattern = patternOf(draft)
    if (draft.id) {
      onChange(rows.map((r) => (r.id === draft.id ? { ...r, pattern, enabled: draft.enabled } : r)))
      toast('ok', 'URL configuration saved', pattern)
    } else {
      onChange([...rows, { id: nextId(rows), pattern, enabled: draft.enabled }])
      toast('ok', 'URL configuration added', 'It is used from the next sign-in.')
    }
    setDraft(null)
  }

  const remove = (row) => confirm({
    title: 'Delete this URL configuration?',
    body: `Identities can no longer be sent to ${urlConfigLabel(row)} with released attributes on the query string.`,
    confirmLabel: 'Delete configuration',
    onConfirm: () => {
      onChange(rows.filter((r) => r.id !== row.id))
      toast('ok', 'URL configuration deleted', urlConfigLabel(row))
    },
  })

  const setParam = (i, patch) => setDraft((d) => ({
    ...d,
    params: d.params.map((p, k) => (k === i ? { ...p, ...patch } : p)),
  }))

  const startDraft = (row) => setDraft(row
    ? draftFrom(row)
    : { base: baseOptions[0] || '', join: '?', params: [], enabled: true })

  /* The nonce in the preview is regenerated whenever the draft changes, which
     is what a token generated per launch looks like from here. */
  const previewNonce = useMemo(() => sampleNonce(), [draft])

  return (
    <Card
      title="URL configuration"
      sub="The application URL an identity is launched at, and the released attributes carried on its query string."
      flush
      actions={(
        <Button
          size="sm"
          variant="pri"
          icon="plus"
          disabled={atLimit || !!draft}
          title={atLimit ? 'An application supports one URL configuration.' : undefined}
          onClick={() => startDraft(null)}
        >
          Add URL
        </Button>
      )}
      footer={
        <>
          <span><b className="num">{rows.length}</b> configured</span>
          <span><b className="num">{rows.filter((r) => r.enabled).length}</b> enabled</span>
          <span className="spacer" />
          <span>
            {atLimit
              ? 'An application supports a single URL configuration, so adding another is unavailable. Edit the address, or delete it to configure a different one.'
              : 'Only attributes released by this application can be carried on the query string.'}
          </span>
        </>
      }
    >
      {legacy && (
        <div className="url-note">
          <Banner tone="info">
            This record carries {rows.length} URL configurations from before an application was limited to one. All of
            them are still evaluated at sign-in. Delete the ones no longer in use to bring the record down to the single
            supported configuration.
          </Banner>
        </div>
      )}

      {draft && (
        <div className="card-b" style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="t-h3">{draft.id ? 'Edit URL configuration' : 'New URL configuration'}</span>
            <IconButton icon="x" size="sm" label="Discard" onClick={() => setDraft(null)} />
          </div>

          <div className="grid grid-2">
            <Field
              label="Base URL" required
              hint={baseOptions.length
                ? 'Chosen from the addresses this application has published in its protocol configuration.'
                : 'No address is published on this application yet. Set an application, root or home URL on the SSO tab first.'}
              htmlFor="urlc-base"
            >
              <Select
                id="urlc-base"
                className="mono"
                value={draft.base}
                placeholder={baseOptions.length ? 'Select a published URL' : 'No published URL'}
                options={baseOptions}
                disabled={baseOptions.length === 0}
                onChange={(e) => setDraft((d) => ({ ...d, base: e.target.value }))}
              />
            </Field>
            <Field
              label="Join"
              required
              hint="How the query string opens after the base URL. Every parameter after the first is joined with &."
              htmlFor="urlc-join"
            >
              <Select
                id="urlc-join"
                className="mono"
                value={draft.join || '?'}
                options={QUERY_JOINS}
                onChange={(e) => setDraft((d) => ({ ...d, join: e.target.value }))}
              />
            </Field>
          </div>

          <div className="section-head" style={{ margin: '16px 0 8px' }}>
            <span className="section-title">Query parameters</span>
            <span className="section-sub">
              Each parameter states what it is called and where its value comes from — a value typed here, an IDAM
              attribute of the identity, or a nonce generated once per launch.
            </span>
          </div>

          {draft.params.length === 0 ? (
            <div className="t-sm t-mut">No parameter yet. The identity is launched at the base URL alone.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}><table className="tbl">
              <colgroup>
                <col style={{ width: 210 }} />
                <col style={{ width: 160 }} />
                <col />
                <col style={{ width: 48 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Input type</th>
                  <th>Value</th>
                  <th className="td-act"><span className="vis-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {draft.params.map((p, i) => (
                  /* Index-keyed deliberately: a row is identified by its
                     position while its halves are still being chosen. */
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td>
                      <TextInput
                        className="mono"
                        value={p.key}
                        placeholder="Enter Key"
                        aria-label={`Parameter key ${i + 1}`}
                        onChange={(e) => setParam(i, { key: e.target.value })}
                      />
                    </td>
                    <td>
                      <Select
                        value={p.inputType || 'Manual'}
                        options={PARAM_INPUT_TYPES}
                        aria-label={`Input type for parameter ${i + 1}`}
                        onChange={(e) => setParam(i, {
                          inputType: e.target.value,
                          // The value belongs to the type that produced it, so
                          // switching type clears the half that no longer means
                          // anything rather than carrying it across.
                          attr: '',
                          value: e.target.value === NONCE_TOKEN ? NONCE_TOKEN : '',
                        })}
                      />
                    </td>
                    <td>
                      {p.inputType === NONCE_TOKEN && (
                        /* A single-use token is generated at launch. The field
                           states what will be sent and cannot be typed into. */
                        <TextInput
                          className="mono"
                          value={NONCE_TOKEN}
                          disabled
                          readOnly
                          aria-label={`Value for parameter ${i + 1}`}
                        />
                      )}
                      {p.inputType === 'IDAM Attribute' && (
                        <Select
                          className="mono"
                          value={p.attr || ''}
                          placeholder="Select IDAM Attribute"
                          options={IDAM_ATTR_PARAM_OPTIONS}
                          aria-label={`IDAM attribute for parameter ${i + 1}`}
                          onChange={(e) => setParam(i, { attr: e.target.value })}
                        />
                      )}
                      {(p.inputType || 'Manual') === 'Manual' && (
                        <TextInput
                          className="mono"
                          value={p.value || ''}
                          placeholder="Enter Value"
                          aria-label={`Value for parameter ${i + 1}`}
                          onChange={(e) => setParam(i, { value: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="td-act">
                      <IconButton
                        icon="trash"
                        size="sm"
                        label={`Remove parameter ${i + 1}`}
                        onClick={() => setDraft((d) => ({ ...d, params: d.params.filter((_, k) => k !== i) }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <Button
              size="sm"
              icon="plus"
              onClick={() => setDraft((d) => ({ ...d, params: [...d.params, blankParam()] }))}
            >
              Add row
            </Button>
          </div>

          {/* Two readings of the same URL: the pattern that is stored, and what
              one identity is actually launched at once the attributes are
              filled in and the nonce is generated. */}
          <div className="url-preview">
            <div>
              <div className="t-micro t-mut" style={{ marginBottom: 5 }}>URL pattern</div>
              <div className="code mono" style={{ display: 'block', padding: '8px 10px', lineHeight: 1.7 }}>
                {patternOf(draft) || '— select a base URL —'}
              </div>
            </div>
            <div>
              <div className="t-micro t-mut" style={{ marginBottom: 5 }}>Launch URL preview · {SAMPLE_IDENTITY}</div>
              <div className="code mono url-preview-launch" style={{ display: 'block', padding: '8px 10px', lineHeight: 1.7 }}>
                {patternOf(draft) ? sampleLaunchUrl(patternOf(draft), previewNonce) : '—'}
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <span className="spacer" />
            <Button onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="pri" icon="save" disabled={!ready} onClick={save}>{draft.id ? 'Save URL' : 'Add URL'}</Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon="globe"
          size="sm"
          title="No URL configured"
          body="Add the application URL that carries released attributes on the query string."
          actions={<Button size="sm" variant="pri" icon="plus" disabled={!!draft} onClick={() => startDraft(null)}>Add URL</Button>}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}><table className="tbl">
          <thead>
            <tr>
              <th>URL pattern</th>
              <th style={{ width: 220 }}>Attributes sent</th>
              <th style={{ width: 96 }}>Enabled</th>
              <th className="td-act" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td-main td-mono app-url-pattern" title={r.pattern}>{r.pattern}</td>
                <td>
                  <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                    {patternAttrs(r.pattern).length
                      ? patternAttrs(r.pattern).map((a) => <span key={a} className="tag mono">{a}</span>)
                      : <span className="t-faint">None</span>}
                  </span>
                </td>
                <td>
                  <Switch
                    checked={r.enabled}
                    label="Enable this URL configuration"
                    onChange={(v) => onChange(rows.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))}
                  />
                </td>
                <td className="td-act">
                  <span className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                    <IconButton icon="edit" size="sm" label="Edit this URL configuration" onClick={() => startDraft(r)} />
                    <IconButton icon="trash" size="sm" label="Delete this URL configuration" onClick={() => remove(r)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Protocol settings
//
// SAML and OpenID Connect are rendered from the published field register by
// SpecFields, on both the wizard step and the SSO tab, so neither surface can
// hold a field the other does not. The hand-written forms that used to render
// those two protocols here were removed with the second surface that used them.
// A link application asserts nothing, so the register has nothing to say about
// it and it keeps the short form below.
// ---------------------------------------------------------------------------

export function FieldGroup({ title, sub, children }) {
  return (
    <div className="fgroup">
      <div className="section-head">
        <span className="section-title">{title}</span>
        {sub && <span className="section-sub">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

/**
 * Link application.
 *
 * It asserts nothing and provisions nothing — it puts a tile in the catalog
 * that opens a URL. The only real decision is where it goes.
 */
export function LinkFields({ value, onChange, attempted = false, idPrefix = 'lk' }) {
  const set = (patch) => onChange(patch)
  const id = (k) => `${idPrefix}-${k}`
  const issues = linkIssues(value)

  return (
    <div className="stack" style={{ gap: 20 }}>
      <FieldGroup title="Destination" sub="Where the catalog tile sends the identity.">
        <div className="grid grid-2">
          <Field
            label="Target URL" required span={2} htmlFor={id('url')}
            hint="Opened as-is. No token is issued and nothing is asserted to the destination."
            error={attempted && issues.length ? issues[0] : undefined}
          >
            <TextInput id={id('url')} className="mono" value={value.targetUrl} placeholder="https://intranet.example.com/handbook" onChange={(e) => set({ targetUrl: e.target.value })} />
          </Field>
        </div>
        {String(value.targetUrl || '').startsWith('http://') && (
          <div style={{ marginTop: 14 }}>
            <Banner tone="warn">This destination is plain HTTP. Anything sent to it travels in clear text.</Banner>
          </div>
        )}
      </FieldGroup>

      <FieldGroup title="Preview" sub="What the catalog tile opens.">
        <div className="code mono" style={{ display: 'block', padding: '9px 11px', lineHeight: 1.7 }}>
          {value.targetUrl || '— set a target URL —'}
        </div>
      </FieldGroup>
    </div>
  )
}
