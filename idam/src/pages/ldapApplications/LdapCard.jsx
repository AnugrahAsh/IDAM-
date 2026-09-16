import Check from '../../components/primitives/Check'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { num, statusTone } from '../../lib/format'

const stop = (e) => e.stopPropagation()

// Card rendering of one directory connection. Same facts as the table row:
// what it is, where it binds, how much it holds and how well it answers.
export default function LdapCard({ app, ctx = {} }) {
  const tone = app.status === 'Healthy' ? 'ok' : app.status === 'Degraded' ? 'warn' : 'bad'
  const slow = app.bindMs > 150

  return (
    <article
      className="rcard"
      data-selected={ctx.selected || undefined}
      data-active={ctx.active || undefined}
      onClick={ctx.open}
      role={ctx.open ? 'button' : undefined}
      tabIndex={ctx.open ? 0 : undefined}
      onKeyDown={ctx.open ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.open() } } : undefined}
    >
      <header className="rcard-top">
        {ctx.selectable && (
          <span onClick={stop} role="presentation">
            <Check checked={!!ctx.selected} onChange={ctx.toggle} label={`Select ${app.name}`} />
          </span>
        )}
        <span className="ldap-card-ic" data-tls={app.tls || undefined}>
          <Icon name="directory" size={15} />
        </span>
        <span className="rcard-id">
          <span className="rcard-name trunc">{app.displayName}</span>
          <span className="rcard-sub trunc">{app.name}</span>
        </span>
        {ctx.onMenu && <IconButton icon="kebab" size="sm" label={`Actions for ${app.displayName}`} onClick={ctx.onMenu} />}
      </header>

      <div className="rcard-tags">
        <Tag tone={app.tls ? 'acc' : undefined}>{app.protocol}</Tag>
        {!app.tls && <Tag>No TLS</Tag>}
        <span className="spacer" />
        <Pill tone={statusTone(app.status)} dot>{app.status}</Pill>
      </div>

      <span className="rcard-line mono trunc">{app.url}</span>

      <dl className="rcard-meta">
        <div>
          <dt>Entries</dt>
          <dd className="num">{num(app.entries)}</dd>
        </div>
        <div>
          <dt>Bind</dt>
          <dd className={slow ? 'ldap-slow num' : 'num'}>{app.bindMs ? `${app.bindMs} ms` : '—'}</dd>
        </div>
        <div>
          <dt>Base DN</dt>
          <dd className="trunc mono">{app.baseDn}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd className="trunc">{app.owner}</dd>
        </div>
      </dl>

      <Meter value={app.uptime} tone={tone} height={4} />

      <footer className="rcard-foot">
        <span className="rcard-stat">{app.uptime}% uptime</span>
        <span className="spacer" />
        <span className="rcard-when">Last sync {app.lastSync}</span>
      </footer>
    </article>
  )
}
