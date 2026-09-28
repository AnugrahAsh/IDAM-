import './EmailTemplatesPage.css'
import './EmailManagementPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import EmailClientConfiguration, { CONFIG_TAB_IDS } from './EmailClientConfiguration'
import { useLoading } from '../../lib/useLoading'
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
  /* One settle for the screen, keyed on the panel being read: the tab is held
     locally rather than in the address, and a template opened from here is a
     record the editor below draws its own masthead for. */
  const loading = useLoading(`${tab}/${templateId || ''}`)

  return (
    <>
      {!templateId && loading && (
        <Skeleton label="Loading Email Templates">
          <SkeletonPageBar actions={0} crumbs={2} />
        </Skeleton>
      )}

      {!templateId && !loading && (
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
          loading={loading}
        />
      </div>
    </>
  )
}
