import './EmailTemplatesPage.css'
import './EmailManagementPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import EmailClientConfiguration, { CONFIG_TAB_IDS } from './EmailClientConfiguration'
import { OUTBOX } from '../shared/comms/commsData'

/**
 * An alias kept alive for existing links. /iam/emailTemplates redirects to
 * /iam/emails/templates, so this only renders when the route carries a segment
 * of its own — /iam/emailTemplates/<id>, the address the full-page template
 * editor used to own, which it owns again.
 */
export default function EmailTemplatesPage({ segments = [] }) {
  const [messages, setMessages] = useState(() => OUTBOX.map((m) => ({ ...m })))
  const [tab, setTab] = useState(() => (CONFIG_TAB_IDS.includes(segments[0]) ? segments[0] : 'templates'))
  const templateId = CONFIG_TAB_IDS.includes(segments[0]) ? undefined : segments[0]

  return (
    <>
      {!templateId && (
        <PageBar
          title="Email Templates"
          sub="The transactional messages the platform renders."
          crumbs={[{ label: 'Email Management', to: 'emails' }, { label: 'Email Templates' }]}
        />
      )}
      <div className="stack">
        <EmailClientConfiguration
          tab={tab}
          onTab={setTab}
          messages={messages}
          onMessagesChange={setMessages}
          openTemplateId={templateId}
        />
      </div>
    </>
  )
}
