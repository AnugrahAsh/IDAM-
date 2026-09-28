import './SmsManagementPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import SmsPage from './SmsPage'
import SmsClientConfiguration, { CONFIG_TAB_IDS } from './SmsClientConfiguration'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { SMS_QUEUE } from '../shared/comms/commsData'

export default function SmsManagementPage({ segments = [] }) {
  const { navigate } = useApp()
  // The section owns the queue so the delivery log, the health tiles and the
  // tab count are computed from one list rather than copies that can disagree.
  const [messages, setMessages] = useState(() => SMS_QUEUE.map((m) => ({ ...m })))

  const head = segments[0]
  const isTab = CONFIG_TAB_IDS.includes(head)

  /* One settle for the whole section, keyed on the address. The page bar, the
     register under the tabs and a record editor are one arrival, so they are
     held by one flag and released together; a tab or a record change is the
     round trip a real deployment would make, and the key changing is what says
     so. The tab bar itself is chrome and is never held — an operator who has
     just clicked a tab should not watch it disappear. */
  const loading = useLoading(segments.join('/'))

  // A first segment that is not a tab name is a message id. The register has
  // always linked to /iam/sms/<id>, so those links keep resolving.
  if (head && !isTab) {
    return <SmsPage segments={segments} rows={messages} onRowsChange={setMessages} loading={loading} />
  }

  /* /iam/sms/<tab>/<id|add> opens that record's editor. A provider and a
     template are pages, so each owns the whole screen — no page bar above it,
     because it brings its own header and its own back link. A client is a
     drawer over the register, so the register keeps its page bar and the
     address is put back to the register's own once the drawer is up. */
  const openId = segments[1]
  const isRecordPage = !!openId && (head === 'providers' || head === 'templates')

  return (
    <>
      {/* The announcing region for the section: everything under it, including
          the register's own body skeleton, is decoration, so the wait is
          described once. */}
      {!isRecordPage && loading && (
        <Skeleton label="Loading SMS Management">
          <SkeletonPageBar actions={0} crumbs={1} />
        </Skeleton>
      )}

      {!isRecordPage && !loading && (
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
          loading={loading}
        />
      </div>
    </>
  )
}
