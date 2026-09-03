import './styles/HierarchyPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import IconButton from '../components/primitives/IconButton'
import Icon from '../components/primitives/Icon'
import Menu from '../components/primitives/Menu'
import Pill from '../components/primitives/Pill'
import KeyValue from '../components/primitives/KeyValue'
import EmptyState from '../components/primitives/EmptyState'
import Banner from '../components/primitives/Banner'
import { useApp } from '../store/AppContext'
import { num, statusTone } from '../lib/format'
import { nextId } from '../data/seed'
import UnitUsersPanel from './hierarchy/UnitUsersPanel'
import TreeNode from './hierarchy/TreeNode'
import NodeForm from './hierarchy/NodeForm'
import HierarchyForm from './hierarchy/HierarchyForm'
import SourceConfig from './hierarchy/SourceConfig'
import {
  HIERARCHIES, applyOverrides, buildTree, defaultBindings, emptyOverrides, levelsOf, lookupById,
  overrideReport, today,
} from './hierarchy/hierarchyData'

const kindLabel = (kind) => (kind === 'organization' ? 'Organization' : 'Department')

const walk = (node, fn, depth = 0, parent = null) => {
  fn(node, depth, parent)
  node.children.forEach((c) => walk(c, fn, depth + 1, node))
}

const filterTree = (node, needle) => {
  if (node.name.toLowerCase().includes(needle)) return node
  const kids = node.children.map((c) => filterTree(c, needle)).filter(Boolean)
  return kids.length ? { ...node, children: kids } : null
}

const collectUsers = (node) => {
  const out = []
  walk(node, (n) => { out.push(...n.members) })
  return out
}

/* Manual unit ids are numbered off the ones already stored rather than off a
   clock, so the same sequence of edits always produces the same ids. */
