import { useEffect, useRef, useState } from 'react'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Modal from '../../components/primitives/Modal'
import Tag from '../../components/primitives/Tag'
import { APP_CATALOG } from './signOnPolicyData'

/**
 * Picks applications to attach.
 *
 * The previous modal drew a checkbox on every row but sent one application and
 * refused with a singular "Please select an application". Selection here is
 * genuinely multiple, and each chosen application becomes its own attachment.
 */
export default function AttachApplications({ policy, policies, onAttach, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [error, setError] = useState('')
  const searchRef = useRef(null)

  // The dialog takes focus when it opens; the search box is where the operator
  // starts, so it takes focus straight back.
  useEffect(() => { searchRef.current?.focus() }, [])

  const held = new Set(policy.applications.map((m) => String(m.appId)))
  const needle = q.trim().toLowerCase()
  const shown = APP_CATALOG.filter((a) => !needle
    || [a.name, a.displayName, a.protocol, a.url].some((v) => String(v).toLowerCase().includes(needle)))
  const open = shown.filter((a) => !held.has(String(a.id)))
  const allOn = open.length > 0 && open.every((a) => sel.has(a.id))
  const someOn = open.some((a) => sel.has(a.id))

  const others = (appId) => policies
    .filter((p) => p.id !== policy.id && p.applications.some((m) => String(m.appId) === String(appId)))
    .map((p) => p.name)

  const toggle = (id) => {
    setSel((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError('')
  }

  const toggleAll = () => {
    setSel((s) => {
      const next = new Set(s)
      open.forEach((a) => (allOn ? next.delete(a.id) : next.add(a.id)))
      return next
    })
    setError('')
  }

  const submit = () => {
    if (sel.size === 0) {
      setError('Select at least one application to attach.')
      return
    }
    onAttach([...sel])
  }

  return (
    <Modal
      title={`Attach applications to ${policy.name}`}
      icon="apps"
      size="xl"
      scroll
      onClose={onClose}
      footer={(
        <>
          <span className="t-xs t-mut sop-modal-count">{sel.size} selected</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="pri" icon="plus" onClick={submit}>
            {sel.size > 1 ? `Attach ${sel.size} applications` : 'Attach application'}
          </Button>
        </>
      )}
    >
      <div className="stack">
        <div className="wb-search is-block">
          <Icon name="search" size={14} />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, display name, type or URL…"
            aria-label="Search applications"
          />
          {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
        </div>

        {error && <div className="field-err" role="alert"><Icon name="warn" size={11} />{error}</div>}

        <div className="sop-pick-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="td-sel">
                  <Check checked={allOn} mixed={!allOn && someOn} disabled={open.length === 0} onChange={toggleAll} label="Select every listed application" />
                </th>
                <th>Name</th>
                <th>Display name</th>
                <th>Type</th>
                <th>URL</th>
                <th>Other policies</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState size="sm" icon="search" title="No applications found" body="Nothing in the SSO catalogue matches that search." />
                  </td>
                </tr>
              ) : shown.map((a) => {
                const attached = held.has(String(a.id))
                const on = sel.has(a.id)
                const names = others(a.id)
                return (
                  <tr
                    key={a.id}
                    data-selected={on || undefined}
                    data-attached={attached || undefined}
                    style={{ cursor: attached ? 'default' : 'pointer' }}
                    onClick={attached ? undefined : () => toggle(a.id)}
                  >
                    <td className="td-sel">
                      <Check checked={attached || on} disabled={attached} onChange={() => toggle(a.id)} label={`Select ${a.displayName}`} />
                    </td>
                    <td className="td-mono">{a.name}</td>
                    <td className="td-main">
                      <span className="row" style={{ gap: 6 }}>
                        {a.displayName}
                        {attached && <Tag tone="acc">Attached</Tag>}
                        {!a.enabled && <Tag>Disabled</Tag>}
                      </span>
                    </td>
                    <td><Tag>{a.protocol}</Tag></td>
                    <td className="td-mono">{a.url}</td>
                    <td>{names.length > 0 ? names.join(', ') : <span className="t-mut">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
