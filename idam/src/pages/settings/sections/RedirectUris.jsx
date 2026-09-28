import { useMemo, useState } from 'react'
import Card from '../../../components/primitives/Card'
import Button from '../../../components/primitives/Button'
import IconButton from '../../../components/primitives/IconButton'
import Icon from '../../../components/primitives/Icon'
import Field from '../../../components/primitives/Field'
import TextInput from '../../../components/primitives/TextInput'
import Select from '../../../components/primitives/Select'
import Modal from '../../../components/primitives/Modal'
import EmptyState from '../../../components/primitives/EmptyState'
import Banner from '../../../components/primitives/Banner'
import { useApp } from '../../../store/AppContext'
import SectionSkeleton, { TableSkeleton } from './SectionSkeleton'
import { writeSection } from '../settingsStore'

const PAGE_SIZES = ['10', '20', '50', '100']
const TODAY = '2026-08-05'

const valid = (u) => /^https?:\/\/[^\s]+$/i.test(String(u).trim())

/**
 * The redirect allow-list is an OAuth security boundary: a URI that is not on
 * it cannot receive an authorization response. It is a register rather than a
 * textarea so each entry carries who added it and when.
 */
export default function RedirectUris({ value, loading = false }) {
  const { toast, confirm } = useApp()
  const [q, setQ] = useState('')
  const [size, setSize] = useState('10')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ uri: '', description: '' })
  const [touched, setTouched] = useState(false)

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return value
    return value.filter((r) => r.uri.toLowerCase().includes(n) || String(r.description).toLowerCase().includes(n))
  }, [value, q])

  const per = Number(size)
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * per, current * per)

  const problem = !draft.uri.trim()
    ? 'Enter the URI an authorization response may be returned to.'
    : !valid(draft.uri)
      ? 'Use an absolute http:// or https:// URI.'
      : value.some((r) => r.uri.trim().toLowerCase() === draft.uri.trim().toLowerCase())
        ? 'This URI is already allow-listed.'
        : ''

  const add = () => {
    if (problem) { setTouched(true); return }
    writeSection('redirectUris', (rs) => [
      ...rs,
      {
        id: rs.reduce((m, r) => Math.max(m, r.id), 0) + 1,
        uri: draft.uri.trim(),
        description: draft.description.trim(),
        createdBy: 'SHUBHAM_JAIN',
        createdOn: TODAY,
      },
    ])
    toast('ok', 'Redirect URI added', `${draft.uri.trim()} may now receive an authorization response.`)
    setDraft({ uri: '', description: '' })
    setTouched(false)
    setAdding(false)
  }

  const remove = (row) => confirm({
    title: 'Remove this redirect URI?',
    body: `${row.uri} will stop receiving authorization responses immediately. Any application configured to return there fails its next sign-in.`,
    confirmLabel: 'Remove URI',
    onConfirm: () => {
      writeSection('redirectUris', (rs) => rs.filter((r) => r.id !== row.id))
      toast('ok', 'Redirect URI removed', row.uri)
    },
  })

/* Held while Settings settles. This section is a register of stored rows, not
   a form the operator arrives already typing into: the add row above the table
   appends to rows that are still on their way, so it holds its place with
   them. */
  if (loading) {
    return (
      <SectionSkeleton>
        {/* The row count is not a guess. Tenant configuration is one document
            and it is already in hand when the settle starts, so the shape is
            drawn at the count the table lands with — capped by the page size,
            because that is what the table shows. */}
        <TableSkeleton rows={Math.min(value.length, per) || 4} cols={6} bar />
      </SectionSkeleton>
    )
  }

  return (
    <>
      <Card
        title="Redirect URIs"
        sub="The allow-list an authorization response may be returned to. Anything not listed here is rejected by the gateway."
        actions={<Button size="sm" variant="pri" icon="plus" onClick={() => setAdding(true)}>Add URI</Button>}
      >
        <div className="set-reg-bar">
          {/* The same page-size control the registers use. It said "Show
              entries" beside a boxed select, which was a different control for
              the same job two screens apart. */}
          <span className="rows-picker">
            <span className="rows-picker-l">Rows</span>
            <Select
              options={PAGE_SIZES}
              value={size}
              onChange={(e) => { setSize(e.target.value); setPage(1) }}
              aria-label="Rows per page"
            />
          </span>
          <span className="wb-search set-reg-search">
            <Icon name="search" size={14} />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder="Search redirect URIs…"
              aria-label="Search redirect URIs"
            />
            {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            size="sm"
            icon="link"
            title="No URI's found."
            body={q ? 'No allow-listed URI matches the search.' : 'Add the first redirect URI an application may return an authorization response to.'}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 54 }}>S.no</th>
                  <th>Redirect URI</th>
                  <th>Description</th>
                  <th>Created by</th>
                  <th>Created on</th>
                  <th style={{ width: 60 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="td-num">{(current - 1) * per + i + 1}</td>
                    <td className="td-main mono">{r.uri}</td>
                    <td>{r.description || <span className="t-faint">—</span>}</td>
                    <td className="mono t-xs">{r.createdBy}</td>
                    <td className="mono t-xs">{r.createdOn}</td>
                    <td>
                      <IconButton icon="trash" size="sm" label={`Remove ${r.uri}`} onClick={() => remove(r)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="set-reg-pager">
            <span className="t-xs t-mut">
              Showing {(current - 1) * per + 1}–{Math.min(current * per, filtered.length)} of {filtered.length}
            </span>
            <div className="spacer" />
            <Button size="sm" icon="chevL" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</Button>
            <Button size="sm" iconRight="chevR" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</Button>
          </div>
        )}
      </Card>

      {adding && (
        <Modal
          title="Add redirect URI"
          icon="link"
          confirmLabel="Add URI"
          onConfirm={add}
          onClose={() => { setAdding(false); setTouched(false); setDraft({ uri: '', description: '' }) }}
        >
          <div className="stack">
            <Banner tone="info">
              Only exact matches are accepted at the gateway. Register each callback separately rather than using a wildcard.
            </Banner>
            <Field label="Redirect URI" required htmlFor="ru-uri" error={touched ? problem : ''}>
              <TextInput
                id="ru-uri"
                className="mono"
                value={draft.uri}
                placeholder="https://app.example.com/oauth/callback"
                onBlur={() => setTouched(true)}
                onChange={(e) => setDraft((d) => ({ ...d, uri: e.target.value }))}
              />
            </Field>
            <Field label="Description" htmlFor="ru-desc" hint="Which application returns here, so a later reviewer knows what it is for.">
              <TextInput
                as="textarea"
                id="ru-desc"
                rows={2}
                value={draft.description}
                placeholder="Employee portal OAuth callback"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </Field>
          </div>
        </Modal>
      )}
    </>
  )
}
