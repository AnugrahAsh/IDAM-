import './SmsManagementPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import SmsPage from './SmsPage'
import SmsClientConfiguration, { CONFIG_TAB_IDS } from './SmsClientConfiguration'
import { useApp } from '../../store/AppContext'
import { SMS_QUEUE } from '../shared/comms/commsData'

export default function SmsManagementPage({ segments = [] }) {
  const { navigate } = useApp()
  // The section owns the queue so the delivery log, the health tiles and the
  // tab count are computed from one list rather than copies that can disagree.
  const [messages, setMessages] = useState(() => SMS_QUEUE.map((m) => ({ ...m })))

  const head = segments[0]
  const isTab = CONFIG_TAB_IDS.includes(head)

  // A first segment that is not a tab name is a message id. The register has
  // always linked to /iam/sms/<id>, so those links keep resolving.
  if (head && !isTab) {
    return <SmsPage segments={segments} rows={messages} onRowsChange={setMessages} />
  }

  /* /iam/sms/<tab>/<id|add> opens that record's editor. It is a page, so it
     owns the whole screen — no page bar above it, because it brings its own
     header and its own back link. */
  const openId = segments[1]

  return (
    <>
      {!openId && (
        <PageBar
          title="SMS Management"
          sub="One-time-code and alert delivery over SMS — the gateways it leaves through, their message templates, the clients that route through them, and the register of what was carried."
          crumbs={[{ label: 'SMS Management' }]}
        />
      )}

      <div className="stack">
        <SmsClientConfiguration
          tab={isTab ? head : 'providers'}
          onTab={(id) => navigate(`/iam/sms/${id}`)}
          openId={openId}
          messages={messages}
          onMessagesChange={setMessages}
        />
      </div>
    </>
  )
}
