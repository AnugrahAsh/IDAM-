import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Menu from '../../components/primitives/Menu'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { BASE, isOrphan, plural, policyPath } from './signOnPolicyData'
import { policyByKey, usePolicies } from './signOnPolicyStore'
import { usePolicyActions } from './usePolicyActions'
import { deniedTitle, usePolicyAccess } from './signOnPolicyAccess'
import { PolicyNotFound } from './Fallbacks'
import InformationTab from './InformationTab'
import RulesTab from './RulesTab'
import ApplicationsTab from './ApplicationsTab'

const TABS = ['information', 'rules', 'applications']

/**
 * One policy's record. Each tab has its own address, so a link — or the rule
 * builder handing back — can open the Rules tab directly.
 */
export default function PolicyView({ id, tab }) {
  const policy = policyByKey(usePolicies(), id)
  if (!policy) return <PolicyNotFound id={id} />
  return <PolicyRecord key={policy.id} policy={policy} tab={TABS.includes(tab) ? tab : 'information'} />
}

function PolicyRecord({ policy, tab }) {
  const { navigate } = useApp()
  const access = usePolicyAccess()
  const { changeStatus, removePolicies } = usePolicyActions()
  const [menu, setMenu] = useState(null)
  const active = policy.status === 'Active'
  const go = (t) => navigate(t === 'information' ? policyPath(policy.id) : policyPath(policy.id, t))

  const openMenu = (e) => setMenu({
    anchor: e.currentTarget,
    items: [
      { label: policy.name, header: true },
      {
        id: 'rule', label: 'Add rule', icon: 'plus',
        disabled: !access.addRule, title: access.addRule ? undefined : deniedTitle('addRule'),
        onSelect: () => navigate(policyPath(policy.id, 'rules/add')),
      },
      { divider: true },
      {
        id: 'del', label: 'Delete policy', icon: 'trash', danger: true,
        disabled: !access.remove, title: access.remove ? undefined : deniedTitle('remove'),
        onSelect: () => removePolicies([policy]),
      },
    ],
  })

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Sign-On Policies"
        eyebrow="Sign-on policy"
        title={policy.name}
        sub={policy.description || undefined}
        media={(
          <span className="feed-ic" data-tone={active ? 'acc' : 'mut'} style={{ width: 52, height: 52 }}>
            <Icon name="signon" size={24} />
          </span>
        )}
        badges={(
          <>
            <Pill tone={statusTone(policy.status)} dot>{policy.status}</Pill>
            {isOrphan(policy) && <Pill tone="warn" icon="warn">No applications attached</Pill>}
          </>
        )}
        meta={(
          <>
            <Fact icon="layers" label="Rules" value={num(policy.rules.length)} />
            <Fact icon="apps" label="Applications" value={num(policy.applications.length)} />
            <Fact icon="user" label="Created by" value={policy.createdBy} />
            <Fact icon="history" label="Last modified" value={policy.modifiedOn || 'Never'} />
          </>
        )}
        actions={(
          <>
            {access.status && (
              <Button icon={active ? 'ban' : 'checkC'} onClick={() => changeStatus([policy], active ? 'Inactive' : 'Active')}>
                {active ? 'Deactivate' : 'Activate'}
              </Button>
            )}
            {access.edit && (
              <Button variant="pri" icon="edit" onClick={() => navigate(policyPath(policy.id, 'edit'))}>Edit policy</Button>
            )}
            <Button icon="kebab" aria-label="More actions" onClick={openMenu} />
          </>
        )}
        tabs={(
          <Tabs
            value={tab}
            onChange={go}
            tabs={[
              { id: 'information', label: 'Policy information', icon: 'info' },
              { id: 'rules', label: 'Rules', icon: 'layers', count: policy.rules.length },
              { id: 'applications', label: 'Applications', icon: 'apps', count: policy.applications.length },
            ]}
          />
        )}
      />

      <div className="detail-body">
        <div className="stack">
          <StateBanners
            policy={policy}
            tab={tab}
            access={access}
            onActivate={() => changeStatus([policy], 'Active')}
            onAttach={() => go('applications')}
            onAddRule={() => navigate(policyPath(policy.id, 'rules/add'))}
          />
          {tab === 'information' && <InformationTab policy={policy} />}
          {tab === 'rules' && <RulesTab policy={policy} />}
          {tab === 'applications' && <ApplicationsTab policy={policy} />}
        </div>
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}

/* The states in which a policy looks configured but decides nothing at
   sign-in. Each banner says why, and offers the step that ends it. */
function StateBanners({ policy, tab, access, onActivate, onAttach, onAddRule }) {
  const rules = policy.rules.length
  const apps = policy.applications.length
  return (
    <>
      {policy.status !== 'Active' && (
        <Banner tone="info">
          This policy is inactive: its rules are kept but not evaluated.{' '}
          {access.status && <button type="button" className="link" onClick={onActivate}>Activate it</button>}
        </Banner>
      )}
      {isOrphan(policy) && tab !== 'applications' && (
        <Banner tone="warn">
          {plural(rules, 'rule is', 'rules are')} configured, but no application is attached, so{' '}
          {rules === 1 ? 'it never runs' : 'they never run'}.{' '}
          <button type="button" className="link" onClick={onAttach}>Attach applications</button>
        </Banner>
      )}
      {rules === 0 && apps > 0 && tab !== 'rules' && (
        <Banner tone="info">
          {plural(apps, 'application is', 'applications are')} attached, but the policy has no rules, so it decides
          nothing at sign-in.{' '}
          {access.addRule && <button type="button" className="link" onClick={onAddRule}>Add a rule</button>}
        </Banner>
      )}
    </>
  )
}
