import './HierarchyPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import KeyValue from '../../components/primitives/KeyValue'
import EmptyState from '../../components/primitives/EmptyState'
import Banner from '../../components/primitives/Banner'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { useLoading } from '../../lib/useLoading'
import { ORGANIZATIONS, USERS } from '../../data/seed'
import UnitUsersPanel from './UnitUsersPanel'
import HierarchySkeleton from './HierarchySkeleton'
import TreeNode from './TreeNode'
import { MULTI_LOOKUPS, MULTI_ROWS } from '../configurations/configData'

const kindLabel = (kind) => (kind === 'organization' ? 'Organization' : 'Department')

// ---------------------------------------------------------------------------

// Tree construction — organizations from seed data, departments derived from

// the identities that actually sit in each organization.

// ---------------------------------------------------------------------------

const unitsFor = (org) => {
  const pool = USERS.filter((u) => u.organization === org.name)
  const departments = [...new Set(pool.map((u) => u.department))].sort()
  return departments.map((name, i) => ({
    id: `unit-${org.id}-${i}`,
    name,
    kind: 'unit',
    status: org.status,
    members: pool.filter((u) => u.department === name),
    children: [],
  }))
}

const buildTree = () => {
  const root = ORGANIZATIONS.find((o) => !o.parent) || ORGANIZATIONS[0]
  const orgNode = (org, children = []) => ({
    id: `org-${org.id}`,
    name: org.name,
    kind: 'organization',
    status: org.status,
    members: [],
    children: [...children, ...unitsFor(org)],
  })
  const subs = ORGANIZATIONS.filter((o) => o.id !== root.id).map((o) => orgNode(o))
  return orgNode(root, subs)
}

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

// ---------------------------------------------------------------------------

// Forms shown in the shared modal

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

// Page

// ---------------------------------------------------------------------------

