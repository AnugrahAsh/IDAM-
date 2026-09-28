import './SmsTemplatesPage.css'
import './SmsManagementPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import SmsClientConfiguration, { CONFIG_TAB_IDS } from './SmsClientConfiguration'
import { useLoading } from '../../lib/useLoading'
import { SMS_QUEUE } from '../shared/comms/commsData'

/**
 * An alias kept alive for existing links. /iam/smsTemplates redirects to
 * /iam/sms/providers, so this only renders when the route id is reached
 * directly — it shows the same configuration card, with tab state held locally
 * because the route carries no segments of its own.
 */
export default function SmsTemplatesPage({ segments = [] }) {
  const [messages, setMessages] = useState(() => SMS_QUEUE.map((m) => ({ ...m })))
  const [tab, setTab] = useState(() => (CONFIG_TAB_IDS.includes(segments[0]) ? segments[0] : 'providers'))
  // The tab is local here rather than in the address, so it is the key: this
  // page settles as one thing on arrival and again when the panel changes.
  const loading = useLoading(tab)

  return (
    <>
      {loading ? (
        <Skeleton label="Loading SMS Templates">
          <SkeletonPageBar actions={0} crumbs={2} />
        </Skeleton>
      ) : (
        <PageBar
          title="SMS Templates"
          sub="Gateway providers, their message templates, and the clients that route through them."
          crumbs={[{ label: 'SMS Management', to: 'sms' }, { label: 'SMS Templates' }]}
        />
      )}
      <div className="stack">
        <SmsClientConfiguration
          tab={tab}
          onTab={setTab}
          messages={messages}
          onMessagesChange={setMessages}
          loading={loading}
        />
      </div>
    </>
  )
}
