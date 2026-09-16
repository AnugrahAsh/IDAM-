import './SmsTemplatesPage.css'
import './SmsManagementPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import SmsClientConfiguration, { CONFIG_TAB_IDS } from './SmsClientConfiguration'
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

  return (
    <>
      <PageBar
        title="SMS Templates"
        sub="Gateway providers, their message templates, and the clients that route through them."
        crumbs={[{ label: 'SMS Management', to: 'sms' }, { label: 'SMS Templates' }]}
      />
      <div className="stack">
        <SmsClientConfiguration
          tab={tab}
          onTab={setTab}
          messages={messages}
          onMessagesChange={setMessages}
        />
      </div>
    </>
  )
}
