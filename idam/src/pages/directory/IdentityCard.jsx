import Avatar from '../../components/primitives/Avatar'
import Check from '../../components/primitives/Check'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import { statusTone } from '../../lib/format'
import { isPrivileged, lastActive, mfaOf, riskOf, sourceOf } from './posture'

const stop = (e) => e.stopPropagation()
const dash = (v) => (v && String(v).trim() ? v : '—')

// Card rendering of one identity. It carries the same facts as the table row so
// the two views read against each other: who, where they sit, and sign-in state.
export default function IdentityCard({ user, ctx = {} }) {
  const name = `${user.firstName} ${user.lastName}`.trim()
  const mfa = mfaOf(user)
  const risk = riskOf(user)

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
            <Check checked={!!ctx.selected} onChange={ctx.toggle} label={`Select ${user.username}`} />
          </span>
        )}
        <Avatar first={user.firstName} last={user.lastName} />
        <span className="rcard-id">
          <span className="rcard-name trunc">{name}</span>
          <span className="rcard-sub trunc">{user.username}</span>
        </span>
        {ctx.onMenu && <IconButton icon="kebab" size="sm" label={`Actions for ${user.username}`} onClick={ctx.onMenu} />}
      </header>

      <div className="rcard-tags">
        {isPrivileged(user) && <Tag tone="viol">Privileged</Tag>}
        <Tag>{user.employeeType}</Tag>
        <span className="spacer" />
        <Pill tone={statusTone(user.status)} dot>{user.status}</Pill>
      </div>

      <div className="rcard-tags">
        {mfa.state === 'na'
          ? <span className="t-faint">MFA not applicable</span>
          : mfa.state === 'none'
            ? <Pill tone="bad" dot>MFA not enrolled</Pill>
            : <><Pill tone="ok" dot>MFA</Pill><Tag>{mfa.factor}</Tag></>}
        <span className="spacer" />
        <span title={risk.reasons.join(' · ')}>
          <SeverityBadge level={risk.level}>{`${risk.level[0].toUpperCase()}${risk.level.slice(1)} risk`}</SeverityBadge>
        </span>
      </div>

      <span className="rcard-line">
        <Icon name="mail" size={12} />
        <span className="trunc">{user.email}</span>
      </span>

      <dl className="rcard-meta">
        <div>
          <dt>Department</dt>
          <dd className="trunc">{dash(user.department)}</dd>
        </div>
        <div>
          <dt>Designation</dt>
          <dd className="trunc">{dash(user.designation)}</dd>
        </div>
        <div>
          <dt>Source of record</dt>
          <dd className="trunc">{sourceOf(user)}</dd>
        </div>
        <div>
          <dt>Manager</dt>
          <dd className="trunc">{user.manager || <span className="t-faint">Unassigned</span>}</dd>
        </div>
      </dl>

      <footer className="rcard-foot">
        <span className="rcard-stat">{user.empCode}</span>
        <span className="spacer" />
        <span className="rcard-when">
          {user.lastLogin === 'Never' ? 'Never signed in' : `Active ${lastActive(user)}`}
        </span>
      </footer>
    </article>
  )
}
