import Avatar from '../../components/primitives/Avatar'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { USERS } from '../../data/seed'
import { num, statusTone } from '../../lib/format'
import { useMemo, useState } from 'react'
import {
  APP_NAMES, IP_VALUES, LIST_PATH, USERNAMES, addressesFrom, canonicalAddress, overlapsAddress,
  rangeInfo, validAddress,
} from './networkData'

// ---------------------------------------------------------------------------
// A binding still ties one identity to one address — that is what the engine
// evaluates. What changed is the form: an operator holding a ticket with six
// office ranges on it now enters all six at once and gets six bindings, rather
// than filling this page in six times (client item: add multiple IP when
// adding an IP restriction).
//
// The multi-value control follows the pattern used when onboarding an
// application: type or paste into one field, pick from the known values beside
// it, and see what you have accumulated as a removable list underneath.
// ---------------------------------------------------------------------------

export default function BindingForm({ binding, rows, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => ({
    username: binding ? binding.username : USERNAMES[0],
    application: binding ? binding.application : APP_NAMES[0],
    action: binding ? binding.action : 'Allow',
    status: binding ? binding.status : 'Active',
  }))
  const [addresses, setAddresses] = useState(() => (binding ? [binding.ipAddress] : []))
  const [entry, setEntry] = useState('')
  const [entryError, setEntryError] = useState('')
  const [focused, setFocused] = useState(() => (binding ? binding.ipAddress : ''))
  const [dirty, setDirty] = useState(false)

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }

  const canonical = useMemo(() => new Set(addresses.map(canonicalAddress)), [addresses])

  // Adding accepts a whole pasted block, so one action can absorb a list from a
  // ticket. Everything that is not a valid address is reported rather than
  // silently dropped.
  const addAddresses = (text) => {
    const tokens = addressesFrom(text)
    if (tokens.length === 0) return
    const accepted = []
    const invalid = []
    const duplicate = []
    const seen = new Set(canonical)
    tokens.forEach((t) => {
      if (!validAddress(t)) { invalid.push(t); return }
      const key = canonicalAddress(t)
      if (seen.has(key)) { duplicate.push(t); return }
      seen.add(key)
      accepted.push(t.trim())
    })
    if (accepted.length > 0) {
      setAddresses((list) => [...list, ...accepted])
      setFocused(accepted[accepted.length - 1])
      setDirty(true)
    }
    if (invalid.length === 0 && duplicate.length === 0) {
      setEntry('')
      setEntryError('')
      return
    }
    // Keep only what could not be used, so the operator fixes it in place.
    setEntry([...invalid, ...duplicate].join(' '))
    setEntryError(
      invalid.length > 0
        ? `${invalid.length === 1 ? 'That value is' : `${invalid.length} values are`} not a valid IPv4 address or CIDR range.`
        : `${duplicate.length === 1 ? 'That address is' : `${duplicate.length} addresses are`} already on this list.`,
    )
  }

  const removeAddress = (value) => {
    setAddresses((list) => list.filter((a) => a !== value))
    setFocused((f) => (f === value ? '' : f))
    setDirty(true)
  }

  // The known-ranges row is a multi-select: a chip that is already on the list
  // removes it again, so the same control both adds and clears.
  const toggleKnown = (value) => {
    if (canonical.has(canonicalAddress(value))) removeAddress(addresses.find((a) => canonicalAddress(a) === canonicalAddress(value)))
    else addAddresses(value)
  }

  const typedFirst = addressesFrom(entry).find(validAddress) || ''
  const preview = rangeInfo(focused || typedFirst)
  const valid = draft.username && draft.application && addresses.length > 0

  const siblings = rows.filter(
    (r) => r.username === draft.username && r.application === draft.application && (!binding || String(r.id) !== String(binding.id)),
  )

  // Overlaps are computed per address so the operator can see which entry in the
  // list is the problem, not just that the set as a whole has one.
  const conflicts = useMemo(() => addresses.map((a) => {
    const hits = siblings.filter((r) => overlapsAddress(a, r.ipAddress))
    return { address: a, hits }
  }), [addresses, siblings])

  const overlapping = conflicts.filter((c) => c.hits.length > 0)
  const user = USERS.find((u) => u.username === draft.username)

  const extra = binding ? Math.max(0, addresses.length - 1) : addresses.length
  const saveLabel = binding
    ? (extra > 0 ? `Save and add ${extra} more` : 'Save changes')
    : addresses.length > 1 ? `Create ${addresses.length} bindings` : 'Create binding'

  const submit = () => onSave(addresses.map((ipAddress) => ({
    ...draft,
    ipAddress: ipAddress.trim(),
  })))

  return (
    <>
      <DetailHeader
        backTo={binding ? `${LIST_PATH}/${binding.id}` : LIST_PATH}
        backLabel={binding ? binding.username : 'Network Access Policies'}
        eyebrow="Network restriction"
        title={binding ? 'Edit binding' : 'New IP binding'}
        sub="A binding ties one identity to one address range for one application. Add several addresses and each one becomes its own binding, sharing the subject and decision set below. An identity with no binding for an application inherits the tenant default of allow."
        media={user ? <Avatar first={user.firstName} last={user.lastName} size="xl" /> : undefined}
        badges={binding ? <span className="mono t-xs">{binding.id}</span> : <Pill tone="acc" dot>Draft</Pill>}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Subject" sub="Who the restriction applies to, where it applies and what it returns">
              <div className="grid grid-2">
                <Field label="Username" required hint="The binding is keyed to the identity, not to the address." htmlFor="bind-user">
                  <Select id="bind-user" value={draft.username} options={USERNAMES} onChange={(e) => set({ username: e.target.value })} />
                </Field>
                <Field label="Application" required hint="Bindings are evaluated per application." htmlFor="bind-app">
                  <Select id="bind-app" value={draft.application} options={APP_NAMES} onChange={(e) => set({ application: e.target.value })} />
                </Field>
                {/* Status is set here rather than after the fact, so a binding
                    can be staged deactivated and reviewed before it compiles. */}
                <Field label="Status" hint="A deactivated binding is stored but takes no part in evaluation.">
                  <div className="row" style={{ gap: 10, paddingTop: 4 }}>
                    <Switch
                      checked={draft.status === 'Active'}
                      onChange={(v) => set({ status: v ? 'Active' : 'Disabled' })}
                      label="Binding active"
                    />
                    <Pill tone={statusTone(draft.status)} dot>{draft.status}</Pill>
                  </div>
                </Field>
              </div>
              {user && (
                <div style={{ marginTop: 14 }}>
                  <KeyValue
                    rows={[
                      { k: 'Email', v: user.email, icon: 'at' },
                      { k: 'Employee type', v: user.employeeType, icon: 'tag' },
                      { k: 'Organization', v: user.organization, icon: 'building' },
                      { k: 'Existing bindings for this application', v: num(siblings.length), icon: 'noentry' },
                    ]}
                  />
                </div>
              )}
            </Card>

            <Card
              title="Addresses"
              sub="One or more addresses or CIDR ranges. Each address on the list becomes a binding of its own."
              footer={
                <>
                  <span><b className="num">{addresses.length}</b> {addresses.length === 1 ? 'address' : 'addresses'}</span>
                  <span><b className="num">{overlapping.length}</b> overlapping an existing binding</span>
                  <span className="spacer" />
                  <span>
                    {binding
                      ? extra > 0
                        ? `Saving updates this binding and creates ${extra} more.`
                        : 'Saving updates this binding.'
                      : `Saving creates ${num(addresses.length)} ${addresses.length === 1 ? 'binding' : 'bindings'}.`}
                  </span>
                </>
              }
            >
              <div className="ip-add-row">
                <Field
                  label="IP address"
                  required={addresses.length === 0}
                  hint="For example 10.4.18.22 or 192.168.44.0/24. A bare address is treated as /32. Paste several separated by spaces, commas or new lines."
                  error={entryError}
                  htmlFor="bind-ip"
                >
                  <TextInput
                    id="bind-ip"
                    className="mono"
                    value={entry}
                    placeholder="10.4.18.22/32, 192.168.44.0/24"
                    autoComplete="off"
                    spellCheck="false"
                    onChange={(e) => { setEntry(e.target.value); setEntryError('') }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addAddresses(entry) }
                    }}
                  />
                </Field>
                {/* Enabled for any non-empty value: a paste containing one bad
                    token should still contribute the good ones and report the
                    rest, not leave the operator with a dead button. */}
                <Button icon="plus" disabled={!entry.trim()} onClick={() => addAddresses(entry)}>Add</Button>
              </div>

              <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                <span className="t-xs t-mut">Known ranges</span>
                {IP_VALUES.map((v) => {
                  const on = canonical.has(canonicalAddress(v))
                  return (
                    <button
                      key={v}
                      type="button"
                      className="chip"
                      data-on={on || undefined}
                      aria-pressed={on}
                      onClick={() => toggleKnown(v)}
                    >
                      <Icon name={on ? 'check' : 'plus'} size={11} />
                      <span className="mono">{v}</span>
                    </button>
                  )
                })}
              </div>

              <div className="ip-list">
                {addresses.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon="globe"
                    title="No addresses yet"
                    body="Type or paste an address, or pick one of the known ranges above. At least one is required."
                  />
                ) : (
                  <div style={{ overflowX: 'auto' }}><table className="tbl ip-tbl">
                    <colgroup>
                      <col style={{ width: 200 }} />
                      <col style={{ width: 74 }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 170 }} />
                      <col style={{ width: 48 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th>Prefix</th>
                        <th>Network</th>
                        <th className="td-num">Usable hosts</th>
                        <th>Overlap</th>
                        <th className="td-act" />
                      </tr>
                    </thead>
                    <tbody>
                      {addresses.map((a) => {
                        const info = rangeInfo(a)
                        const c = conflicts.find((x) => x.address === a)
                        return (
                          <tr
                            key={a}
                            data-active={focused === a || undefined}
                            onClick={() => setFocused(a)}
                          >
                            <td className="td-main td-mono">{a}</td>
                            <td className="td-mono">/{info.bits}</td>
                            <td className="td-mono">{info.network}</td>
                            <td className="td-num">{num(info.hosts)}</td>
                            <td>
                              {c && c.hits.length > 0
                                ? <Pill tone="warn" dot>Overlaps {c.hits.length}</Pill>
                                : <span className="t-mut">None</span>}
                            </td>
                            <td className="td-act">
                              <IconButton
                                icon="x"
                                size="sm"
                                label={`Remove ${a}`}
                                onClick={(e) => { e.stopPropagation(); removeAddress(a) }}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table></div>
                )}
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card
              title="Range preview"
              sub={focused ? 'The address selected on the list' : 'Computed from the value as you type'}
            >
              {!preview ? (
                <EmptyState
                  size="sm"
                  icon="globe"
                  title="No address selected"
                  body="Add an address, or select a row on the list, to see how the compiler expands it."
                />
              ) : (
                <>
                  <div className="row" style={{ marginBottom: 10 }}>
                    <Tag tone="acc"><span className="mono">{focused || typedFirst}</span></Tag>
                  </div>
                  <KeyValue
                    cols={1}
                    rows={[
                      { k: 'Prefix', node: <span className="mono">/{preview.bits}</span>, icon: 'globe' },
                      { k: 'Netmask', node: <span className="mono">{preview.mask}</span>, icon: 'target' },
                      { k: 'Network', node: <span className="mono">{preview.network}</span>, icon: 'server' },
                      { k: 'Usable hosts', v: num(preview.hosts), icon: 'layers' },
                      { k: 'First usable', node: <span className="mono">{preview.first}</span>, icon: 'arrowRight' },
                      { k: 'Last usable', node: <span className="mono">{preview.last}</span>, icon: 'arrowRight' },
                    ]}
                  />
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        message={dirty
          ? (addresses.length === 0 ? 'Unsaved changes · at least one address is required' : 'Unsaved changes')
          : 'No changes'}
      >
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!valid} onClick={submit}>{saveLabel}</Button>
      </StickyActions>
    </>
  )
}
