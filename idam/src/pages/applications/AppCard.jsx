import AppLogo from '../../components/primitives/AppLogo'
import Check from '../../components/primitives/Check'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { brandOf, healthOf } from './appModel'
import { num } from '../../lib/format'

const stop = (e) => e.stopPropagation()

// Card rendering of one application record. The card carries the same facts as
// the table row — identity, capabilities, endpoint, health and volume — so the
// two views stay readable against each other.
export default function AppCard({ app, ctx = {} }) {
  const health = healthOf(app)
  const prov = app.provisioning
  const sso = app.sso

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
            <Check checked={!!ctx.selected} onChange={ctx.toggle} label={`Select ${app.displayName}`} />
          </span>
        )}
        <AppLogo src={app.logoSrc} brand={brandOf(app)} name={app.displayName} size={30} />
        <span className="rcard-id">
          <span className="rcard-name trunc">{app.displayName}</span>
          <span className="rcard-sub trunc">{app.name}</span>
        </span>
        {ctx.onMenu && <IconButton icon="kebab" size="sm" label={`Actions for ${app.displayName}`} onClick={ctx.onMenu} />}
      </header>

      <div className="rcard-tags">
        {prov && <Tag tone="acc">Provisioning</Tag>}
        {sso && <Tag tone="acc">SSO</Tag>}
        <span className="spacer" />
        <Pill tone={health.tone} dot>{health.label}</Pill>
      </div>

      <dl className="rcard-meta">
        <div>
          <dt>Connector</dt>
          <dd className="trunc">{prov?.method || <span className="t-faint">Not provisioned</span>}</dd>
        </div>
        {/* The federation protocol is a configuration detail of the SSO record,
            not something the register needs on every card. The SSO tag above
            already says whether the application is federated; the protocol
            itself is on the application's Single Sign-On tab. */}
        <div>
          <dt>Assigned</dt>
          <dd className="trunc">{sso ? `${num(sso.users)} users` : <span className="t-faint">Not federated</span>}</dd>
        </div>
        <div>
          <dt>Organization</dt>
          <dd className="trunc">{app.org}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd className="trunc">{app.owner}</dd>
        </div>
      </dl>

      <footer className="rcard-foot">
        <span className="rcard-stat">
          <b className="num">{prov ? num(prov.accounts) : '—'}</b> accounts
        </span>
        <span className="spacer" />
        <span className="rcard-when">
          {prov?.lastSync ? `Synced ${prov.lastSync}` : sso ? `Created ${app.createdOn}` : '—'}
        </span>
      </footer>
    </article>
  )
}
