import './EmailManagementPage.css'
// The rendered-email and HTML-source rules live with the template editor that
// owns them; the configuration screens draw both.
import './EmailTemplatesPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import EmailsPage from './EmailsPage'
import EmailClientConfiguration, { CONFIG_TAB_IDS } from './EmailClientConfiguration'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { OUTBOX } from '../shared/comms/commsData'

export default function EmailManagementPage({ segments = [] }) {
  const { navigate } = useApp()
  // The section owns the outbox so the delivery log, the queue tiles and the
  // tab count are computed from one list rather than copies that can disagree.
  const [messages, setMessages] = useState(() => OUTBOX.map((m) => ({ ...m })))

  const head = segments[0]
  const isTab = CONFIG_TAB_IDS.includes(head)

  /* One settle for the whole section, keyed on the address. The page bar, the
     panel under the tabs and the template editor are one arrival, so they are
     held by one flag and released together; a tab or a template change is the
     round trip a real deployment would make, and the key changing is what says
     so. The tab bar itself is chrome and is never held — an operator who has
     just clicked a tab should not watch it disappear. */
  const loading = useLoading(segments.join('/'))

  // A first segment that is not a tab name is a message id. The register has
  // always linked to /iam/emails/<id>, so those links keep resolving.
  if (head && !isTab) {
    return <EmailsPage segments={segments} rows={messages} onRowsChange={setMessages} loading={loading} />
  }

  /* The template editor is a page, so it owns the whole screen rather than
     being raised over the register — no page bar above it, because it brings
     its own header and its own back link. */
  const templateId = head === 'templates' ? segments[1] : undefined

  return (
    <>
      {/* The announcing region for the section: everything under it, including
          the register's own body skeleton, is decoration, so the wait is
          described once. */}
      {!templateId && loading && (
        <Skeleton label="Loading Email Management">
          <SkeletonPageBar actions={0} crumbs={1} />
        </Skeleton>
      )}

      {!templateId && !loading && (
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
          loading={loading}
        />
      </div>
    </>
  )
}
