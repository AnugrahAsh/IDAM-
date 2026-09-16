import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import Switch from '../../components/primitives/Switch'
import Field from '../../components/primitives/Field'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import SearchSelect from '../../components/primitives/SearchSelect'
import { ADMIN_PERMS } from '../../data/seed'
import {
  ADMIN_PERM_HELP, INPUT_TYPES, LEGACY_TYPES, NAME_HINT, NAME_RE, VALID_CHARS,
  hasLength, isAuto, isLookupType, prepopulateSources, storageOf,
  typeLabel, validateAttribute,
} from './rules'

/**
 * The attribute editor.
 *
 * The form is adaptive: the input type decides which other questions are worth
 * asking. Where the platform simply stops asking — administrator permission and
 * uniqueness on an auto-filled field — the control is replaced by a line saying
 * what the value will be, so the rule is visible rather than merely absent.
 */
export default function AttrEditor({
  attr, attrs = [], sections = [], lookups = {}, multiLookups = [], smartRules = [],
  onSubmit, onCancel,
}) {
  const [draft, setDraft] = useState(() => ({
    id: attr ? attr.id : '',
    label: attr ? attr.label : '',
    type: attr ? attr.type : 'text',
    section: attr ? attr.section : (sections[0] ? sections[0].id : ''),
    src: (attr && attr.src) || '',
    multiLookup: (attr && attr.multiLookup) || '',
    level: (attr && attr.level) || '',
    source: (attr && attr.source) || (attr && attr.target) || '',
    smartRule: (attr && attr.smartRule) || '',
    min: attr && attr.min != null ? attr.min : '',
    max: attr && attr.max != null ? attr.max : (attr && attr.maxLength != null ? attr.maxLength : ''),
    validChars: (attr && attr.validChars) || 'alnum',
    multiValue: attr ? !!attr.multiValue : false,
    unique: attr ? !!attr.unique : false,
    encrypted: attr ? !!attr.encrypted : false,
    adminPerm: (attr && attr.adminPerm) || ADMIN_PERMS[0],
    col: attr ? !!attr.col : false,
    order: attr ? attr.order : 1,
  }))
  const [error, setError] = useState('')
  const set = (k, v) => { setError(''); setDraft((d) => ({ ...d, [k]: v })) }

  const auto = isAuto(draft.type)
  const chain = multiLookups.find((m) => m.name === draft.multiLookup)
  const lookupKeys = Object.keys(lookups)
  const sourceOptions = prepopulateSources(attrs, attr ? attr.id : draft.id)

  // A type offered for creation, plus whatever legacy type this record already
  // carries so an existing attribute round-trips instead of being rewritten.
  const typeOptions = [
    ...INPUT_TYPES,
    ...LEGACY_TYPES.filter((t) => attr && attr.type === t.value),
  ]

  const nameError = !attr && draft.id.trim() && !NAME_RE.test(draft.id.trim())
    ? `“${draft.id.trim()}” is not a valid attribute name. ${NAME_HINT}`
    : ''
  // Flagged as the type is picked rather than at save: an operator changing
  // Text to Date should see immediately that the column cannot follow.
  const storageError = attr && storageOf(attr.type) !== storageOf(draft.type)
    ? 'The attribute data type cannot be modified.'
    : ''

  const submit = () => {
    const message = validateAttribute(draft, { attrs, editing: attr })
    if (message) { setError(message); return }
    onSubmit(clean())
  }

  /* Only the options belonging to the chosen input type are persisted, so a
     switch from Lookup to Text does not leave a dangling lookup binding. */
  const clean = () => {
    const base = {
      id: draft.id.trim(),
      label: draft.label.trim(),
      type: draft.type,
      section: draft.section,
      // The system owns an auto-filled value, so nobody types into it.
      adminPerm: auto ? 'Hide' : draft.adminPerm,
      unique: auto ? false : draft.unique,
      encrypted: !!draft.encrypted,
      col: auto || draft.adminPerm === 'Hide' ? false : draft.col,
      order: Number(draft.order) || 1,
    }
    const len = () => ({
      min: draft.min === '' ? undefined : Number(draft.min),
      max: draft.max === '' ? undefined : Number(draft.max),
      maxLength: draft.max === '' ? undefined : Number(draft.max),
    })
    if (draft.type === 'text' || draft.type === 'textarea') return { ...base, ...len(), validChars: draft.validChars }
    if (draft.type === 'number') return { ...base, ...len() }
    if (draft.type === 'lookup' || draft.type === 'select') {
      return { ...base, src: draft.src || undefined, multiValue: draft.multiValue }
    }
    if (draft.type === 'multi-level') {
      return {
        ...base,
        multiLookup: draft.multiLookup,
        level: draft.level,
        src: chain ? chain.levels[Number(draft.level) - 1] : undefined,
        multiValue: draft.multiValue,
      }
    }
    if (draft.type === 'prepopulate') return { ...base, source: draft.source }
    if (draft.type === 'smart-populate') return { ...base, smartRule: draft.smartRule }
    return base
  }

  const lengthLabel = draft.type === 'number' ? 'digits' : 'characters'

  return (
    <>
      {(error || storageError) && <Banner tone="bad">{error || storageError}</Banner>}

      <div className="grid grid-2">
        <Field
          label="Attribute name"
          required
          hint={attr ? 'Fixed once created — it is the column name on the users table.' : NAME_HINT}
          error={nameError}
          htmlFor="attr-id"
        >
          <TextInput
            id="attr-id"
            className="mono"
            value={draft.id}
            disabled={!!attr}
            onChange={(e) => set('id', e.target.value)}
            placeholder="employee_code"
          />
        </Field>

        <Field label="Display name" required hint="The label end users see. Must be unique." htmlFor="attr-label">
          <TextInput id="attr-label" value={draft.label} onChange={(e) => set('label', e.target.value)} placeholder="Employee code" />
        </Field>

        <Field
          label="Input type"
          required
          error={storageError || undefined}
          hint={attr
            ? `Stored as ${storageOf(attr.type)}. Only types with the same storage may be selected.`
            : 'Determines every question below.'}
        >
          <Select value={draft.type} onChange={(e) => set('type', e.target.value)} options={typeOptions} />
        </Field>

        <Field
          label="Section"
          required
          hint={sections.length === 0
            ? 'No sections exist yet. Create a section first on the Sections tab.'
            : 'Which group the field sits in on the user form.'}
        >
          {sections.length === 0 ? (
            <TextInput value="Create a section first" disabled />
          ) : (
            <Select
              value={draft.section}
              onChange={(e) => set('section', e.target.value)}
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
        </Field>

        {hasLength(draft.type) && (
          <>
            <Field label="Min length" hint={`Fewest ${lengthLabel} accepted.`}>
              <TextInput type="number" min="0" value={draft.min} onChange={(e) => set('min', e.target.value)} placeholder="No minimum" />
            </Field>
            <Field label="Max length" hint={`Most ${lengthLabel} accepted.`}>
              <TextInput type="number" min="0" value={draft.max} onChange={(e) => set('max', e.target.value)} placeholder="No maximum" />
            </Field>
          </>
        )}

        {(draft.type === 'text' || draft.type === 'textarea') && (
          <Field
            label="Valid characters"
            span={2}
            hint={(VALID_CHARS.find((c) => c.value === draft.validChars) || {}).hint}
          >
            <Select value={draft.validChars} options={VALID_CHARS} onChange={(e) => set('validChars', e.target.value)} />
          </Field>
        )}

        {(draft.type === 'email' || draft.type === 'date' || draft.type === 'tel' || draft.type === 'number') && (
          <Field label="Validation" span={2} hint="Fixed by the system for this input type — there is nothing to configure.">
            <span className="cfg-fixed">
              <Pill tone="mut" icon="lock">
                {draft.type === 'email' && 'Must look like an email address'}
                {draft.type === 'date' && 'Must be YYYY-MM-DD'}
                {draft.type === 'tel' && 'Must be exactly 10 digits'}
                {draft.type === 'number' && 'Digits only'}
              </Pill>
            </span>
          </Field>
        )}

        {(draft.type === 'lookup' || draft.type === 'select') && (
          <Field
            label="Lookup"
            required={draft.type === 'lookup'}
            span={2}
            hint={lookupKeys.length === 0
              ? 'No lookups exist yet. Create one on the Lookups tab first.'
              : 'The list this dropdown offers. Values, not labels, are what gets stored.'}
          >
            {lookupKeys.length === 0 ? (
              <TextInput value="Create a lookup first" disabled />
            ) : (
              <Select value={draft.src} onChange={(e) => set('src', e.target.value)} placeholder="Select a lookup" options={lookupKeys} />
            )}
          </Field>
        )}

        {draft.type === 'multi-level' && (
          <>
            <Field
              label="Multi-level lookup"
              required
              hint={multiLookups.length === 0
                ? 'None defined. Create one on the Multi-level lookups tab first.'
                : 'Each attribute maps to one level, not to the whole hierarchy.'}
            >
              {multiLookups.length === 0 ? (
                <TextInput value="Create a multi-level lookup first" disabled />
              ) : (
                <Select
                  value={draft.multiLookup}
                  onChange={(e) => { set('multiLookup', e.target.value); set('level', '') }}
                  placeholder="Select a lookup"
                  options={multiLookups.map((m) => ({ value: m.name, label: `${m.name} · ${m.levels.join(' → ')}` }))}
                />
              )}
            </Field>
            <Field label="Lookup level" required hint="Fills in once a lookup is chosen. Build one attribute per level.">
              <Select
                value={draft.level}
                onChange={(e) => set('level', e.target.value)}
                placeholder={chain ? 'Select a level' : 'Select a lookup first'}
                options={chain ? chain.levels.map((l, i) => ({ value: String(i + 1), label: `level-${i + 1} (${l})` })) : []}
              />
            </Field>
          </>
        )}

        {draft.type === 'prepopulate' && (
          <Field
            label="Attribute"
            required
            span={2}
            htmlFor="attr-source"
            hint="Only ordinary, enabled attributes are listed. A pre-populate or smart-populate field cannot be a source, so no chains and no loops are possible."
          >
            {sourceOptions.length === 0 ? (
              <TextInput id="attr-source" value="No eligible source attribute" disabled />
            ) : (
              <SearchSelect
                id="attr-source"
                value={draft.source}
                placeholder="Select the attribute to copy from"
                searchPlaceholder="Search attributes…"
                options={sourceOptions.map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` }))}
                onChange={(e) => set('source', e.target.value)}
              />
            )}
          </Field>
        )}

        {draft.type === 'smart-populate' && (
          <Field
            label="SmartPopulate"
            required
            span={2}
            hint={smartRules.length === 0
              ? 'No rule sets defined. Create one on the Smart Populate tab first.'
              : 'Conditions compare against lookup values, not the labels shown in the dropdown.'}
          >
            {smartRules.length === 0 ? (
              <TextInput value="Create a smart populate rule set first" disabled />
            ) : (
              <Select
                value={draft.smartRule}
                onChange={(e) => set('smartRule', e.target.value)}
                placeholder="Select a rule set"
                options={smartRules.map((r) => ({ value: r.name, label: `${r.name} · ${r.conditions.length} conditions` }))}
              />
            )}
          </Field>
        )}

        {isLookupType(draft.type) && (
          <Field label="Multi select" span={2} hint="Offered for lookup attributes only. Lets the end user pick more than one option.">
            <div className="row" style={{ gap: 10 }}>
              <Check checked={draft.multiValue} onChange={(v) => set('multiValue', v)} label="Multi select" />
              <span className="t-sm">{draft.multiValue ? 'More than one option may be selected' : 'A single option'}</span>
            </div>
          </Field>
        )}

        <Field
          label="Administrator permissions"
          required={!auto}
          hint={auto
            ? 'Not asked for an auto-filled attribute — the system owns the value.'
            : ADMIN_PERM_HELP[draft.adminPerm]}
          htmlFor="attr-perm"
        >
          {auto ? (
            <span className="cfg-fixed"><Pill tone="mut" icon="lock">Hide — forced</Pill></span>
          ) : (
            <Select id="attr-perm" value={draft.adminPerm} options={ADMIN_PERMS} onChange={(e) => set('adminPerm', e.target.value)} />
          )}
        </Field>

        <Field label="Display order" hint="Position within the section on the user form.">
          <TextInput type="number" min="1" value={draft.order} onChange={(e) => set('order', e.target.value)} />
        </Field>
      </div>

      <Field label="User permissions" hint="Always Read Only. An end user sees their own value but never changes it.">
        <span className="cfg-fixed"><Pill tone="mut" icon="lock">Read Only — fixed</Pill></span>
      </Field>

      {/* Encryption is a property of how the value is stored, not of how the
          form behaves, so it sits with User permissions rather than among the
          field's validation rules. It is a switch and not a third checkbox
          because it is the one setting here that changes what the database
          holds, and it reads as on or off rather than as a flag. */}
      <Field
        label="Encryption at rest"
        span={2}
        hint={draft.encrypted
          ? 'Values are encrypted in the database and decrypted only when the record is read by someone permitted to see it. Encrypted attributes cannot be searched or sorted in the directory, and are masked in exports.'
          : 'Values are stored as written. Turn this on for national identifiers, bank details and anything else that should not be readable in a database dump.'}
      >
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <Switch
            checked={draft.encrypted}
            onChange={(v) => set('encrypted', v)}
            label="Encryption at rest"
          />
          <span className="t-sm">
            {draft.encrypted ? 'On — stored encrypted' : 'Off — stored as plain text'}
          </span>
          {draft.encrypted && <Pill tone="ok" icon="lock">AES-256</Pill>}
        </div>
      </Field>

      {!auto && (
        <div className="row" style={{ marginTop: 12, gap: 10 }}>
          <Check checked={draft.unique} onChange={(v) => set('unique', v)} label="Unique" />
          <span className="t-sm">Unique — no two users may hold the same value</span>
        </div>
      )}

      {!auto && (
        <div className="row" style={{ marginTop: 10, gap: 10 }}>
          <Check
            checked={draft.adminPerm === 'Hide' ? false : draft.col}
            disabled={draft.adminPerm === 'Hide'}
            onChange={(v) => set('col', v)}
            label="Available as a directory column"
          />
          <span className="t-sm">
            Available as a directory table column
            {draft.adminPerm === 'Hide' && <span className="t-mut"> — unavailable while the attribute is hidden</span>}
          </span>
        </div>
      )}

      {auto && (
        <div className="cfg-note" style={{ marginTop: 12 }}>
          <b>{typeLabel(draft.type)}</b> attributes are read-only and system owned. Administrator permission is Hide,
          Unique is not offered, and the Required checkbox stays greyed out in Employee Type Configuration. The Enable
          toggle still works, so you decide per employee type whether the field exists at all.
        </div>
      )}

      {draft.type === 'multi-level' && chain && (
        <div className="cfg-note" style={{ marginTop: 12 }}>
          <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
            {chain.levels.map((l, i) => (
              <Tag key={l} tone={String(i + 1) === String(draft.level) ? 'acc' : undefined}>{`level-${i + 1} (${l})`}</Tag>
            ))}
          </span>
        </div>
      )}

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!!nameError || !!storageError} onClick={submit}>
          {attr ? 'Submit' : 'Create attribute'}
        </Button>
      </div>
    </>
  )
}
