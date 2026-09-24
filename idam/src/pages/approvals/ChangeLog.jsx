import './ChangeLog.css'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import { changeLogFor } from './data'

/**
 * The change log.
 *
 * Who changed what, from what to what, when, and where in the chain. An
 * approver may correct a request before signing it, which means the record a
 * person ends up with is not always the one that was asked for — so the trail
 * of those corrections is kept beside the request rather than inferred from it
 * afterwards.
 */
export default function ChangeLog({ row, draft, title = 'Change log', sub }) {
  const entries = changeLogFor(row, draft)

  return (
    <Card
      title={title}
      sub={sub || 'Every change on this request — who made it, what it was before, and what it became.'}
      actions={<Tag>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Tag>}
    >
      <div className="clog">
        {entries.map((e) => (
          <div className="clog-it" key={e.id} data-tone={e.tone} data-pending={e.pending || undefined}>
            <span className="clog-ic"><Icon name={e.icon} size={11} /></span>
            <div className="clog-m">
              <div className="clog-t">
                {e.action ? <span className="clog-act">{e.action}</span> : null}
                <span className="clog-what">{e.what}</span>
                {e.pending && <Tag tone="warn">Not yet committed</Tag>}
              </div>
              {(e.from || e.to) && (
                <div className="clog-v">
                  {e.from && <span className="clog-from">{e.from}</span>}
                  {e.from && e.to && <Icon name="arrowRight" size={11} />}
                  {e.to && <span className="clog-to">{e.to}</span>}
                </div>
              )}
              <div className="clog-by">
                <Icon name="user" size={11} />
                <b>{e.who || 'Not yet assigned'}</b>
                {e.role && <span className="clog-role">{e.role}</span>}
                <span className="clog-where">{e.where}</span>
              </div>
            </div>
            <span className="clog-when mono">{e.when || 'pending'}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
