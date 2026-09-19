import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import GroupDetail from '../groups/GroupDetail'
import { BASE_PATH, KIND_META, PROTOCOL_ICON, PROTOCOL_TONE, appTargetOf, ssoTargetOf } from '../groups/groupsData'
import { useMemo } from 'react'
import { ACTIVITY_CTX, DETAIL_SEED, markFor, targetFor } from './groupsPageData'

export default function GroupRecord({ group, peers, tab, onTab, onPatch, onDelete }) {
  const { toast } = useApp()
  const meta = KIND_META[group.kind]
  const target = useMemo(() => targetFor(group), [group])
  const ssoApp = group.kind === 'SSO' ? ssoTargetOf(group.application) : null
  const provApp = group.kind === 'Application' ? appTargetOf(group.application) : null

  return (
    <GroupDetail
      group={group}
      peers={peers}
      basePath={BASE_PATH}
      backLabel="Groups"
      eyebrow={`Groups · ${meta.label}`}
      kindNoun="group"
      wbId={`group-${group.kind.toLowerCase()}`}
      tab={tab}
      onTab={onTab}
      onPatch={onPatch}
      onDelete={onDelete}
      seed={DETAIL_SEED[group.kind]}
      media={markFor(group)}
      badges={
        <>
          <Pill tone={meta.tone} icon={meta.icon}>{group.kind}</Pill>
          {ssoApp && <Pill tone={PROTOCOL_TONE[group.protocol]} icon={PROTOCOL_ICON[group.protocol]}>{group.protocol}</Pill>}
          <Pill tone={group.members === 0 ? 'warn' : 'ok'} dot>{num(group.members)} members</Pill>
          {group.privileged && <Pill tone="warn" icon="key">Privileged</Pill>}
          {group.external && <Pill tone="warn" icon="globe">External</Pill>}
          <Tag>S.No {group.sno}</Tag>
        </>
      }
      facts={[
        { icon: meta.icon, label: meta.appLabel, value: group.application },
        ...(ssoApp ? [{ icon: 'code', label: 'Claim', value: `${group.claim}=${group.name}` }] : []),
        { icon: 'user', label: 'Owner', value: group.owner },
        { icon: 'history', label: 'Created', value: group.createdOn },
        { icon: 'certify', label: 'Reviewed', value: group.reviewedOn },
      ]}
      extraActions={
        group.kind === 'SSO' ? (
          <Button icon="play" onClick={() => toast('ok', 'Claim asserted', `${group.protocol} test assertion for ${group.application} carried ${group.claim}=${group.name}.`)}>
            Test claim
          </Button>
        ) : null
      }
      notices={
        <>
          {group.external && (
            <Banner tone="warn">
              External federation group. Membership is limited to partner and contract identities and expires ninety
              days after the last successful sign-in.
            </Banner>
          )}
          {group.members === 0 && (
            <Banner tone="info">
              Provisioned but unused. Empty groups are excluded from certification campaigns until the first member
              is assigned.
            </Banner>
          )}
          {provApp && provApp.status !== 'Healthy' && (
            <Banner tone={provApp.status === 'Failed' ? 'bad' : 'warn'}>
              The {provApp.displayName} connector is {provApp.status.toLowerCase()} and last synchronized {provApp.lastSync}.
              Membership changes made here will queue until the connector recovers.
            </Banner>
          )}
          {ssoApp && !ssoApp.enabled && (
            <Banner tone="bad">
              {ssoApp.displayName} is disabled. The claim is stored but nothing is asserted until the federated
              connection is re-enabled.
            </Banner>
          )}
        </>
      }
      infoRows={[
        { k: 'Description', v: group.description, icon: 'file' },
        { k: 'Group kind', v: meta.label, icon: meta.icon },
        { k: meta.appLabel, v: group.application, icon: 'provision' },
        ...(ssoApp ? [
          { k: 'Asserted claim', v: `${group.claim}=${group.name}`, icon: 'code' },
          { k: 'Client identifier', v: group.clientId, icon: 'key' },
        ] : []),
        ...(group.ldapApplication ? [
          { k: 'LDAP directory', v: group.ldapApplication, icon: 'directory' },
          { k: 'Organizational unit', v: <span className="mono t-xs">{group.ldapOu}</span>, icon: 'branch' },
        ] : []),
        { k: 'Accountable owner', v: group.owner, icon: 'user' },
        {
          k: 'Primary group',
          v: group.primary
            ? `Yes — the default for ${group.application}`
            : 'No',
          icon: group.primary ? 'star' : 'minus',
        },
        { k: 'Members', v: num(group.members), icon: 'users' },
        { k: 'Entitlement class', v: group.privileged ? 'Privileged · second approval required' : 'Standard · single approval', icon: 'key' },
        { k: 'Serial number', v: `S.No ${group.sno}`, icon: 'tag' },
        { k: 'Definition age', v: `${num(group.ageDays)} days`, icon: 'clock' },
        { k: 'Created on', v: group.createdOn, icon: 'history' },
        { k: 'Last reviewed', v: group.reviewedOn, icon: 'certify' },
      ]}
      targetTitle={target.title}
      targetSub={target.sub}
      targetRows={target.rows}
      memberFoot={group.kind === 'SSO'
        ? `Asserted into ${group.claim} at every federated sign-in to ${group.application}`
        : `Membership reconciled against ${group.application} every six hours`}
      memberHint={group.kind === 'SSO'
        ? 'Additions are asserted at the next federated sign-in, not to sessions already open.'
        : `Additions are written to ${group.application} on the next provisioning run.`}
      scheduleNote={`Scheduled access is granted at the start date and revoked at the end date without a further approval on ${group.application}. Every window is written to the attestation record.`}
      usageLabel={group.kind === 'SSO' ? 'Federated sign-ins · last 12 weeks' : group.kind === 'Access' ? 'Console sessions · last 12 weeks' : 'Provisioning events · last 12 weeks'}
      usageUnit={group.kind === 'SSO' ? 'sign-ins' : group.kind === 'Access' ? 'sessions' : 'events'}
      activityCtx={{ target: group.application, ...ACTIVITY_CTX[group.kind] }}
    />
  )
}

