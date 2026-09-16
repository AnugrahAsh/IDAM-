import './EmailConfigurationPage.css'
import './EmailManagementPage.css'
import './EmailTemplatesPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import EmailClientConfiguration, { CONFIG_TAB_IDS } from './EmailClientConfiguration'
import { OUTBOX } from '../shared/comms/commsData'

/**
 * An alias kept alive for existing links. /iam/emailConfigurations redirects to
 * /iam/emails/smtp, so this only renders when the route id is reached directly
 * — it shows the same configuration screens, with tab state held locally
 * because the route carries no segments of its own.
 */
export default function EmailConfigurationPage({ segments = [] }) {
  const [messages, setMessages] = useState(() => OUTBOX.map((m) => ({ ...m })))
  const [tab, setTab] = useState(() => (CONFIG_TAB_IDS.includes(segments[0]) ? segments[0] : 'smtp'))

  return (
    <>
      <PageBar
        title="Email Configuration"
        sub="The relay every transactional message passes through, and the rules it is carried under."
        crumbs={[{ label: 'Email Management', to: 'emails' }, { label: 'Email Configuration' }]}
      />
      <div className="stack">
        <EmailClientConfiguration
          tab={tab}
          onTab={setTab}
          messages={messages}
          onMessagesChange={setMessages}
        />
      </div>
    </>
  )
}
