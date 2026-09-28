import './EmailConfigurationPage.css'
import './EmailManagementPage.css'
import './EmailTemplatesPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import EmailClientConfiguration, { CONFIG_TAB_IDS } from './EmailClientConfiguration'
import { useLoading } from '../../lib/useLoading'
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
  // The tab is local here rather than in the address, so it is the key: this
  // page settles as one thing on arrival and again when the panel changes.
  const loading = useLoading(tab)

  return (
    <>
      {loading ? (
        <Skeleton label="Loading Email Configuration">
          <SkeletonPageBar actions={0} crumbs={2} />
        </Skeleton>
      ) : (
        <PageBar
          title="Email Configuration"
          sub="The relay every transactional message passes through, and the rules it is carried under."
          crumbs={[{ label: 'Email Management', to: 'emails' }, { label: 'Email Configuration' }]}
        />
      )}
      <div className="stack">
        <EmailClientConfiguration
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