export default function HierarchyPage() {
  const { navigate, toast, setDrawer } = useApp()
  const [tree, setTree] = useState(buildTree)
  const [selected, setSelected] = useState(() => `org-${(ORGANIZATIONS.find((o) => !o.parent) || ORGANIZATIONS[0]).id}`)
  const [q, setQ] = useState('')
  /* One flag for the screen: the masthead, the tree and the unit record beside
     it settle together. Selecting a unit does not settle again — the tree is
     already on screen and reading a node out of it is not a round trip — but
     rebuilding from a different hierarchy source is, so the source the tree is
     projected from is what the wait is keyed on. */
  const [rebuild, setRebuild] = useState(0)
  /**
   * The tree is built from a chained lookup, not invented here: which lookup,
   * and whether the levels are read as specific codes or as office levels,
   * decides the shape of every unit below the tenant root. Without this the
   * hierarchy could be edited but never rebuilt from the schema it comes from.
   */
  /* The attribute the tree is bound to. It defaults to the deepest level of
     the chosen chain, which is the one a unit is actually scoped on. */
  const [source, setSource] = useState({
    hierarchy: MULTI_LOOKUPS[0].name,
    type: 'Specific code',
    attribute: MULTI_LOOKUPS[0].levels[MULTI_LOOKUPS[0].levels.length - 1],
  })
  const loading = useLoading(rebuild)

  const index = useMemo(() => {
    const byId = {}
    const parents = {}
    const counts = {}
    let max = 0
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

  const [open, setOpen] = useState(() => {
    const t = buildTree()
    return new Set([t.id, ...t.children.filter((c) => c.kind === 'organization').map((c) => c.id)])
  })

  const needle = q.trim().toLowerCase()
  const visible = useMemo(() => (needle ? filterTree(tree, needle) : tree), [tree, needle])

  /* Flat list of matches with the path each one sits on, so a filtered result
     says where it is rather than only that it exists. */
  const matches = useMemo(() => {
    if (!needle) return []
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
  const parent = index.parents[node.id] ? index.byId[index.parents[node.id]] : null
  const nodeUsers = useMemo(() => collectUsers(node), [node])

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
    const out = []
    let cur = node.id
    while (cur && index.byId[cur]) {
      out.unshift(index.byId[cur].name)
      cur = index.parents[cur]
    }
    return out
  }, [node.id, index])

  const orgCount = useMemo(() => {
    let n = 0
    walk(tree, (x) => { if (x.kind === 'organization') n += 1 })
    return n
  }, [tree])

  const toggle = (id) => setOpen((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const expandAll = () => setOpen(new Set(Object.keys(index.byId)))
  const collapseAll = () => setOpen(new Set([tree.id]))

  /**
   * Open the tree to a given depth.
   *
   * "Expand all" on a tenant with forty units produces a wall nobody reads.
   * Opening to a level is how a large structure is actually navigated — see
   * every organization, then every unit under one of them.
   */
  const expandToLevel = (level) => {
    const next = new Set()
    walk(tree, (n, d) => { if (d < level) next.add(n.id) })
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

  /* The tree is a projection of the hierarchy lookup, not a register of its
     own, so it is read-only here: units are created and renamed where the
     lookup is defined (Configurations) and organizations are managed on their
     own screen. Editing the projection let the two drift apart, and put a
     delete control on every row of a navigation tree. */

  /* How many complete paths the chain resolves to. The rows are authored per
     lookup where they exist; where they do not, the count is unknown rather
     than zero, and the panel says so. */
  const combinationsOf = (chain) => {
    const rows = MULTI_ROWS[chain.id]
    return rows ? `${num(rows.length)} paths` : 'Not enumerated'
  }

  const openSourceConfig = () => {
    const ref = { current: { ...source } }
    const render = () => {
      const chain = MULTI_LOOKUPS.find((m) => m.name === ref.current.hierarchy)
      setDrawer({
        title: 'Hierarchy source',
        sub: 'Which chained lookup the tree is built from, and how its levels are read.',
        children: (
          <div className="stack">
            <Field
              label="Hierarchy"
              required
              hint="A multi-level lookup defined in Configurations. Its levels become the depth of the tree."
              htmlFor="hs-chain"
            >
              <Select
                id="hs-chain"
                value={ref.current.hierarchy}
                options={MULTI_LOOKUPS.map((m) => ({ value: m.name, label: `${m.name} · ${m.levels.join(' → ')}` }))}
                onChange={(e) => {
                  const next = MULTI_LOOKUPS.find((m) => m.name === e.target.value)
                  ref.current = {
                    ...ref.current,
                    hierarchy: e.target.value,
                    attribute: next ? next.levels[next.levels.length - 1] : '',
                  }
                  render()
                }}
              />
            </Field>
            <div className="grid grid-2">
              <Field
                label="Type"
                required
                hint={ref.current.type === 'Specific code'
                  ? 'Each unit is a distinct code from the lookup — one node per value.'
                  : 'Units are grouped by office level, so every code at the same level shares a node.'}
                htmlFor="hs-type"
              >
                <Select
                  id="hs-type"
                  value={ref.current.type}
                  options={['Specific code', 'Office level']}
                  onChange={(e) => { ref.current = { ...ref.current, type: e.target.value }; render() }}
                />
              </Field>
              {/* Only Specific code has an attribute to choose. Office level
                  is read from the office level by definition — offering a
                  picker there asked which attribute the grouping-by-office-
                  level reads, which has one answer and is not a question. */}
              {ref.current.type === 'Specific code' && (
                <Field
                  label="Attribute"
                  required
                  hint="Which of the chain's levels a unit is matched on when an identity is scoped."
                  htmlFor="hs-attr"
                >
                  <Select
                    id="hs-attr"
                    value={ref.current.attribute}
                    options={chain ? chain.levels : []}
                    onChange={(e) => { ref.current = { ...ref.current, attribute: e.target.value }; render() }}
                  />
                </Field>
              )}
            </div>
            {chain && (
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Levels', v: chain.levels.join(' → '), icon: 'layers' },
                  { k: 'Depth', v: `${chain.levels.length} levels below the tenant root`, icon: 'hierarchy' },
                  {
                    k: 'Bound attribute',
                    v: ref.current.type === 'Specific code' ? ref.current.attribute : 'office_level · fixed by the type',
                    icon: 'sliders',
                  },
                  { k: 'Combinations', v: combinationsOf(chain), icon: 'swap' },
                  { k: 'Last updated', v: chain.updated, icon: 'history' },
                ]}
              />
            )}
            <Banner tone="warn">
              Changing the source rebuilds the tree from the lookup. Units created by hand are kept only where a lookup
              value still matches them; identities are re-scoped at the next evaluation.
            </Banner>
          </div>
        ),
        footer: (
          <>
            <Button onClick={() => setDrawer(null)}>Cancel</Button>
            <Button
              variant="pri"
              icon="refresh"
              onClick={() => {
                const next = ref.current
                setSource(next)
                setTree(buildTree())
                /* A rebuild is the one thing on this screen a real deployment
                   would go back for: the tree is re-projected from a different
                   lookup, so the page settles again rather than swapping one
                   structure for another under the reader. */
                setRebuild((n) => n + 1)
                setDrawer(null)
                toast('ok', 'Hierarchy rebuilt', next.type === 'Specific code'
                  ? `The tree is now built from ${next.hierarchy}, read as specific code on ${next.attribute}.`
                  : `The tree is now built from ${next.hierarchy}, grouped by office level.`)
              }}
            >
              Rebuild hierarchy
            </Button>
          </>
        ),
      })
    }
    render()
  }

  /**
   * The configuration and context area.
   *
   * Where the shape of the tree is decided, and where the screens that own it
   * are reached from. Collected in one panel because none of it is part of
   * reading the tree — it is what you open when the tree is wrong.
   */
  const openConfiguration = () => setDrawer({
    title: 'Configure structure',
    sub: 'Where this tree comes from, and the screens that change it.',
    size: 'md',
    children: (
      <div className="stack">
        <Card flush title="Source" sub="The lookup this tree is projected from">
          <div className="hier-cfg">
            <KeyValue
              cols={1}
              rows={[
                { k: 'Hierarchy lookup', v: source.hierarchy, icon: 'swap' },
                { k: 'Read as', v: source.type, icon: 'layers' },
                { k: 'Units projected', v: num(index.size), icon: 'hierarchy' },
                { k: 'Levels deep', v: index.max + 1, icon: 'layers' },
              ]}
            />
            <Button
              variant="pri"
              icon="sliders"
              onClick={() => { setDrawer(null); openSourceConfig() }}
              style={{ marginTop: 12 }}
            >
              Change hierarchy source
            </Button>
          </div>
        </Card>

        <Card flush title="Manage" sub="This tree is read-only — these are the screens that write it">
          <div className="hier-cfg-links">
            <button type="button" onClick={() => { setDrawer(null); navigate('organizations') }}>
              <span className="feed-ic" data-tone="acc"><Icon name="building" size={14} /></span>
              <span><b>Organizations</b><span>Create, rename and disable the organizations that form the top levels.</span></span>
              <Icon name="chevR" size={13} />
            </button>
            <button type="button" onClick={() => { setDrawer(null); navigate('configurations') }}>
              <span className="feed-ic"><Icon name="swap" size={14} /></span>
              <span><b>Configurations</b><span>Define the chained lookup whose levels become the depth of this tree.</span></span>
              <Icon name="chevR" size={13} />
            </button>
            <button type="button" onClick={() => { setDrawer(null); navigate('users') }}>
              <span className="feed-ic"><Icon name="user" size={14} /></span>
              <span><b>Users</b><span>Move an identity between units by changing the attribute it is scoped on.</span></span>
              <Icon name="chevR" size={13} />
            </button>
          </div>
        </Card>

        <Card flush title="Export">
          <div className="hier-cfg">
            <p className="t-sm t-mut" style={{ margin: '0 0 12px' }}>
              Every identity with the full unit path it rolls up to, as CSV.
            </p>
            <Button
              icon="download"
              onClick={() => {
                setDrawer(null)
                toast('ok', 'Export queued', `${num(index.counts[tree.id])} identities queued for CSV export with their unit path.`)
              }}
            >
              Export structure
            </Button>
          </div>
        </Card>
      </div>
    ),
    footer: <Button onClick={() => setDrawer(null)}>Close</Button>,
  })

  if (loading) return <HierarchySkeleton />

  return (
    <>
      <PageBar
        title="Organization Structure"
        sub="The organizational tree behind identity scoping. Each unit shows the users assigned beneath it."
        crumbs={[{ label: 'Users', to: 'users' }, { label: 'Organization Structure' }]}
        actions={
          /* Everything that changes or leaves this screen lives behind one
             control. The tree itself is for reading, and three management
             buttons on a read-only screen invited edits to a projection. */
          <Button variant="pri" icon="sliders" onClick={openConfiguration}>Configure</Button>
        }
        /* These are readings, not filters. They were `.chip`s — the pill the
           registers use for a clickable facet, complete with pointer cursor,
           hover state and an accent "selected" chip at the head of the row — so
           the row invited a click it had nothing to do with. They are stated
           now, in the same icon-label-value idiom the detail headers use. */
        rail={
          <dl className="hy-stats">
            <div><dt><Icon name="hierarchy" size={12} />Units</dt><dd className="num">{num(index.size)}</dd></div>
            <div><dt><Icon name="building" size={12} />Organizations</dt><dd className="num">{num(orgCount)}</dd></div>
            <div><dt><Icon name="layers" size={12} />Depth</dt><dd className="num">{index.max + 1} levels</dd></div>
            <div><dt><Icon name="users" size={12} />Users</dt><dd className="num">{num(index.counts[tree.id])}</dd></div>
            <div><dt><Icon name="swap" size={12} />Built from</dt><dd title={`${source.hierarchy} · ${source.type}`}>{source.hierarchy} · {source.type}</dd></div>
          </dl>
        }
      />

      <div className="grid grid-side">
        <Card
          flush
          title="Structure"
          sub="Select a unit to read it. Click a count to list the users beneath it."
          footer={
            <>
              <span>{needle ? 'Filtered view · every match is expanded' : `${open.size} of ${index.size} units expanded`}</span>
              <span className="spacer" />
              <span className="t-faint">{num(index.counts[tree.id])} users across the tree</span>
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
                total={index.counts[tree.id]}
                lineage={lineageSet}
                onToggle={toggle}
                onSelect={setSelected}
                onUsers={openUsers}
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
          <Card
            title={node.name}
            sub={path.length > 1 ? path.slice(0, -1).join(' / ') : 'Tenant root'}
            actions={<Pill tone={node.kind === 'organization' ? 'acc' : 'mut'} icon={node.kind === 'organization' ? 'building' : 'group'}>
              {kindLabel(node.kind)}
            </Pill>}
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
                  { k: 'Type', v: kindLabel(node.kind), icon: node.kind === 'organization' ? 'building' : 'group' },
                  { k: 'Parent unit', v: parent ? parent.name : 'None (tenant root)', icon: 'hierarchy' },
                  { k: 'Status', node: <Pill tone={statusTone(node.status)} dot>{node.status}</Pill>, icon: 'power' },
                  { k: 'Users in this unit', v: num(node.members.length), icon: 'user' },
                  { k: 'Users incl. children', v: num(index.counts[node.id]), icon: 'users' },
                ]}
              />
            </div>
          </Card>

          {/* The unit's immediate relationships, as links. A tree tells you the
              shape; this tells you what sits directly above and below the thing
              you are reading, and lets you step to either. */}
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

          <Card flush title="Open from here">
            <div className="hier-cfg-links">
              <button type="button" onClick={() => openUsers(node.id)}>
                <span className="feed-ic" data-tone="acc"><Icon name="users" size={14} /></span>
                <span><b>View users</b><span>{num(index.counts[node.id])} identities beneath this unit.</span></span>
                <Icon name="chevR" size={13} />
              </button>
              <button type="button" onClick={() => navigate('users')}>
                <span className="feed-ic"><Icon name="user" size={14} /></span>
                <span><b>Open in Users</b><span>The identity register, filtered to this scope.</span></span>
                <Icon name="chevR" size={13} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
