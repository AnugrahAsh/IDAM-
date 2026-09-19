import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import { SSO_APPS, USERS } from '../../data/seed'
import { num, statusTone } from '../../lib/format'
import { LIST_PATH, rangeInfo, rangeRows } from './networkData'

export default function BindingDetail({ binding, onEdit, onToggle, onDelete, onOpen }) {
  const range = rangeInfo(binding.ipAddress)
  const user = USERS.find((u) => u.username === binding.username)
  const app = SSO_APPS.find((a) => a.displayName === binding.application)

  return (
    <>
      <DetailHeader
        backTo={LIST_PATH}
        backLabel="Network Access Policies"
        eyebrow="Network restriction"
        title={binding.username}
        sub={`Binds ${binding.username} to ${binding.ipAddress} on ${binding.application}. Evaluated at every authentication attempt before any application assignment is considered.`}
        media={<Avatar first={binding.firstName} last={binding.lastName} size="xl" />}
        badges={
          <>
            <Pill tone={binding.action === 'Deny' ? 'bad' : 'ok'} dot>{binding.action}</Pill>
            <Pill tone={statusTone(binding.status)} dot>{binding.status}</Pill>
            <Tag>{binding.employeeType}</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="tag" label="UUID" value={<span className="mono t-xs">{binding.id}</span>} />
            <Fact icon="sso" label="Application" value={binding.application} />
            <Fact icon="globe" label="Address" value={<span className="mono">{binding.ipAddress}</span>} />
            <Fact icon="shield" label="Action" value={binding.action} />
            <Fact icon="calendar" label="Created" value={`${binding.createdOn} by ${binding.createdBy}`} />
          </>
        }
        actions={
          <>
            <Button
              icon={binding.status === 'Active' ? 'ban' : 'checkC'}
              onClick={() => onToggle(binding)}
            >
              {binding.status === 'Active' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="danger" icon="trash" onClick={() => onDelete(binding)}>Delete</Button>
            <Button variant="pri" icon="edit" onClick={() => onEdit(binding)}>Edit binding</Button>
          </>
        }
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            {binding.status === 'Disabled' && (
              <Banner tone="warn">
                This binding is deactivated. It is held in the policy set but takes no part in evaluation, so the
                identity currently falls through to the next binding or the tenant default.
              </Banner>
            )}

            <Card title="Binding record" sub="The stored definition, exactly as the policy compiler reads it">
              <KeyValue
                rows={[
                  { k: 'UUID', node: <span className="mono t-xs">{binding.id}</span>, icon: 'tag' },
                  { k: 'Username', v: binding.username, icon: 'user' },
                  { k: 'Email', v: binding.email, icon: 'at' },
                  { k: 'Employee type', v: binding.employeeType, icon: 'tag' },
                  { k: 'Organization', v: binding.organization, icon: 'building' },
                  { k: 'Department', v: binding.department, icon: 'layers' },
                  { k: 'Application', v: binding.application, icon: 'sso' },
                  { k: 'Protocol', v: app ? app.protocol : '—', icon: 'swap' },
                  { k: 'IP address', node: <span className="mono">{binding.ipAddress}</span>, icon: 'globe' },
                  { k: 'Action', node: <Pill tone={binding.action === 'Deny' ? 'bad' : 'ok'} dot>{binding.action}</Pill>, icon: 'shield' },
                  { k: 'Status', node: <Pill tone={statusTone(binding.status)} dot>{binding.status}</Pill>, icon: 'power' },
                  { k: 'Created on', v: binding.createdOn, icon: 'calendar' },
                  { k: 'Created by', v: binding.createdBy, icon: 'user' },
                  { k: 'Hits last 7 days', v: num(binding.hits7d), icon: 'activity' },
                  { k: 'Last match', v: binding.lastHit || 'Never matched', icon: 'clock' },
                ]}
              />
            </Card>

            {/* The stored value is one string; what the compiler actually
                matches against is the set of addresses it expands into. The
                range used to be four labelled facts above a stat strip, which
                read as trivia rather than as the list of addresses it is. */}
            <Card title="Address range" sub="Every address the compiler expands the stored value into">
              {range ? (
                <>
                  <div className="t-xs t-mut" style={{ marginBottom: 10 }}>
                    Prefix <span className="mono">/{range.bits}</span> · netmask{' '}
                    <span className="mono">{range.mask}</span> · {num(range.hosts)} usable{' '}
                    {range.hosts === 1 ? 'host' : 'hosts'}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Role</th>
                          <th>Matches a client</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rangeRows(range).map((r) => (
                          <tr key={r.role}>
                            <td className="td-main td-mono">{r.address}</td>
                            <td>{r.role}</td>
                            <td>
                              {r.usable
                                ? <Pill tone="ok" dot>Yes</Pill>
                                : <Pill tone="mut" dot>Reserved</Pill>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <Banner tone="bad">The stored value is not a valid IPv4 address or CIDR range.</Banner>
              )}
            </Card>
          </div>

          <div className="stack">
            <Card title="Identity" sub="The account this binding restricts">
              {user ? (
                <>
                  <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                    <Avatar first={user.firstName} last={user.lastName} size="lg" />
                    <div className="trunc">
                      <div className="t-h3 trunc">{user.username}</div>
                      <div className="t-xs t-mut trunc">{user.email}</div>
                    </div>
                  </div>
                  <KeyValue
                    cols={1}
                    rows={[
                      { k: 'Status', node: <Pill tone={statusTone(user.status)} dot>{user.status}</Pill>, icon: 'power' },
                      { k: 'Department', v: user.department, icon: 'layers' },
                      { k: 'Last sign-in', v: user.lastLogin, icon: 'clock' },
                    ]}
                  />
                  <div className="row" style={{ marginTop: 12 }}>
                    <Button size="sm" iconRight="chevR" onClick={() => onOpen('/iam/users')}>Open in Directory</Button>
                  </div>
                </>
              ) : (
                <EmptyState
                  size="sm"
                  icon="user"
                  title="Identity not resolved"
                  body="The username on this binding does not match a directory identity."
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

