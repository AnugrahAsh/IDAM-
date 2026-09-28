import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { nextId } from '../../data/seed'
import LdapDetail from './LdapDetail'
import { LdapConnectionForm, LdapDefaultsForm } from './LdapForm'
import {
  LDAP_TABS, LDAP_TAB_ALIASES, allMappings, bindSuccessRate, buildApps, buildDashboardAttributes, dayStr, emptyApp,
  recentActivity,
} from './ldapModel'
import './LdapApplicationsPage.css'
import LdapList from './LdapList'
import LdapRules from './LdapRules'
import { buildRules } from './rulesData'

/* `defaults` is kept alongside `configure` because links to it exist outside
   this page. The surface is the module's configuration either way. */
const RESERVED = ['add', 'configure', 'defaults', 'rules']

export default function LdapApplicationsPage({ segments = [] }) {
  const { toast, navigate } = useApp()
  const [apps, setApps] = useState(buildApps)
  const [maps, setMaps] = useState(allMappings)
  const [customAttrs, setCustomAttrs] = useState(buildDashboardAttributes)
  const [rules, setRules] = useState(() => buildRules(buildApps()))

  const directoryNames = useMemo(() => [...new Set(apps.map((a) => a.displayName))], [apps])

  const stats = useMemo(() => ({
    total: apps.length,
    entries: apps.reduce((a, r) => a + r.entries, 0),
    secure: apps.filter((r) => r.tls).length,
    attention: apps.filter((r) => r.status !== 'Healthy').length,
  }), [apps])

  const [first, second] = segments

  if (first === 'configure' || first === 'defaults') {
    return <LdapDefaultsForm count={apps.length} directories={directoryNames} onCancel={() => navigate('/iam/ldapapplications')} />
  }

  /* The estate-wide rule register carries its own masthead, the way `LdapList`
     does. It is read from data like every other register in the module and
     settles with it, and the flag that decides whether it is settling has to sit
     below this component's early returns to stay a legal hook — so it lives in
     the register rather than here. */
  if (first === 'rules') {
    return <LdapRules apps={apps} rules={rules} />
  }

  if (first === 'add') {
    return (
      <LdapConnectionForm
        app={null}
        onCancel={() => navigate('/iam/ldapapplications')}
        onSubmit={(d) => {
          const id = nextId(apps)
          const blank = emptyApp()
          setApps((rs) => [...rs, {
            id,
            name: d.name,
            displayName: d.displayName,
            description: d.description,
            vendor: blank.vendor,
            owner: blank.owner,
            url: d.url,
            baseDn: d.baseDn,
            bindDn: d.bindDn,
            tls: d.tls,
            protocol: d.tls ? 'LDAPS' : 'LDAP',
            port: d.tls ? '636' : '389',
            entries: 0,
            status: 'Degraded',
            lastSync: 'Never',
            createdOn: dayStr(0),
            bindMs: 0,
            searchMs: 0,
            uptime: 0,
            failedBinds: 0,
            lastError: 'Never synchronized',
          }])
          toast('ok', 'Application created', `${d.displayName} is registered. Run a synchronization to populate it.`)
          navigate(`/iam/ldapapplications/${id}`)
        }}
      />
    )
  }

  if (first && !RESERVED.includes(first)) {
    const app = apps.find((r) => String(r.id) === String(first))
    if (!app) {
      return (
        <>
          <PageBar
            title="Directory not found"
            sub="This LDAP application is not registered. It may have been deleted."
            crumbs={[{ label: 'LDAP Applications', to: '/iam/ldapapplications' }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="directory"
            title={`No directory with identifier ${first}`}
            body="The record may have been deleted, or the link may be stale."
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate('/iam/ldapapplications')}>Back to LDAP applications</Button>}
          />
        </>
      )
    }

    if (second === 'edit') {
      return (
        <LdapConnectionForm
          key={app.id}
          app={app}
          onCancel={() => navigate(`/iam/ldapapplications/${app.id}`)}
          onSubmit={(d) => {
            setApps((rs) => rs.map((r) => (r.id === app.id ? {
              ...r,
              displayName: d.displayName,
              description: d.description,
              url: d.url,
              baseDn: d.baseDn,
              bindDn: d.bindDn,
              tls: d.tls,
              protocol: d.tls ? 'LDAPS' : 'LDAP',
              port: d.tls ? '636' : '389',
            } : r)))
            toast('ok', 'Application saved', `${d.displayName} was updated.`)
            navigate(`/iam/ldapapplications/${app.id}`)
          }}
        />
      )
    }

    const requested = LDAP_TAB_ALIASES[second] || second
    const tab = LDAP_TABS.includes(requested) ? requested : 'general'
    return (
      <LdapDetail
        key={app.id}
        app={app}
        tab={tab}
        onTab={(next) => navigate(next === 'general' ? `/iam/ldapapplications/${app.id}` : `/iam/ldapapplications/${app.id}/${next}`, { replace: true })}
        onPatch={(id, next) => setApps((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)))}
        onDelete={(target) => {
          setApps((rs) => rs.filter((r) => r.id !== target.id))
          // Rules are children of the directory now, so they go with it —
          // which is what the delete confirmation promised.
          setRules((rs) => rs.filter((r) => String(r.applicationId) !== String(target.id)))
          toast('ok', 'Application deleted', target.displayName)
          navigate('/iam/ldapapplications')
        }}
        maps={maps}
        setMaps={setMaps}
        directories={directoryNames}
        rules={rules}
        setRules={setRules}
      />
    )
  }

  return (
    <LdapList apps={apps} setApps={setApps} maps={maps} stats={stats} rules={rules} />
  )
}
