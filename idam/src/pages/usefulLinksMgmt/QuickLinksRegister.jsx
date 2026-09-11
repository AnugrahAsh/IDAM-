import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RegisterSummary from '../../components/workbench/RegisterSummary'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Tag from '../../components/primitives/Tag'
import Pill from '../../components/primitives/Pill'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { serialColumn } from '../../lib/format'
import { stamp } from '../comms/commsData'
import { useLinks, writeLinks } from './linksStore'
import LinkEditor from './LinkEditor'
import LinkView from './LinkView'
import { LIST_PATH, MANAGE_PATH, QUICK_LINKS_MODULE, WRITE_QUICK_LINK } from './quickLinksAccess'
import { describeAudience, readAudience } from '../comms/audienceModel'

// A scoped link reads as the scope itself — the named people or the condition —
// rather than as whichever sentinel the old select happened to carry.
const visibilityLabel = (r) => describeAudience(readAudience(r, 'visibility'))

/* `order` is still the sequence Quick Links renders in, but it is no longer
   authored: a new link is appended, and the field is not offered on the form.
   Nobody was choosing a number for it — they were choosing a position, which is
   what appending gives them. */
const blank = () => ({
  id: null, label: '', url: '', description: '', icon: 'link', status: 'Published',
  visibility: 'All users', createdOn: stamp(0), createdBy: 'admin',
})

/**
 * The Manage view of Quick Links: the whole collection, published or held back,
 * as a full page reached from the list rather than from its own navigation
 * entry — and only by a role that may publish.
 */
