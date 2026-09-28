import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonKeyValue,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { describeAudience, matchedUsers, reachIsExact, reachOf, readAudience } from '../shared/comms/audienceModel'
import { num } from '../../lib/format'
import { MANAGE_PATH } from './quickLinksAccess'

/**
 * The read-only view of a quick link.
 *
 * Opening a row used to drop the operator straight into a form, so reading what
 * a link is and who can see it meant looking at editable fields and being one
 * keystroke from changing them. The register now opens this, and editing is a
 * deliberate step from here.
 *
 * It carries the editor's tabs so moving between the two does not move the
 * furniture.
 */

const MODE_LABEL = {
  audience: 'Standing group',
  users: 'Specific people',
  condition: 'Matching a condition',
}

/* The tab row a record masthead lands with. The kit's header stops at the
   facts, and a header that will carry tabs is a row taller than one that will
   not — enough to move the body under it when the record arrives. The hairline
   sits above the row here rather than below it, which is the one thing this
   cannot borrow from the real header. */
function SkeletonTabRow({ count = 2 }) {
  return (
    <div className="tabs" style={{ borderBottom: 'none' }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span className="tab" key={i}>
          <span className="skel" style={{ width: 74 + (i % 3) * 16, height: 'calc(var(--t-body) * var(--t-body-lh))' }} />
        </span>
      ))}
    </div>
  )
}

export default function LinkView({ record, onEdit, onDelete, onToggleStatus }) {
  const { toast } = useApp()
  const [tab, setTab] = useState('link')
  /* The record settles as one thing, keyed on which link is being read: moving
     between two links is the round trip a deployment would make. The tab is
     not part of the key — both panels are built from the record already in
     hand, so switching between them fetches nothing. */
  const loading = useLoading(record.id)

  const audience = readAudience(record, 'visibility')
  const scopeLabel = describeAudience(audience)
  const estimated = reachOf(audience)
  const hidden = record.status === 'Hidden'
  // Named people resolve to actual identities, so the view can list them rather
  // than restate the count.
  const named = audience.mode === 'users' ? matchedUsers(audience) : []

  if (loading) {
    return (
      <Skeleton label="Loading link">
        <SkeletonDetailHeader media={false} facts={3} actions={4} />
        <SkeletonTabRow count={2} />
        <div className="detail-body">
          <div className="detail-cols">
            {/* The field grid and the preview tile, at the heights they land
                at: five rows on the left, a tile with a caption on the right. */}
            <SkeletonCard><SkeletonKeyValue rows={5} cols={1} /></SkeletonCard>
            <SkeletonCard lines={4} />
          </div>
        </div>
      </Skeleton>
    )
  }

  return (
    <>
      <DetailHeader
        backTo={MANAGE_PATH}
        backLabel="Quick Links Management"
        eyebrow="Quick link"
        title={record.label || 'Untitled link'}
        sub={record.description || 'A shortcut surfaced on the Quick Links page.'}
        badges={
          <>
            <Pill tone={hidden ? 'mut' : 'ok'} dot>{hidden ? 'Hidden' : 'Published'}</Pill>
            <Tag>{scopeLabel}</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="users" label="In scope" value={num(estimated)} />
            <Fact icon="history" label="Created on" value={record.createdOn} />
            <Fact icon="user" label="Created by" value={record.createdBy} />
          </>
        }
        actions={
          <>
            <Button icon="external" onClick={() => toast('info', 'Opening', record.url)}>Open</Button>
            <Button
              icon={hidden ? 'check' : 'eyeoff'}
              onClick={() => onToggleStatus(record)}
            >
              {hidden ? 'Publish' : 'Hide from users'}
            </Button>
            <Button variant="pri" icon="edit" onClick={() => onEdit(record)}>Edit</Button>
            <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'link', label: 'Link', icon: 'link' },
              { id: 'audience', label: 'Audience', icon: 'users', count: audience.mode === 'users' ? named.length : undefined },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'link' && (
          <div className="detail-cols">
            <Card title="Link" sub="What users see and where it takes them.">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Title', v: record.label, icon: 'tag' },
                  {
                    k: 'Destination',
                    icon: 'link',
                    node: (
                      <a className="link" href={record.url} target="_blank" rel="noopener noreferrer">{record.url}</a>
                    ),
                  },
                  { k: 'Description', v: record.description, icon: 'file' },
                  { k: 'Icon', v: record.icon, icon: 'apps' },
                  {
                    k: 'Status',
                    icon: hidden ? 'eyeoff' : 'checkC',
                    node: <Pill tone={hidden ? 'mut' : 'ok'} dot>{hidden ? 'Hidden' : 'Published'}</Pill>,
                  },
                ]}
              />
            </Card>

            <Card title="Preview" sub="As it appears on Quick Links">
              <div className="tile">
                <div className="tile-k"><Icon name={record.icon} size={12} />{scopeLabel}</div>
                <div className="t-h3" style={{ marginTop: 6 }}>{record.label || 'Untitled link'}</div>
                <div className="t-xs t-mut" style={{ marginTop: 4 }}>{record.description || 'No description'}</div>
                <div className="code" style={{ marginTop: 10, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {record.url}
                </div>
              </div>
              {hidden && (
                <div className="banner" data-tone="warn" style={{ marginTop: 12 }}>
                  <Icon name="eyeoff" size={15} />
                  <div>This link is hidden. Nobody sees it on Quick Links, whatever the audience resolves to.</div>
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === 'audience' && (
          <div className="grid grid-2">
            <Card title="Who sees this link" sub="Evaluated each time Quick Links is opened.">
              <div className="stack">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Scope', v: MODE_LABEL[audience.mode] || 'Standing group', icon: 'filter' },
                    { k: 'Resolves to', v: scopeLabel, icon: 'users' },
                    audience.mode === 'audience' && { k: 'Standing group', v: audience.audience, icon: 'group' },
                    audience.mode === 'condition' && {
                      k: 'Condition',
                      icon: 'sliders',
                      node: (
                        <span className="mono t-xs">
                          {audience.condition?.attribute} {audience.condition?.operator} “{audience.condition?.value}”
                        </span>
                      ),
                    },
                  ]}
                />
                {audience.mode === 'users' && (
                  named.length === 0
                    ? <div className="t-sm t-mut">Nobody is named on this link yet, so it is shown to nobody.</div>
                    : (
                      <div className="feed">
                        {named.map((u) => (
                          <div className="feed-it" key={u.id}>
                            <span className="feed-ic" data-tone="acc"><Icon name="user" size={13} /></span>
                            <div className="feed-m">
                              <div className="feed-t"><b>{u.firstName} {u.lastName}</b></div>
                              <div className="feed-s"><span className="mono">{u.username}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                )}
              </div>
            </Card>

            <Card title="Reach" sub="How many identities the current scope resolves to.">
              <div className="tile">
                <div className="tile-k"><Icon name="users" size={12} />In scope</div>
                <div className="t-display num" style={{ marginTop: 6 }}>{num(estimated)}</div>
                <div className="t-xs t-mut" style={{ marginTop: 4 }}>
                  {reachIsExact(audience)
                    ? 'Exactly this many identities match the scope.'
                    : 'Estimated by the platform from the current directory.'}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
