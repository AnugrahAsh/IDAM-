import { useMemo, useState } from 'react'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import Check from '../../components/primitives/Check'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import { GROUPS } from '../../data/seed'
import { ATTR_SECTIONS, USER_ATTRS, attrOptions, sensitivityOf } from './data'

const matches = (g, q) => `${g.name} ${g.description} ${g.kind} ${g.application}`.toLowerCase().includes(q)

function GroupSearch({ q, setQ, placeholder }) {
  return (
    <div className="gp-search">
      <Icon name="search" size={13} />
      <input
        className="gp-q"
        value={q}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setQ(e.target.value)}
      />
      {q && (
        <button type="button" className="gp-x" aria-label="Clear search" onClick={() => setQ('')}>
          <Icon name="x" size={11} />
        </button>
      )}
    </div>
  )
}

/* Searchable multi-select over the group catalog. value is an array of group names. */
export function GroupMultiSelect({ value = [], onChange }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? GROUPS.filter((g) => matches(g, needle)) : GROUPS
  }, [q])
  const toggle = (name) => onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name])

  return (
    <div className="gp">
      <GroupSearch q={q} setQ={setQ} placeholder="Search groups by name, application or description…" />
      <div className="gp-list" role="listbox" aria-multiselectable="true" aria-label="Entitlements">
        {list.length === 0 && <div className="gp-empty t-xs t-mut">No group matches “{q.trim()}”.</div>}
        {list.map((g) => (
          <div
            key={g.name}
            className="gp-row"
            role="option"
            aria-selected={value.includes(g.name)}
            data-on={value.includes(g.name)}
            onClick={() => toggle(g.name)}
          >
            <Check checked={value.includes(g.name)} label={`Select ${g.name}`} onChange={() => toggle(g.name)} />
            <div className="gp-m">
              <div className="gp-t mono">{g.name}</div>
              <div className="gp-s t-xs t-mut trunc">{g.description} {g.application}</div>
            </div>
            {g.sodFlags > 0 && <span className="gp-flag" title={`${g.sodFlags} segregation-of-duties rules`}><Icon name="sod" size={11} /></span>}
            <Tag>{g.kind}</Tag>
            <SeverityBadge level={sensitivityOf(g.name)}>{sensitivityOf(g.name)}</SeverityBadge>
          </div>
        ))}
      </div>
      {value.length > 0 && (
        <div className="gp-chips">
          <span className="gp-chips-k t-micro t-mut">Selected ({value.length})</span>
          {value.map((n) => (
            <span className="gp-chip" data-tone="add" key={n}>
              <Icon name="group" size={11} />{n}
              <button type="button" aria-label={`Deselect ${n}`} onClick={() => toggle(n)}><Icon name="x" size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* Add/remove dual picker. value is { add: [names], remove: [names] }. */
export function GroupDualPicker({ value = { add: [], remove: [] }, onChange }) {
  const [q, setQ] = useState('')
  const add = value.add || []
  const remove = value.remove || []
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? GROUPS.filter((g) => matches(g, needle)) : GROUPS
  }, [q])

  const toggleAdd = (n) => onChange({
    add: add.includes(n) ? add.filter((x) => x !== n) : [...add, n],
    remove: remove.filter((x) => x !== n),
  })
  const toggleRemove = (n) => onChange({
    add: add.filter((x) => x !== n),
    remove: remove.includes(n) ? remove.filter((x) => x !== n) : [...remove, n],
  })

  return (
    <div className="gp">
      <GroupSearch q={q} setQ={setQ} placeholder="Search groups, then mark each one to add or to remove…" />
      <div className="gp-list" aria-label="Membership changes">
        {list.length === 0 && <div className="gp-empty t-xs t-mut">No group matches “{q.trim()}”.</div>}
        {list.map((g) => (
          <div
            key={g.name}
            className="gp-row"
            data-on={add.includes(g.name) || remove.includes(g.name)}
          >
            <div className="gp-m">
              <div className="gp-t mono">{g.name}</div>
              <div className="gp-s t-xs t-mut trunc">{g.description} {g.application}</div>
            </div>
            {g.sodFlags > 0 && <span className="gp-flag" title={`${g.sodFlags} segregation-of-duties rules`}><Icon name="sod" size={11} /></span>}
            <SeverityBadge level={sensitivityOf(g.name)}>{sensitivityOf(g.name)}</SeverityBadge>
            <button
              type="button"
              className="gp-act"
              data-kind="add"
              data-on={add.includes(g.name)}
              onClick={() => toggleAdd(g.name)}
            >
              <Icon name="plus" size={11} />Add
            </button>
            <button
              type="button"
              className="gp-act"
              data-kind="remove"
              data-on={remove.includes(g.name)}
              onClick={() => toggleRemove(g.name)}
            >
              <Icon name="minus" size={11} />Remove
            </button>
          </div>
        ))}
      </div>
      <div className="gp-cols">
        <div>
          <div className="gp-col-t t-micro t-mut">To add ({add.length})</div>
          <div className="gp-chips">
            {add.length === 0 && <span className="t-xs t-faint">No group marked for addition.</span>}
            {add.map((n) => (
              <span className="gp-chip" data-tone="add" key={n}>
                <Icon name="plus" size={10} />{n}
                <button type="button" aria-label={`Undo add ${n}`} onClick={() => toggleAdd(n)}><Icon name="x" size={10} /></button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="gp-col-t t-micro t-mut">To remove ({remove.length})</div>
          <div className="gp-chips">
            {remove.length === 0 && <span className="t-xs t-faint">No group marked for removal.</span>}
            {remove.map((n) => (
              <span className="gp-chip" data-tone="remove" key={n}>
                <Icon name="minus" size={10} />{n}
                <button type="button" aria-label={`Undo remove ${n}`} onClick={() => toggleRemove(n)}><Icon name="x" size={10} /></button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* Full attribute grid for Modify user. value is { attrId: stagedValue }. */
export function AttributeChangeEditor({ user, value = {}, onChange }) {
  if (!user) {
    return (
      <div className="banner" data-tone="info">
        <Icon name="info" size={15} />
        <div>Select an identity above to load its current attribute values. Every governed attribute can then be edited in place.</div>
      </div>
    )
  }
  const set = (id, val) => {
    const next = { ...value }
    if (val === undefined || val === '') delete next[id]
    else next[id] = val
    onChange(next)
  }
  return (
    <div className="attr-ed">
      <div className="attr-row attr-head">
        <span>Attribute</span>
        <span>Current value</span>
        <span>New value</span>
        <span />
      </div>
      {ATTR_SECTIONS.map((sec) => {
        const attrs = USER_ATTRS.filter((a) => a.section === sec.id)
        if (attrs.length === 0) return null
        return (
          <div key={sec.id} className="attr-sec">
            <div className="attr-sec-t t-micro t-mut">{sec.label}</div>
            {attrs.map((a) => {
              const cur = String(user[a.id] ?? '')
              const staged = value[a.id]
              const changed = staged !== undefined && String(staged).trim() !== '' && String(staged) !== cur
              const opts = attrOptions(a)
              const locked = a.id === 'username'
              return (
                <div className="attr-row" key={a.id} data-changed={changed}>
                  <span className="attr-k">
                    {a.label}
                    {a.core && <Tag>core</Tag>}
                  </span>
                  <span className="attr-cur mono" title={cur}>{cur || <span className="t-faint">not set</span>}</span>
                  <span className="attr-new">
                    {locked ? (
                      <span className="t-xs t-faint">Immutable — usernames never change</span>
                    ) : opts ? (
                      <Select
                        value={staged ?? ''}
                        options={opts}
                        placeholder="Keep current value"
                        aria-label={`New ${a.label}`}
                        onChange={(e) => set(a.id, e.target.value)}
                      />
                    ) : (
                      <TextInput
                        type={a.type === 'date' ? 'date' : 'text'}
                        value={staged ?? ''}
                        placeholder="Keep current value"
                        aria-label={`New ${a.label}`}
                        onChange={(e) => set(a.id, e.target.value)}
                      />
                    )}
                  </span>
                  <span className="attr-tail">
                    {changed && (
                      <button
                        type="button"
                        className="attr-undo"
                        title={`Discard the ${a.label} change`}
                        aria-label={`Discard the ${a.label} change`}
                        onClick={() => set(a.id, undefined)}
                      >
                        <Icon name="refresh" size={11} />
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* Old → new diff rows used by the change-summary card and the context rail. */
export function DiffList({ changes, empty = 'No changes staged yet.' }) {
  if (!changes || changes.length === 0) return <div className="t-sm t-mut">{empty}</div>
  return (
    <div className="diff-list">
      {changes.map((c) => (
        <div className="diff-row" key={c.id} data-kind={c.kind || 'modify'}>
          <span className="diff-kind" data-kind={c.kind || 'modify'}>
            <Icon name={c.kind === 'add' ? 'plus' : c.kind === 'remove' ? 'minus' : 'edit'} size={11} />
          </span>
          <span className="diff-field">{c.field}</span>
          <span className="diff-old mono">{c.from || 'not set'}</span>
          <span className="diff-arr"><Icon name="arrowRight" size={11} /></span>
          <span className="diff-new mono">{c.to}</span>
        </div>
      ))}
    </div>
  )
}
