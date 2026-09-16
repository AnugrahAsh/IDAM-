import { useMemo } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { USERS } from '../../data/seed'
import { conditionOf, expressionOf, matchesFor } from './rulesData'

// ---------------------------------------------------------------------------
// Provisioning rules across every directory — a read-only audit view.
//
// Rules are authored inside the directory they belong to, where the target OU
// can be offered from that directory's own tree and the condition from its own
// attribute mappings. What remains worth having in one place is the estate-wide
// answer: where is everything being routed, and is anything routing nowhere.
// Editing here would mean asking which directory again, which is the question
// the move was made to remove.
// ---------------------------------------------------------------------------

export default function LdapRules({ apps, rules }) {
  const { navigate } = useApp()

  const byId = useMemo(() => Object.fromEntries(apps.map((a) => [String(a.id), a])), [apps])

  const rows = useMemo(() => rules.map((r) => {
    const app = byId[String(r.applicationId)]
    return {
      ...r,
      application: app ? app.displayName : r.application,
      baseDn: app ? app.baseDn : '',
      // A DN outside its directory's tree never provisions anything. It could
      // not be saved from the directory tab, but a rule written before the
      // move can still carry one, so the audit view is where it surfaces.
      stray: !!(app && r.ouDn && !String(r.ouDn).toLowerCase().endsWith(String(app.baseDn).toLowerCase())),
      orphan: !app,
      expression: expressionOf(conditionOf(r)),
      matched: matchesFor(conditionOf(r)).length,
    }
  }), [rules, byId])

  const stray = rows.filter((r) => r.stray || r.orphan)
  const dead = rows.filter((r) => !r.matched)
  const totalMatched = rows.reduce((a, r) => a + r.matched, 0)

  const open = (r) => navigate(`/iam/ldapapplications/${r.applicationId}/provisioning`)

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Rule', locked: true, cls: 'td-main td-wide', width: 220,
      value: (r) => `${r.name} ${r.application} ${r.ouDn}`,
      render: (r) => (
        <span className="cell-stack">
          <span className="mono trunc">{r.name}</span>
          <span className="cell-sub trunc">{r.application}</span>
        </span>
      ),
    },
    {
      key: 'ouDn', label: 'Organizational unit', cls: 'td-mono td-flex',
      render: (r) => (
        <span className="cell-id">
          {(r.stray || r.orphan) && <Icon name="warn" size={12} style={{ color: 'var(--bad)', flex: 'none' }} />}
          <span className="trunc" title={r.ouDn}>{r.ouDn}</span>
        </span>
      ),
    },
    {
      key: 'expression', label: 'Condition', cls: 'td-flex',
      render: (r) => <code className="mono trunc rule-code">{r.expression}</code>,
    },
    {
      key: 'matched', label: 'Matches', align: 'right', width: 104,
      render: (r) => (r.matched ? num(r.matched) : <Pill tone="warn">0</Pill>),
    },
    { key: 'createdOn', label: 'Created on', cls: 'td-mono', width: 132 },
  ]

  const rowActions = (r) => [
    { id: 'open', label: `Open in ${r.application}`, icon: 'external', disabled: r.orphan, onSelect: () => open(r) },
  ]

  return (
    <div className="stack">
      <Banner tone="info">
        Rules are authored inside the directory they write into, where the organizational unit is offered from that
        directory&apos;s tree and the condition from its attribute mappings. This view is read-only and spans the whole
        estate. Open a rule to edit it on its own directory.
      </Banner>

      <StatCards
        label="Provisioning rule summary"
        items={[
          {
            key: 'rules',
            icon: 'policy',
            label: 'Provisioning rules',
            value: rules.length,
            chip: `${new Set(rules.map((r) => String(r.applicationId))).size} directories`,
            sub: 'routing identities into OUs',
          },
          {
            key: 'matched',
            icon: 'users',
            label: 'Identities routed',
            value: totalMatched,
            chip: 'matched now',
            chipTone: 'ok',
            sub: `of ${num(USERS.length)} in the identity store`,
          },
          {
            key: 'dead',
            icon: 'warn',
            label: 'Rules matching nothing',
            value: dead.length,
            chip: dead.length ? 'check the condition' : 'all matching',
            chipTone: dead.length ? 'warn' : undefined,
            sub: 'no identity satisfies them',
          },
          {
            key: 'stray',
            icon: 'ban',
            label: 'Targets outside their tree',
            value: stray.length,
            chip: stray.length ? 'never provisions' : 'all in scope',
            chipTone: stray.length ? 'bad' : undefined,
            sub: 'DN does not sit under the base DN',
          },
        ]}
      />

      {stray.length > 0 && (
        <Banner tone="bad">
          <b>{stray.length} rule{stray.length === 1 ? '' : 's'} target a DN outside the directory tree</b> and will never
          provision anything: {stray.map((r) => r.name).join(', ')}. Open each on its directory and choose an
          organizational unit under that directory&apos;s base DN.
        </Banner>
      )}

      <DataWorkbench
        id="ldap-rules-audit"
        rows={rows}
        columns={columns}
        rowActions={rowActions}
        onRowClick={(r) => (r.orphan ? null : open(r))}
        searchPlaceholder="Search by rule, directory, organizational unit or condition…"
        toolbar={(
          <Button size="sm" icon="directory" onClick={() => navigate('/iam/ldapapplications')}>
            Directories
          </Button>
        )}
        emptyTitle="No provisioning rule matches"
        emptyBody="A rule decides which identities are written into which organizational unit. Rules are added from a directory's Provisioning rules tab."
        emptyIcon="policy"
        footNote="Read-only. Open a rule to edit it on its own directory."
      />
    </div>
  )
}
