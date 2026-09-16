import { useMemo } from 'react'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import EmptyState from '../../components/primitives/EmptyState'
import { num } from '../../lib/format'

/**
 * The value sets, as a master-detail register.
 *
 * A lookup is a short list read against one other list — "what can this field
 * offer, and what does it store" — and a paged table of lookups answered
 * neither without a round trip into a drawer. The sets stand on the left with
 * their sizes; the one being read is open on the right, values and stored
 * values side by side.
 *
 * Reading only. Every change to a set — adding a value, renaming one, removing
 * one, uploading a list — goes through the lookup editor, which validates the
 * whole list at once and is the single place a set can be written. Splitting
 * writes across two surfaces would mean two sets of rules to keep in step.
 */
export default function LookupWorkbench({
  rows, attrs, selected, onSelect, onCreate, onEdit, onView, onDownload, onDelete,
}) {
  const sel = rows.find((r) => r.key === selected) || rows[0]
  const options = sel ? sel.options : []
  const usedBy = useMemo(
    () => (sel ? attrs.filter((a) => a.src === sel.key) : []),
    [attrs, sel],
  )

  return (
    <div className="vs">
      <aside className="vs-side">
        <header className="vs-side-h">
          <div className="vs-side-m">
            <div className="vs-side-t">Value sets</div>
            <div className="vs-side-s">{num(rows.length)} {rows.length === 1 ? 'lookup' : 'lookups'}</div>
          </div>
          <IconButton icon="plus" label="New value set" onClick={onCreate} />
        </header>
        <div className="vs-list" role="tablist" aria-label="Value sets">
          {rows.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={sel && r.key === sel.key}
              className="vs-it"
              data-on={sel && r.key === sel.key ? true : undefined}
              onClick={() => onSelect(r.key)}
            >
              <Icon name={r.protected ? 'lock' : 'tag'} size={13} />
              <span className="vs-it-n mono">{r.key}</span>
              <span className="vs-it-c">{r.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="vs-main">
        {!sel ? (
          <EmptyState
            icon="tag"
            title="No value sets"
            body="A value set is a named list the identity form offers as a dropdown."
            actions={<Button variant="pri" icon="plus" onClick={onCreate}>Add Lookup</Button>}
          />
        ) : (
          <>
            <header className="vs-main-h">
              <div className="vs-main-m">
                <h2 className="vs-main-t mono">{sel.key}</h2>
                <div className="vs-main-s">
                  {num(sel.count)} {sel.count === 1 ? 'value' : 'values'}
                  {' · '}
                  {usedBy.length
                    ? `referenced by ${num(usedBy.length)} ${usedBy.length === 1 ? 'attribute' : 'attributes'}`
                    : 'not referenced by any attribute'}
                </div>
              </div>
              <div className="vs-main-a">
                <Button size="sm" icon="download" disabled={sel.count === 0} onClick={() => onDownload(sel)}>
                  Download CSV
                </Button>
                <Button size="sm" variant="pri" icon="edit" onClick={() => onEdit(sel)}>Edit/View</Button>
              </div>
            </header>

            <div className="vs-tbl-wrap">
              <table className="tbl vs-tbl">
                <thead>
                  <tr>
                    <th className="vs-c-n">#</th>
                    <th>Value</th>
                    <th>Stored as</th>
                    <th className="vs-c-s">State</th>
                    <th className="vs-c-a" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {options.length === 0 && (
                    <tr>
                      <td colSpan={5} className="vs-none">
                        This set holds no values yet. Open <b>Edit/View</b> to add them.
                      </td>
                    </tr>
                  )}
                  {options.map((o, i) => (
                    <tr key={`${o.value}-${i}`}>
                      <td className="vs-c-n mono">{i + 1}</td>
                      <td className="td-main">{o.option || <span className="t-faint">Unnamed</span>}</td>
                      <td className="td-mono">{o.value || <span className="t-faint">—</span>}</td>
                      {/* The platform records no per-value state today. The column
                          is the one the register is specified with, so it stays
                          and says so rather than inventing a status. */}
                      <td className="vs-c-s"><span className="t-faint">—</span></td>
                      <td className="vs-c-a">
                        <span className="vs-acts">
                          <IconButton size="sm" icon="eye" label={`View ${o.option}`} onClick={() => onView(sel, o)} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="vs-foot">
              <span className="vs-foot-k">Referenced by</span>
              {usedBy.length
                ? usedBy.map((a) => <Tag key={a.id}>{a.label}</Tag>)
                : <span className="t-sm t-faint">No attribute offers this set yet.</span>}
              <span className="spacer" />
              {!sel.protected && (
                <button type="button" className="link vs-foot-del" onClick={() => onDelete(sel)}>
                  <Icon name="trash" size={12} />Delete set
                </button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
