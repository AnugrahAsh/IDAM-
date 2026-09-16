import './EmailManagementPage.css'
// The rendered-email and HTML-source rules live with the template editor that
// owns them; the configuration screens draw both.
import './EmailTemplatesPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import EmailsPage from './EmailsPage'
import EmailClientConfiguration, { CONFIG_TAB_IDS } from './EmailClientConfiguration'
import { useApp } from '../../store/AppContext'
import { OUTBOX } from '../shared/comms/commsData'

export default function EmailManagementPage({ segments = [] }) {
  const { navigate } = useApp()
  // The section owns the outbox so the delivery log, the queue tiles and the
  // tab count are computed from one list rather than copies that can disagree.
  const [messages, setMessages] = useState(() => OUTBOX.map((m) => ({ ...m })))

  const head = segments[0]
  const isTab = CONFIG_TAB_IDS.includes(head)

  // A first segment that is not a tab name is a message id. The register has
  // always linked to /iam/emails/<id>, so those links keep resolving.
  if (head && !isTab) {
    return <EmailsPage segments={segments} rows={messages} onRowsChange={setMessages} />
  }

  /* The template editor is a page, so it owns the whole screen rather than
     being raised over the register — no page bar above it, because it brings
     its own header and its own back link. */
  const templateId = head === 'templates' ? segments[1] : undefined

  return (
    <>
      {!templateId && (
        <PageBar
          title="Email Management"
          sub="Transactional mail — the relay it leaves through, what happens when it will not go, the templates it renders, and the register of what was carried."
          crumbs={[{ label: 'Email Management' }]}
        />
      )}

      <div className="stack">
        <EmailClientConfiguration
          tab={isTab ? head : 'smtp'}
          onTab={(id) => navigate(`/iam/emails/${id}`)}
          messages={messages}
          onMessagesChange={setMessages}
          openTemplateId={templateId}
        />
      </div>
    </>
  )
}