const nextManualId = (added) => {
  const n = added.reduce((m, x) => Math.max(m, Number(String(x.id).replace('man-', '')) || 0), 0)
  return `man-${n + 1}`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HierarchyPage() {
  const { navigate, toast, confirm, setDrawer } = useApp()

  /**
   * A tenant runs more than one structure over the same identities, and each
   * one is a definition rather than a stored tree: a multi-level lookup that
   * names the levels, a lookup attribute per level that supplies each node its
   * data, and whatever the operator has since changed by hand. Holding them as
   * records is what makes add, edit and delete of a *hierarchy* mean something
   * distinct from add, edit and delete of a unit inside one.
   */
  const [hierarchies, setHierarchies] = useState(HIERARCHIES)
  const [activeId, setActiveId] = useState(HIERARCHIES[0].id)
  const active = hierarchies.find((h) => h.id === activeId) || hierarchies[0]
  const configured = !!(active && active.lookupId)

  const [selected, setSelected] = useState('root')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(() => new Set(['root']))
  const [menu, setMenu] = useState(null)

  const derived = useMemo(() => (active ? buildTree(active) : null), [active])
  const tree = useMemo(
    () => (derived ? applyOverrides(derived, active.overrides) : null),
    [derived, active],
  )

  const index = useMemo(() => {
    const byId = {}
    const parents = {}
    const counts = {}
    let max = 0
    if (!tree) return { byId, parents, counts, max: 0, size: 0 }
    walk(tree, (n, d, p) => {
      byId[n.id] = n
      parents[n.id] = p ? p.id : null
      if (d > max) max = d
    })
    const countOf = (n) => {
      counts[n.id] = n.members.length + n.children.reduce((a, c) => a + countOf(c), 0)
      return counts[n.id]
    }
    countOf(tree)
    return { byId, parents, counts, max, size: Object.keys(byId).length }
  }, [tree])

  const needle = q.trim().toLowerCase()
  const visible = useMemo(
    () => (tree ? (needle ? filterTree(tree, needle) : tree) : null),
    [tree, needle],
  )

  /* Flat list of matches with the path each one sits on, so a filtered result
     says where it is rather than only that it exists. */
  const matches = useMemo(() => {
    if (!needle || !tree) return []
    const out = []
    walk(tree, (n) => {
      if (!n.name.toLowerCase().includes(needle)) return
      const trail = []
      let cur = index.parents[n.id]
      while (cur && index.byId[cur]) { trail.unshift(index.byId[cur].name); cur = index.parents[cur] }
      out.push({ id: n.id, name: n.name, kind: n.kind, path: trail.join(' / ') || 'Tenant root' })
    })
    return out
  }, [tree, needle, index])

  const node = index.byId[selected] || tree
  const parent = node && index.parents[node.id] ? index.byId[index.parents[node.id]] : null
  const nodeUsers = useMemo(() => (node ? collectUsers(node) : []), [node])
  const report = useMemo(
    () => (active && derived ? overrideReport(active, derived) : null),
    [active, derived],
  )

  const levels = levelsOf(active)
  const lookup = lookupById(active && active.lookupId)
  const boundLabels = levels.filter((l) => l.attr).map((l) => l.attr.label)

  /* The chain from the tenant root down to the selected unit. Used three ways:
     the path bar above the tree, the lineage highlight inside it, and the
     parent/child strip on the record — all three answer "where am I". */
  const lineage = useMemo(() => {
    const out = []
    let cur = selected
    while (cur && index.byId[cur]) { out.unshift(cur); cur = index.parents[cur] }
    return out
  }, [selected, index])
  const lineageSet = useMemo(() => new Set(lineage), [lineage])

  const path = useMemo(() => {
    if (!node) return []
    const out = []
    let cur = node.id
    while (cur && index.byId[cur]) {
      out.unshift(index.byId[cur].name)
      cur = index.parents[cur]
    }
    return out
  }, [node, index])

  const toggle = (id) => setOpen((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const expandAll = () => setOpen(new Set(Object.keys(index.byId)))
  const collapseAll = () => setOpen(new Set(['root']))

  /**
   * Open the tree to a given depth.
   *
   * "Expand all" on a tenant with forty units produces a wall nobody reads.
   * Opening to a level is how a large structure is actually navigated — see
   * every organization, then every unit under one of them.
   */
  const expandToLevel = (level) => {
    const next = new Set()
    if (tree) walk(tree, (n, d) => { if (d < level) next.add(n.id) })
    setOpen(next)
  }

  /* Reveal a unit wherever it is: every ancestor is opened and the unit is
     selected, so a search result can be jumped to without hunting for it. */
  const revealNode = (id) => {
    const chain = []
    let cur = id
    while (cur && index.byId[cur]) { chain.push(cur); cur = index.parents[cur] }
    setOpen((o) => new Set([...o, ...chain]))
    setSelected(id)
    setQ('')
  }

  const openUsers = (id) => {
    const target = index.byId[id]
    if (!target) return
    const users = collectUsers(target)
    setDrawer({
      title: target.name,
      sub: `${num(users.length)} ${users.length === 1 ? 'user' : 'users'} in this ${kindLabel(target.kind).toLowerCase()}${target.children.length ? ', including every unit beneath it' : ''}`,
      children: <UnitUsersPanel users={users} />,
      footer: <Button onClick={() => setDrawer(null)}>Close</Button>,
    })
  }

  // -------------------------------------------------------------------------
  // The hierarchy itself
  // -------------------------------------------------------------------------

  const patchActive = (patch) => setHierarchies((hs) => hs.map(
    (h) => (h.id === active.id ? { ...h, ...patch, updated: today() } : h),
  ))

  const patchOverrides = (fn) => patchActive({ overrides: fn(active.overrides || emptyOverrides()) })

  const openSourceConfig = () => setDrawer({
    title: 'Configure hierarchy',
    sub: `Which lookup defines the levels of ${active.name}, and which attribute each level reads.`,
    size: 'lg',
    children: (
      <SourceConfig
        hierarchy={active}
        onCancel={() => setDrawer(null)}
        onApply={(draft) => {
          patchActive(draft)
          setSelected('root')
          setOpen(new Set(['root']))
          setDrawer(null)
          const lk = lookupById(draft.lookupId)
          toast(
            'ok',
            'Hierarchy rebuilt',
            lk
              ? `${active.name} is now built from ${lk.name}, reading ${lk.levels.length} levels.`
              : `${active.name} has no source configured, so no tree is produced.`,
          )
        }}
      />
    ),
  })

  const openAddHierarchy = () => setDrawer({
    title: 'Add hierarchy',
    sub: 'A second structure over the same identities, built from a lookup of its own.',
    children: (
      <HierarchyForm
        mode="add"
        initial={{ name: '', description: '', lookupId: null }}
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          const id = nextId(hierarchies)
          const created = {
            id,
            name: d.name,
            description: d.description,
            lookupId: d.lookupId,
            bindings: d.lookupId ? defaultBindings(d.lookupId) : {},
            unassigned: true,
            updated: today(),
            overrides: emptyOverrides(),
          }
          setHierarchies((hs) => [...hs, created])
          setActiveId(id)
          setSelected('root')
          setOpen(new Set(['root']))
          setDrawer(null)
          toast(
            'ok',
            'Hierarchy created',
            d.lookupId ? `${d.name} is built and ready to read.` : `${d.name} has no source yet. Configure one to build the tree.`,
          )
        }}
      />
    ),
  })

  const openEditHierarchy = () => setDrawer({
    title: 'Edit hierarchy',
    sub: 'The name and description of this structure. Its levels are changed in Configure.',
    children: (
      <HierarchyForm
        mode="edit"
        initial={{ name: active.name, description: active.description || '', lookupId: active.lookupId }}
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          patchActive({ name: d.name, description: d.description })
          setDrawer(null)
          toast('ok', 'Hierarchy saved', d.name)
        }}
      />
    ),
  })

  const deleteHierarchy = () => confirm({
    title: `Delete ${active.name}?`,
    body: `The definition is removed along with ${num((active.overrides || emptyOverrides()).added.length)} units added by hand. Identities are not affected — they are scoped by their own attributes, and reappear in whichever hierarchy reads those attributes.`,
    confirmLabel: 'Delete hierarchy',
    onConfirm: () => {
      const rest = hierarchies.filter((h) => h.id !== active.id)
      setHierarchies(rest)
      setActiveId(rest[0].id)
      setSelected('root')
      toast('ok', 'Hierarchy deleted', active.name)
    },
  })

  const rebuild = () => {
    // The projection is recomputed from the lookup on every render, so a rebuild
    // is a reset of what the operator is looking at rather than a data change.
    setSelected('root')
    setOpen(new Set(['root']))
    setQ('')
    toast('ok', 'Hierarchy rebuilt', `${num(index.size)} units projected from ${lookup ? lookup.name : 'the configured lookup'}.`)
  }

  const exportStructure = () => toast(
    'ok',
    'Export queued',
    `${num(index.counts.root || 0)} identities queued for CSV export with their full unit path in ${active.name}.`,
  )

  const openPageMenu = (e) => setMenu({
    anchor: e.currentTarget,
    items: [
      { label: 'Hierarchies', header: true },
      ...hierarchies.map((h) => ({
        id: `h-${h.id}`,
        label: h.name,
        icon: h.id === active.id ? 'check' : 'hierarchy',
        onSelect: () => { setActiveId(h.id); setSelected('root'); setOpen(new Set(['root'])); setQ('') },
      })),
      { divider: true },
      { label: active.name, header: true },
      { id: 'cfg', label: 'Configure hierarchy', icon: 'sliders', onSelect: openSourceConfig },
      { id: 'edit', label: 'Edit hierarchy', icon: 'edit', onSelect: openEditHierarchy },
      { id: 'rebuild', label: 'Rebuild from source', icon: 'refresh', disabled: !configured, onSelect: rebuild },
      { id: 'export', label: 'Export structure', icon: 'download', disabled: !configured, onSelect: exportStructure },
      { divider: true },
      { id: 'add', label: 'Add hierarchy', icon: 'plus', onSelect: openAddHierarchy },
      {
        id: 'del',
        label: 'Delete hierarchy',
        icon: 'trash',
        danger: true,
        disabled: hierarchies.length < 2,
        onSelect: deleteHierarchy,
      },
    ],
  })

  // -------------------------------------------------------------------------
  // A single unit
  // -------------------------------------------------------------------------

  const addUnit = (target) => setDrawer({
    title: 'Add unit',
    sub: `A unit under ${target.name} that the lookup does not produce.`,
    children: (
      <NodeForm
        initial={{ name: '', kind: 'unit', status: 'Active' }}
        parentName={target.name}
        submitLabel="Add unit"
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          const ov = active.overrides || emptyOverrides()
          const id = nextManualId(ov.added)
          patchOverrides((o) => ({ ...o, added: [...o.added, { ...d, id, parentId: target.id }] }))
          setOpen((s) => new Set([...s, target.id]))
          setSelected(id)
          setDrawer(null)
          toast('ok', 'Unit added', `${d.name} sits under ${target.name}. It is kept across rebuilds while ${target.name} exists.`)
        }}
      />
    ),
  })

  const editUnit = (target) => setDrawer({
    title: 'Edit unit',
    sub: target.derived
      ? 'This unit comes from the lookup. The change is kept as an override on top of it.'
      : 'A unit added by hand.',
    children: (
      <NodeForm
        initial={{ name: target.name, kind: target.kind, status: target.status }}
        submitLabel="Save unit"
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          patchOverrides((o) => (target.derived
            ? { ...o, edits: { ...o.edits, [target.id]: d } }
            : { ...o, added: o.added.map((n) => (n.id === target.id ? { ...n, ...d } : n)) }))
          setDrawer(null)
          toast(
            'ok',
            'Unit saved',
            target.derived
              ? `${d.name} is renamed here only — the lookup value it came from is unchanged.`
              : d.name,
          )
        }}
      />
    ),
  })

  const deleteUnit = (target) => confirm({
    title: `Delete ${target.name}?`,
    body: target.derived
      ? `${target.name} comes from the lookup, so it is hidden here rather than deleted: the value stays in the lookup and the ${num(index.counts[target.id] || 0)} identities beneath it keep their attributes. Delete the value in Configurations to remove it everywhere.`
      : `${target.name} was added by hand and is removed along with anything added beneath it.`,
    confirmLabel: target.derived ? 'Hide unit' : 'Delete unit',
    onConfirm: () => {
      patchOverrides((o) => (target.derived
        ? { ...o, removed: [...o.removed, target.id] }
        : {
          ...o,
          added: o.added.filter((n) => n.id !== target.id && n.parentId !== target.id),
          edits: Object.fromEntries(Object.entries(o.edits).filter(([k]) => k !== target.id)),
        }))
      if (selected === target.id) setSelected(index.parents[target.id] || 'root')
      toast('ok', target.derived ? 'Unit hidden' : 'Unit deleted', target.name)
    },
  })

  return (
    <>
      <PageBar
        title="Organization Structure"
        sub={active.description || 'The organizational tree behind identity scoping, projected from a multi-level lookup.'}
        crumbs={[{ label: 'Users', to: 'users' }, { label: 'Organization Structure' }]}
        actions={
          <>
            <Button icon="sliders" onClick={openSourceConfig}>Configure hierarchy</Button>
            {/* The tracker calls for the page-level actions to sit behind the
                three dots at the top of the page: add, edit and delete belong
                to the hierarchy as a whole, not to whichever unit happens to
                be selected in the tree below. */}
            <IconButton icon="kebab" label="Hierarchy actions" onClick={openPageMenu} />
          </>
        }
        rail={
          <>
            <span className="chip" data-on="true"><Icon name="hierarchy" size={12} />{active.name}</span>
            {configured ? (
              <>
                <span className="chip"><Icon name="swap" size={12} />{lookup ? lookup.name : 'Unknown lookup'}</span>
                <span className="chip"><Icon name="sliders" size={12} />{boundLabels.length ? boundLabels.join(' → ') : 'No attribute bound'}</span>
                <span className="chip"><Icon name="layers" size={12} />{index.max + 1} levels deep</span>
                <span className="chip"><Icon name="group" size={12} />{num(index.size)} units</span>
                <span className="chip"><Icon name="users" size={12} />{num(index.counts.root || 0)} users</span>
              </>
            ) : (
              <span className="chip"><Icon name="warn" size={12} />No source configured</span>
            )}
          </>
        }
      />

      {!configured ? (
        <Card>
          <EmptyState
            icon="hierarchy"
            title="This hierarchy has no source"
            body={`${active.name} is not built from a multi-level lookup yet, so there are no levels to project identities into. Choose the lookup that names the levels and the attribute each level reads.`}
            actions={
              <>
                <Button variant="pri" icon="sliders" onClick={openSourceConfig}>Configure hierarchy</Button>
                <Button icon="swap" onClick={() => navigate('configurations')}>Open Configurations</Button>
              </>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-side">
          <Card
            flush
            title="Structure"
            sub="Select a unit to read it. Click a count to list the users beneath it."
            footer={
              <>
                <span>{needle ? 'Filtered view · every match is expanded' : `${open.size} of ${index.size} units expanded`}</span>
                <span className="spacer" />
                <span className="t-faint">{num(index.counts.root || 0)} users across the tree</span>
              </>
            }
          >
            <div className="wb-bar tree-bar">
              <div className="wb-search">
                <Icon name="search" size={14} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter units by name…"
                  aria-label="Filter units by name"
                />
                {q && <IconButton icon="x" size="sm" label="Clear filter" onClick={() => setQ('')} />}
              </div>
              <div className="spacer" />
              {/* A large tree is navigated by level, not by opening everything.
                  "Expand all" on forty units produces a wall nobody reads. */}
              <span className="hier-levels" role="group" aria-label="Expand to level">
                <span className="hier-levels-k">Level</span>
                <div className="seg">
                  {[1, 2, 3].map((l) => (
                    <button key={l} type="button" onClick={() => expandToLevel(l)}>{l}</button>
                  ))}
                  <button type="button" onClick={expandAll}>All</button>
                </div>
              </span>
              <Button size="sm" icon="minus" onClick={collapseAll}>Collapse</Button>
            </div>

            {/* Where the selected unit sits, from the tenant root down. Each step
                is a jump, so a deep unit can be walked back out without hunting
                for its parent in the tree. */}
            {!needle && path.length > 1 && (
              <nav className="hier-path" aria-label="Selected unit path">
                {lineage.map((id, i) => (
                  <span key={id} className="hier-path-step">
                    {i > 0 && <Icon name="chevR" size={11} />}
                    <button
                      type="button"
                      data-on={i === lineage.length - 1 || undefined}
                      onClick={() => revealNode(id)}
                    >
                      {index.byId[id].name}
                    </button>
                  </span>
                ))}
              </nav>
            )}

            {/* When filtering, the matches are a list to jump to rather than a
                shape to read — the tree below is already pruned to them. */}
            {needle && (
              <div className="hier-results">
                <span className="hier-results-k">
                  {matches.length} {matches.length === 1 ? 'unit matches' : 'units match'} “{q}”
                </span>
                <div className="hier-results-list">
                  {matches.slice(0, 8).map((m) => (
                    <button key={m.id} type="button" onClick={() => revealNode(m.id)}>
                      <Icon name={m.kind === 'organization' ? 'building' : 'group'} size={12} />
                      <span className="trunc">{m.name}</span>
                      <span className="hier-results-p trunc">{m.path}</span>
                    </button>
                  ))}
                  {matches.length > 8 && <span className="t-xs t-faint">and {matches.length - 8} more</span>}
                </div>
              </div>
            )}

            {visible ? (
              <div className="otree" role="tree" aria-label="Organization structure">
                <TreeNode
                  node={visible}
                  depth={0}
                  open={open}
                  forceOpen={!!needle}
                  selected={selected}
                  counts={index.counts}
                  total={index.counts.root || 0}
                  lineage={lineageSet}
                  onToggle={toggle}
                  onSelect={setSelected}
                  onUsers={openUsers}
                  onAdd={addUnit}
                  onEdit={editUnit}
                  onDelete={deleteUnit}
                  isRoot
                />
              </div>
            ) : (
              <div style={{ padding: 'var(--sp-4)' }}>
                <EmptyState
                  icon="hierarchy"
                  title="No units match"
                  body={`Nothing in the hierarchy matches “${q}”. Clear the filter to see the full tree.`}
                  actions={<Button icon="x" onClick={() => setQ('')}>Clear filter</Button>}
                />
              </div>
            )}
          </Card>

          <div className="stack">
            {/* What this tree is built from, stated on the page rather than only
                inside the drawer that changes it. A projected structure that
                does not name its source cannot be reasoned about. */}
            <Card
              flush
              title="Built from"
              sub="The source this tree is projected from"
              actions={<Button size="sm" icon="sliders" onClick={openSourceConfig}>Configure</Button>}
            >
              <div className="hier-cfg">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Multi-level lookup', v: lookup ? lookup.name : 'None', icon: 'swap' },
                    { k: 'Levels', v: lookup ? lookup.levels.join(' → ') : '—', icon: 'layers' },
                    {
                      k: 'Lookup attributes',
                      icon: 'sliders',
                      node: (
                        <span className="hier-bound">
                          {levels.map((l) => (
                            <Pill key={l.level} tone={l.attr ? 'acc' : 'warn'}>
                              {l.attr ? l.attr.label : `${l.level} unbound`}
                            </Pill>
                          ))}
                        </span>
                      ),
                    },
                    { k: 'Source last updated', v: lookup ? lookup.updated : '—', icon: 'clock' },
                    {
                      k: 'Changed by hand',
                      icon: 'edit',
                      v: report && report.total
                        ? `${report.added} added, ${report.renamed} renamed, ${report.hidden} hidden`
                        : 'Nothing — the tree is exactly what the lookup produces',
                    },
                  ]}
                />
              </div>
            </Card>

            {report && report.stranded > 0 && (
              <Banner tone="warn">
                {report.stranded} {report.stranded === 1 ? 'unit was' : 'units were'} added under a parent this source no
                longer produces, so {report.stranded === 1 ? 'it is' : 'they are'} not shown. They return if the parent does.
              </Banner>
            )}

            {node && (
              <Card
                title={node.name}
                sub={path.length > 1 ? path.slice(0, -1).join(' / ') : 'Tenant root'}
                actions={
                  <>
                    <IconButton icon="plus" size="sm" label={`Add a unit under ${node.name}`} onClick={() => addUnit(node)} />
                    <IconButton icon="edit" size="sm" label={`Edit ${node.name}`} onClick={() => editUnit(node)} />
                    {node.id !== 'root' && (
                      <IconButton icon="trash" size="sm" label={`Delete ${node.name}`} onClick={() => deleteUnit(node)} />
                    )}
                  </>
                }
              >
                <div className="stack">
                  <div className="stat-strip">
                    <div className="stat-cell" data-nav="true" role="button" tabIndex={0}
                      onClick={() => openUsers(node.id)}
                      onKeyDown={(e) => e.key === 'Enter' && openUsers(node.id)}
                    >
                      <span className="stat-k"><Icon name="users" size={11} />Users</span>
                      <span className="stat-v">{num(index.counts[node.id])}</span>
                      <span className="t-xs t-mut">Click to open the user list</span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-k"><Icon name="layers" size={11} />Child units</span>
                      <span className="stat-v">{num(node.children.length)}</span>
                    </div>
                  </div>

                  {node.status === 'Disabled' && (
                    <Banner tone="warn">
                      This unit is disabled. Identities beneath it cannot authenticate until it is re-enabled.
                    </Banner>
                  )}

                  <KeyValue
                    cols={1}
                    rows={[
                      { k: 'Level', v: node.levelLabel || 'Tenant root', icon: 'layers' },
                      {
                        k: 'Source',
                        icon: node.derived ? 'swap' : 'plus',
                        v: node.derived
                          ? `Projected from ${lookup ? lookup.name : 'the lookup'}`
                          : 'Added by hand on this screen',
                      },
                      { k: 'Type', v: kindLabel(node.kind), icon: node.kind === 'organization' ? 'building' : 'group' },
                      { k: 'Parent unit', v: parent ? parent.name : 'None (tenant root)', icon: 'hierarchy' },
                      { k: 'Status', node: <Pill tone={statusTone(node.status)} dot>{node.status}</Pill>, icon: 'power' },
                      { k: 'Users in this unit', v: num(node.members.length), icon: 'user' },
                      { k: 'Users incl. children', v: num(index.counts[node.id]), icon: 'users' },
                    ]}
                  />
                </div>
              </Card>
            )}

            {/* The unit's immediate relationships, as links. A tree tells you the
                shape; this tells you what sits directly above and below the thing
                you are reading, and lets you step to either. */}
            {node && (
              <Card flush title="Relationships" sub="What sits directly above and below this unit">
                <div className="hier-rel">
                  <div className="hier-rel-row" data-kind="parent">
                    <span className="hier-rel-k">Parent</span>
                    {parent ? (
                      <button type="button" onClick={() => revealNode(parent.id)}>
                        <Icon name={parent.kind === 'organization' ? 'building' : 'group'} size={13} />
                        <span className="trunc">{parent.name}</span>
                        <span className="hier-rel-n num">{num(index.counts[parent.id])}</span>
                      </button>
                    ) : <span className="hier-rel-none">None — this is the tenant root</span>}
                  </div>

                  <div className="hier-rel-row" data-kind="self">
                    <span className="hier-rel-k">This unit</span>
                    <span className="hier-rel-self">
                      <Icon name={node.kind === 'organization' ? 'building' : 'group'} size={13} />
                      <span className="trunc">{node.name}</span>
                      <span className="hier-rel-n num">{num(index.counts[node.id])}</span>
                    </span>
                  </div>

                  <div className="hier-rel-row" data-kind="children">
                    <span className="hier-rel-k">
                      {node.children.length} {node.children.length === 1 ? 'child unit' : 'child units'}
                    </span>
                    {node.children.length > 0 ? (
                      <div className="hier-rel-kids">
                        {node.children.map((c) => (
                          <button key={c.id} type="button" onClick={() => revealNode(c.id)}>
                            <Icon name={c.kind === 'organization' ? 'building' : 'group'} size={12} />
                            <span className="trunc">{c.name}</span>
                            <span className="hier-rel-n num">{num(index.counts[c.id])}</span>
                          </button>
                        ))}
                      </div>
                    ) : <span className="hier-rel-none">A leaf — identities here roll up no further</span>}
                  </div>
                </div>
              </Card>
            )}

            <Card flush title="Open from here">
              <div className="hier-cfg-links">
                <button type="button" onClick={() => openUsers(node ? node.id : 'root')}>
                  <span className="feed-ic" data-tone="acc"><Icon name="users" size={14} /></span>
                  <span><b>View users</b><span>{num(nodeUsers.length)} identities beneath this unit.</span></span>
                  <Icon name="chevR" size={13} />
                </button>
                <button type="button" onClick={() => navigate('configurations')}>
                  <span className="feed-ic"><Icon name="swap" size={14} /></span>
                  <span><b>Configurations</b><span>Define the multi-level lookup and the attributes this tree reads.</span></span>
                  <Icon name="chevR" size={13} />
                </button>
                <button type="button" onClick={() => navigate('organizations')}>
                  <span className="feed-ic"><Icon name="building" size={14} /></span>
                  <span><b>Organizations</b><span>The register of legal entities, kept separately from this structure.</span></span>
                  <Icon name="chevR" size={13} />
                </button>
                <button type="button" onClick={() => navigate('users')}>
                  <span className="feed-ic"><Icon name="user" size={14} /></span>
                  <span><b>Users</b><span>Move an identity between units by changing the attribute it is scoped on.</span></span>
                  <Icon name="chevR" size={13} />
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