export default function QuickLinksRegister({ segments = [] }) {
  const { navigate, toast, confirm, can, role } = useApp()
  const all = useLinks()
  const setRows = writeLinks
  const [status, setStatus] = useState('All')

  const mode = segments[0]
  /* A row opens the read-only view; editing is a deliberate second step from
     there, at /manage/{id}/edit. */
  const editing = segments[1] === 'edit'
  const record = useMemo(
    () => (mode && mode !== 'add' ? all.find((r) => String(r.id) === String(mode)) : null),
    [mode, all],
  )

  // Every hook runs before the permission gate below returns early.
  const rows = useMemo(() => {
    const list = status === 'All'
      ? all
      : all.filter((r) => (status === 'Hidden' ? r.status === 'Hidden' : r.status !== 'Hidden'))
    return [...list].sort((a, b) => a.order - b.order)
  }, [all, status])


  const setStatusOn = (list, next) => {
    const ids = new Set(list.map((r) => String(r.id)))
    setRows((rs) => rs.map((r) => (ids.has(String(r.id)) ? { ...r, status: next } : r)))
    toast(
      'ok',
      next === 'Hidden' ? 'Links hidden' : 'Links published',
      next === 'Hidden'
        ? `${list.length} ${list.length === 1 ? 'link is' : 'links are'} no longer shown on Quick Links.`
        : `${list.length} ${list.length === 1 ? 'link is' : 'links are'} now visible to every identity in scope.`,
    )
  }

  // Checked here as well as on the button that reaches it, so a pasted address
  // cannot walk around the navigation.
  if (!can(QUICK_LINKS_MODULE, WRITE_QUICK_LINK)) {
    return (
      <>
        <PageBar
          title="Quick Links Management"
          crumbs={[{ label: 'Quick Links', to: 'usefullinks' }, { label: 'Quick Links Management' }]}
        />
        <Card>
          <EmptyState
            icon="lock"
            title="You cannot publish quick links"
            body={`${role.name} may open the published shortcuts but not author them. Ask a Global Identity Administrator for the Quick Links authoring permissions.`}
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate(LIST_PATH)}>Back to quick links</Button>}
          />
        </Card>
      </>
    )
  }

  if (mode === 'add') {
    return (
      <LinkEditor
        record={blank()}
        onCancel={() => navigate(MANAGE_PATH)}
        onDelete={() => {}}
        onSave={(v) => {
          setRows((rs) => [...rs, {
            ...v,
            id: rs.reduce((m, r) => Math.max(m, r.id), 0) + 1,
            order: rs.reduce((m, r) => Math.max(m, r.order || 0), 0) + 1,
          }])
          toast('ok', 'Link added', v.label)
          navigate(MANAGE_PATH)
        }}
      />
    )
  }

  if (mode) {
    if (!record) {
      return (
        <>
          <PageBar
            title="Link not found"
            crumbs={[{ label: 'Quick Links', to: 'usefullinks' }, { label: 'Quick Links Management', to: MANAGE_PATH }, { label: 'Not found' }]}
          />
          <Card>
            <EmptyState
              icon="link"
              title="No such link"
              body={`Link ${mode} does not exist.`}
              actions={<Button variant="pri" onClick={() => navigate(MANAGE_PATH)}>Back</Button>}
            />
          </Card>
        </>
      )
    }
    const remove = (r) => confirm({
      title: `Delete ${r.label}?`,
      body: 'The shortcut disappears from Quick Links for everyone in scope.',
      confirmLabel: 'Delete link',
      onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Link deleted', r.label); navigate(MANAGE_PATH) },
    })

    if (editing) {
      return (
        <LinkEditor
          record={record}
          onCancel={() => navigate(`${MANAGE_PATH}/${record.id}`)}
          onSave={(v) => {
            setRows((rs) => rs.map((r) => (r.id === v.id ? v : r)))
            toast('ok', 'Link saved', v.label)
            navigate(`${MANAGE_PATH}/${v.id}`)
          }}
          onDelete={remove}
        />
      )
    }

    return (
      <LinkView
        record={record}
        onEdit={(r) => navigate(`${MANAGE_PATH}/${r.id}/edit`)}
        onDelete={remove}
        onToggleStatus={(r) => setStatusOn([r], r.status === 'Hidden' ? 'Published' : 'Hidden')}
      />
    )
  }

  const publishedCount = all.filter((r) => r.status !== 'Hidden').length
  const hiddenCount = all.filter((r) => r.status === 'Hidden').length

  const columns = [
    serialColumn('S.No'),
    { key: 'label', label: 'Title', cls: 'td-main', locked: true, render: (r) => <span className="link" onClick={() => navigate(`${MANAGE_PATH}/${r.id}`)}>{r.label}</span> },
    { key: 'url', label: 'Link', cls: 'td-mono' },
    { key: 'description', label: 'Description' },
    {
      key: 'visibility', label: 'Visibility',
      value: (r) => visibilityLabel(r),
      render: (r) => <Tag>{visibilityLabel(r)}</Tag>,
    },
    {
      key: 'status', label: 'Status', width: 128,
      render: (r) => (
        <Pill tone={r.status === 'Hidden' ? 'mut' : 'ok'} dot>
          {r.status === 'Hidden' ? 'Hidden' : 'Published'}
        </Pill>
      ),
    },
    { key: 'createdOn', label: 'Created On', cls: 'td-mono' },
  ]

  return (
    <>
      <PageBar
        title="Quick Links Management"
        sub="Every shortcut in the collection, in the order users see them. Publishing here puts the link on the Quick Links page."
        crumbs={[{ label: 'Quick Links', to: 'usefullinks' }, { label: 'Quick Links Management' }]}
        actions={
          <>
            <Button icon="chevL" onClick={() => navigate(LIST_PATH)}>Back to quick links</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate(`${MANAGE_PATH}/add`)}>Add link</Button>
          </>
        }
      />

      <RegisterSummary
        ariaLabel="Quick link register"
        icon="link"
        label="Links"
        value={all.length}
        caption="in the collection"
        segments={[
          { id: 'Published', icon: 'checkC', label: 'Published', value: publishedCount, sub: 'shown to users in scope' },
          { id: 'Hidden', icon: 'eyeoff', label: 'Hidden', value: hiddenCount, sub: 'held back from users' },
        ]}
        active={status}
        allId="All"
        onSelect={setStatus}
      />

      <DataWorkbench
        id="useful-links-mgmt"
        rows={rows}
        columns={columns}
        selectable
        searchPlaceholder="Search by title, URL or description…"
        onRowClick={(r) => navigate(`${MANAGE_PATH}/${r.id}`)}
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" icon="check" onClick={() => { setStatusOn(all.filter((r) => ids.map(String).includes(String(r.id))), 'Published'); clear() }}>Publish</Button>
            <Button size="sm" icon="eyeoff" onClick={() => { setStatusOn(all.filter((r) => ids.map(String).includes(String(r.id))), 'Hidden'); clear() }}>Hide</Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => confirm({
              title: `Delete ${ids.length} links?`,
              body: 'They disappear from Quick Links for everyone in scope.',
              confirmLabel: `Delete ${ids.length}`,
              onConfirm: () => {
                const s = new Set(ids.map(String))
                setRows((rs) => rs.filter((r) => !s.has(String(r.id))))
                clear(); toast('ok', 'Links deleted', `${ids.length} removed.`)
              },
            })}>Delete</Button>
          </>
        )}
        rowActions={(r) => [
          { id: 'view', label: 'View', icon: 'eye', onSelect: () => navigate(`${MANAGE_PATH}/${r.id}`) },
          { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${MANAGE_PATH}/${r.id}/edit`) },
          r.status === 'Hidden'
            ? { id: 'publish', label: 'Publish', icon: 'check', onSelect: () => setStatusOn([r], 'Published') }
            : { id: 'hide', label: 'Hide from users', icon: 'eyeoff', onSelect: () => setStatusOn([r], 'Hidden') },
          { id: 'open', label: 'Open link', icon: 'external', onSelect: () => toast('info', 'Opening', r.url) },
          { divider: true },
          {
            id: 'del', label: 'Delete', icon: 'trash', danger: true,
            onSelect: () => confirm({
              title: `Delete ${r.label}?`,
              body: 'The shortcut disappears from Quick Links.',
              confirmLabel: 'Delete link',
              onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Link deleted', r.label) },
            }),
          },
        ]}
        emptyTitle="No links"
        emptyBody="Add a shortcut so users can reach documentation and support quickly."
        emptyIcon="link"
      />
    </>
  )
}
