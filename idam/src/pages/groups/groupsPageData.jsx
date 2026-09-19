import { CONNECTOR_TYPES } from '../../data/seed'
import { num } from '../../lib/format'
import { GroupMark } from '../groups/GroupDetail'
import { KIND_META, PROTOCOL_ICON, appTargetOf, ssoTargetOf } from '../groups/groupsData'

export const ACCESS_META = {
  'IDAM Console': { surface: 'Administrative console', signIn: 'Passkey or authenticator, every session', sessions: 4120 },
  'Self-Service Portal': { surface: 'End-user portal', signIn: 'Single factor, step-up for profile changes', sessions: 38400 },
  'Access Request Catalog': { surface: 'End-user portal', signIn: 'Single factor', sessions: 9260 },
  'Approval Workbench': { surface: 'Delegated workbench', signIn: 'Authenticator on every approval', sessions: 6140 },
  'Recertification Portal': { surface: 'Campaign workbench', signIn: 'Authenticator, re-prompt on sign-off', sessions: 2870 },
  'Delegated Admin Console': { surface: 'Scoped administrative console', signIn: 'Passkey, every session', sessions: 1180 },
  'Password Reset Kiosk': { surface: 'Attended kiosk', signIn: 'Operator badge and passkey', sessions: 740 },
}


export const ACTIVITY_CTX = {
  Application: { grantVerb: 'provisioned', revokeVerb: 'deprovisioned' },
  Access: { grantVerb: 'granted', revokeVerb: 'withdrawn' },
  SSO: { grantVerb: 'asserted', revokeVerb: 'withdrawn from the claim' },
}


export const DETAIL_SEED = {
  Application: { memberStride: 5, memberCap: 18, scheduleStride: 7, usageSalt: 3 },
  Access: { memberStride: 11, memberCap: 14, scheduleStride: 5, usageSalt: 5 },
  SSO: { memberStride: 17, memberCap: 20, scheduleStride: 13, usageSalt: 7 },
}


export function markFor(group, size) {
  const icon = group.kind === 'SSO' ? (PROTOCOL_ICON[group.protocol] || 'sso') : KIND_META[group.kind].icon
  return <GroupMark icon={icon} tone={group.privileged || group.external ? 'warn' : 'acc'} size={size} />
}


export function targetFor(group) {
  if (group.kind === 'Application') {
    const app = appTargetOf(group.application)
    const connector = CONNECTOR_TYPES.find((c) => c.id === app.connector) || CONNECTOR_TYPES[0]
    return {
      title: 'Target application',
      sub: 'The connected system that enforces the rights this group carries.',
      rows: [
        { k: 'Application', v: `${app.displayName} · ${app.name}`, icon: 'provision' },
        { k: 'Connector', v: `${app.method} (${connector.name})`, icon: 'swap' },
        { k: 'Endpoint', v: `${app.host}:${app.port}`, icon: 'server' },
        { k: 'Connector health', v: `${app.status} · last sync ${app.lastSync}`, icon: 'activity' },
      ],
    }
  }
  if (group.kind === 'Access') {
    const meta = ACCESS_META[group.application] || ACCESS_META['IDAM Console']
    return {
      title: 'Access application',
      sub: 'The surface of the platform this group unlocks, and how a session on it is protected.',
      rows: [
        { k: 'Application', v: group.application, icon: 'apps' },
        { k: 'Surface', v: meta.surface, icon: 'panelLeft' },
        { k: 'Sign-in requirement', v: meta.signIn, icon: 'shield' },
        { k: 'Sessions in 7 days', v: num(meta.sessions), icon: 'activity' },
      ],
    }
  }
  const app = ssoTargetOf(group.application)
  return {
    title: 'Federated application',
    sub: 'The relying party that consumes the claim and the health of the connection carrying it.',
    rows: [
      { k: 'Application', v: `${app.displayName} · ${app.name}`, icon: 'sso' },
      { k: 'Protocol', v: app.protocol, icon: 'shield' },
      { k: 'Client identifier', v: app.clientId, icon: 'key' },
      { k: 'Connection status', v: `${app.status}${app.enabled ? '' : ' · federation disabled'}`, icon: 'activity' },
    ],
  }
}

