import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Menu from '../../components/primitives/Menu'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonKeyValue, SkeletonTable,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
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

/* The tab row a record masthead lands with. `SkeletonDetailHeader` stops at the
   facts, and a header that will carry tabs is a row taller than one that will
   not — enough to move the body under it when the policy arrives. */
function SkeletonTabRow({ count = 3 }) {
  return (
    <div className="tabs sop-skel-tabs" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span className="tab" key={i}>
          <span className="skel" style={{ width: 82 + (i % 3) * 24, height: 'calc(var(--t-body) * var(--t-body-lh))' }} />
        </span>
      ))}
    </div>
  )
}

/* What each tab lands as, so the body is the height it will be rather than the
   height of whichever tab was drawn for all three. Information is two columns
   of read-only facts; Rules is the priority ladder; Applications is the
   attachment register. */
function BodySkeleton({ tab, policy }) {
  if (tab === 'rules') {
    /* The ladder's card is `flush` — the table runs to the card's own edge, and
       `.skel-row` already carries the gutter `.tbl td` does — so the waiting
       card gives up its body padding through the class in the page stylesheet.
       It also carries a footer whenever the policy holds more than one rule,
       which is another row of height the panel would gain on arrival.

       The rule count is not a guess: the policy is in hand before the settle
       starts. A policy with no rules lands as an `EmptyState` instead of a
       table, which is about four rows tall. */
    const rules = policy.rules.length
    return (
      <SkeletonCard className="sop-skel-flush" foot={rules > 1}>
        <SkeletonTable rows={rules || 4} cols={8} />
      </SkeletonCard>
    )
  }
  if (tab === 'applications') {
    return <SkeletonCard><SkeletonTable rows={4} cols={4} /></SkeletonCard>
  }
  return (
    <div className="detail-cols">
      <div className="stack">
        <SkeletonCard><SkeletonKeyValue rows={6} cols={2} /></SkeletonCard>
        <SkeletonCard lines={5} />
      </div>
      <div className="stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    </div>
  )
}

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
  /* The record settles as one thing, keyed on which policy is being read:
     moving between two policies is the round trip a deployment would make. The
     tab is not part of the key — all three panels are built from the policy
     already in hand, so switching between them fetches nothing. */
  const loading = useLoading(policy.id)
  const active = policy.status === 'Active'
  const go = (t) => navigate(t === 'information' ? policyPath(policy.id) : policyPath(policy.id, t))

  if (loading) {
    return (
      <Skeleton label="Loading the sign-on policy">
        <SkeletonDetailHeader facts={4} actions={3} />
        <SkeletonTabRow count={3} />
        <div className="detail-body">
          <div className="stack">
            <BodySkeleton tab={tab} policy={policy} />
          </div>
        </div>
      </Skeleton>
    )
  }

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
