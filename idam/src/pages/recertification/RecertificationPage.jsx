import './RecertificationPage.css'
import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { nextId } from '../../data/seed'
import { SEED_CAMPAIGNS, SEED_ITEMS, TODAY } from './data'
import CampaignList from './CampaignList'
import CampaignDetail from './CampaignDetail'
import CampaignForm from './CampaignForm'
import { seedCampaignUsers } from './campaignUsers'
import { EMAIL_SUBMISSIONS_KEY, applyEmailSubmissions } from './emailLink'

const DECIDER = 'Shubham Jain'

export default function RecertificationPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  const [campaigns, setCampaigns] = useState(SEED_CAMPAIGNS)
  const [items, setItems] = useState(SEED_ITEMS)
  // The users of every campaign, with what each approval level submitted. Held
  // here so a level certified on the review page is still there on Items.
  const [campaignUsers, setCampaignUsers] = useState(() => Object.fromEntries(SEED_CAMPAIGNS.map((c) => [c.id, applyEmailSubmissions(c.id, seedCampaignUsers(c))])))

  // A reviewer answering an email link in another tab lands here as soon as
  // they submit, without the console being reloaded.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== EMAIL_SUBMISSIONS_KEY) return
      setCampaignUsers((all) => Object.fromEntries(Object.entries(all).map(([id, list]) => [id, applyEmailSubmissions(id, list)])))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const submitLevel = (campaignId, userId, key, index, data, remarks) => {
    setCampaignUsers((all) => ({
      ...all,
      [campaignId]: (all[campaignId] || []).map((u) => {
        if (String(u.id) !== String(userId)) return u
        const keys = Object.keys(u.levels)
        const next = keys[index + 1]
        return {
          ...u,
          levels: {
            ...u.levels,
            [key]: { ...u.levels[key], mods: data, remarks, certified: true, mailSent: true, certifiedBy: DECIDER, certifiedOn: TODAY },
            ...(next ? { [next]: { ...u.levels[next], mailSent: true } } : {}),
          },
        }
      }),
    }))
  }

  const resendMail = (list) => {
    const outstanding = list.reduce((a, c) => a + Math.max(0, c.items - c.decided), 0)
    toast(
      'ok',
      'Reminder mail sent',
      list.length === 1
        ? `${list[0].name} · ${num(outstanding)} outstanding items, reviewers notified by email.`
        : `${list.length} campaigns · ${num(outstanding)} outstanding items, reviewers notified by email.`,
    )
  }

  const closeCampaigns = (list, done) => {
    const open = list.filter((c) => c.status === 'Active')
    if (open.length === 0) {
      toast('info', 'Nothing to close', 'Every selected campaign is already closed.')
      if (done) done()
      return
    }
    confirm({
      title: open.length === 1 ? `Close ${open[0].name}?` : `Close ${open.length} campaigns?`,
      body: 'Undecided entitlements are handled by the close policy and the campaign is sealed for the auditor. Reviewers lose access to their queue immediately.',
      confirmLabel: `Close ${open.length}`,
      onConfirm: () => {
        const set = new Set(open.map((c) => String(c.id)))
        setCampaigns((cs) => cs.map((c) => (set.has(String(c.id)) ? { ...c, status: 'Closed', dueIn: 0 } : c)))
        toast('ok', 'Campaign closed', `${open.length} ${open.length === 1 ? 'campaign is' : 'campaigns are'} sealed and available as evidence.`)
        if (done) done()
      },
    })
  }

  const deleteCampaigns = (list, done) => confirm({
    title: list.length === 1 ? `Delete ${list[0].name}?` : `Delete ${list.length} campaigns?`,
    body: 'The campaign, its collected items and every decision recorded against it are removed. Evidence already exported is unaffected. This cannot be undone.',
    confirmLabel: `Delete ${list.length}`,
    onConfirm: () => {
      const set = new Set(list.map((c) => String(c.id)))
      setCampaigns((cs) => cs.filter((c) => !set.has(String(c.id))))
      setItems((rs) => rs.filter((r) => !set.has(String(r.campaignId))))
      setCampaignUsers((all) => Object.fromEntries(Object.entries(all).filter(([k]) => !set.has(String(k)))))
      toast('ok', 'Campaign deleted', `${list.length} ${list.length === 1 ? 'campaign' : 'campaigns'} removed from recertification.`)
      if (done) done()
      navigate('/iam/recertification')
    },
  })

  const createCampaign = (draft) => {
    const id = nextId(campaigns)
    setCampaigns((cs) => [{ id, ...draft }, ...cs])
    setCampaignUsers((all) => ({ ...all, [id]: seedCampaignUsers({ id, ...draft }) }))
    toast('ok', 'Campaign created', `${draft.name} · ${num(draft.items)} items collected, reviewers notified on the next digest run.`)
    navigate(`/iam/recertification/${id}`)
  }

  if (segments[0] === 'add') return <CampaignForm onCreate={createCampaign} />

  if (segments[0]) {
    return (
      <CampaignDetail
        key={segments[0]}
        id={segments[0]}
        segments={segments.slice(1)}
        campaigns={campaigns}
        items={items}
        users={campaignUsers[segments[0]] || campaignUsers[Number(segments[0])] || []}
        decider={DECIDER}
        onSubmitLevel={(userId, key, index, data, remarks) => submitLevel(Number(segments[0]), userId, key, index, data, remarks)}
        onResend={resendMail}
        onClose={closeCampaigns}
        onDelete={deleteCampaigns}
      />
    )
  }

  return (
    <CampaignList
      campaigns={campaigns}
      items={items}
      onResend={resendMail}
      onClose={closeCampaigns}
      onDelete={deleteCampaigns}
    />
  )
}
