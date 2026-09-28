import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { SkeletonStats } from '../../components/primitives/Skeleton'
import { dateText } from '../../lib/clock'
import { serialColumn } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { LANG_LABEL } from './ConsentBodyEditor'
import ConsentTemplateForm from './ConsentTemplateForm'
import {
  CONSENT_TYPE_LABEL, TEMPLATE_BASE, blankTemplate, statusTone, validityText,
} from './consentTemplateData'

/* `loading` is Consent Management's flag: the tiles and the register land with
   the page bar and the tab strip rather than a frame after them. The template
   editor below is a form the operator types into, so it is never held. */
export default function ConsentTemplatesPage({ segments = [], templates, setTemplates, loading = false }) {
  const { navigate, toast, confirm } = useApp()
  const [facet, setFacet] = useState('all')
  const [head] = segments

  const nextId = () => templates.reduce((m, t) => Math.max(m, t.id), 0) + 1

  if (head === 'add') {
    return (
      <ConsentTemplateForm
        template={blankTemplate()}
        templates={templates}
        onCancel={() => navigate(TEMPLATE_BASE)}
        onSave={(t) => {
          const created = { ...t, id: nextId(), createdOn: dateText() }
          setTemplates((ts) => [...ts, created])
          toast('ok', 'Template created', `${created.name} was saved as ${created.status.toLowerCase()}.`)
          navigate(TEMPLATE_BASE)
        }}
      />
    )
  }

  if (head) {
    const template = templates.find((t) => String(t.id) === String(head))
    if (!template) {
      return (
        <>
          <PageBar title="Template not found" crumbs={[{ label: 'Consent Templates', to: TEMPLATE_BASE }, { label: 'Not found' }]} />
          <Card>
            <EmptyState
              icon="file"
              title={`No template with id ${head}`}
              body="It may have been deleted in this session."
              actions={<Button variant="pri" onClick={() => navigate(TEMPLATE_BASE)}>Back to templates</Button>}
            />
          </Card>
        </>
      )
    }
    return (
      <ConsentTemplateForm
        key={template.id}
        template={template}
        templates={templates}
        onCancel={() => navigate(TEMPLATE_BASE)}
        onSave={(t) => {
          setTemplates((ts) => ts.map((x) => (x.id === t.id ? t : x)))
          toast('ok', 'Template saved', t.name)
          navigate(TEMPLATE_BASE)
        }}
      />
    )
  }

  const setStatus = (t, status) => {
    setTemplates((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)))
    toast('ok', `Template ${status.toLowerCase()}`, status === 'Active'
      ? `${t.name} can now be selected when a consent is created.`
      : `${t.name} is no longer offered when a consent is created.`)
  }

  const counts = Object.fromEntries(['Draft', 'Active', 'Inactive', 'Archived'].map((s) => [s, templates.filter((t) => t.status === s).length]))
  const shown = facet === 'all' ? templates
    : templates.filter((t) => t.status === facet || (facet === 'Inactive' && t.status === 'Archived'))

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Template name', cls: 'td-main', locked: true,
      value: (r) => `${r.name} ${r.description}`,
      render: (r) => (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.name}</span>
          {r.description && <span className="cell-sub">{r.description}</span>}
        </span>
      ),
    },
    { key: 'category', label: 'Category', render: (r) => (r.category ? <Tag>{r.category}</Tag> : <span className="t-faint">—</span>) },
    { key: 'consentType', label: 'Consent type', value: (r) => CONSENT_TYPE_LABEL[r.consentType], render: (r) => CONSENT_TYPE_LABEL[r.consentType] },
    {
      key: 'languages', label: 'Languages',
      value: (r) => Object.keys(r.bodies).length,
      render: (r) => <span title={Object.keys(r.bodies).map((c) => LANG_LABEL[c] || c).join(', ')}>{Object.keys(r.bodies).length}</span>,
    },
    { key: 'validity', label: 'Validity', value: (r) => validityText(r), render: (r) => validityText(r) },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    { key: 'usedBy', label: 'Used by', align: 'right' },
    { key: 'createdOn', label: 'Created on', cls: 'td-mono' },
  ]

  return (
    <>
      {loading ? <SkeletonStats count={4} /> : (
      <StatCards
        items={[
          { id: 'all', icon: 'file', label: 'Templates', value: templates.length, sub: 'in the register' },
          { id: 'Active', icon: 'checkC', label: 'Active', value: counts.Active, chip: 'selectable', chipTone: 'ok', sub: 'offered when creating a consent' },
          { id: 'Draft', icon: 'edit', label: 'Draft', value: counts.Draft, sub: 'not yet offered' },
          { id: 'Inactive', icon: 'ban', label: 'Inactive', value: counts.Inactive + counts.Archived, sub: `${counts.Archived} archived` },
        ]}
        value={facet}
        onChange={(id) => setFacet(id === facet ? 'all' : id)}
        label="Filter consent templates by status"
      />
      )}

      <DataWorkbench
        id="consent-templates"
        rows={shown}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search templates by name or description…"
        toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => navigate(`${TEMPLATE_BASE}/add`)}>Create template</Button>}
        onRowClick={(r) => navigate(`${TEMPLATE_BASE}/${r.id}`)}
        rowActions={(r) => [
          { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${TEMPLATE_BASE}/${r.id}`) },
          {
            id: 'dup', label: 'Duplicate', icon: 'copy',
            onSelect: () => {
              const copy = { ...r, id: nextId(), name: `${r.name} (copy)`, status: 'Draft', usedBy: 0, createdOn: dateText(), createdBy: 'you' }
              setTemplates((ts) => [...ts, copy])
              toast('ok', 'Template duplicated', `${copy.name} was created as a draft.`)
            },
          },
          { divider: true },
          r.status === 'Active'
            ? { id: 'deactivate', label: 'Deactivate', icon: 'ban', onSelect: () => setStatus(r, 'Inactive') }
            : { id: 'activate', label: 'Activate', icon: 'checkC', disabled: r.status === 'Archived', onSelect: () => setStatus(r, 'Active') },
          { id: 'archive', label: 'Archive', icon: 'history', disabled: r.status === 'Archived', onSelect: () => setStatus(r, 'Archived') },
          { divider: true },
          {
            id: 'del', label: 'Delete', icon: 'trash', danger: true,
            disabled: r.status !== 'Draft',
            title: r.status !== 'Draft' ? 'Only draft templates can be deleted — archive it instead' : undefined,
            onSelect: () => confirm({
              title: `Delete ${r.name}?`,
              body: 'The draft is removed from the register. This cannot be undone.',
              confirmLabel: 'Delete template',
              onConfirm: () => { setTemplates((ts) => ts.filter((x) => x.id !== r.id)); toast('ok', 'Template deleted', r.name) },
            }),
          },
        ]}
        emptyTitle={facet === 'all' ? 'No templates yet' : `No ${facet.toLowerCase()} templates`}
        emptyBody="Create a template so consents can be started from approved wording."
        emptyIcon="file"
        footNote="Only active templates are offered when a consent is created"
      />
    </>
  )
}
