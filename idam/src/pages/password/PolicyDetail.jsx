import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { DICTIONARY_WORDS } from '../../data/dictionary'
import { USERS } from '../../data/seed'
import { num, statusTone } from '../../lib/format'
import { useMemo, useState } from 'react'
import { LIST_PATH, entropyBits, expiryLabel, historyFor, seatsFor, strengthBand } from './passwordData'
import StrengthPreview from './StrengthPreview'

export default function PolicyDetail({ policy, onEdit, onDelete, onNavigate }) {
  const [tab, setTab] = useState('rules')
  const covered = useMemo(() => USERS.filter((u) => policy.orgs.includes(u.organization)), [policy.orgs])
  const trail = useMemo(() => historyFor(policy), [policy])
  const bits = entropyBits(policy)
  const band = strengthBand(bits)

  const identityRows = useMemo(() => covered.map((u) => {
    const age = policy.expiryDays === 0 ? (u.id * 13) % 400 : (u.id * 13) % (policy.expiryDays + 20)
    return {
      ...u,
      credentialAge: age,
      expiresIn: policy.expiryDays === 0 ? null : policy.expiryDays - age,
    }
  }), [covered, policy.expiryDays])

  return (
    <>
      <DetailHeader
        backTo={LIST_PATH}
        backLabel="Password Policy"
        eyebrow="Credential policy"
        title={policy.name}
        sub={policy.description}
        media={
          <span className="feed-ic" data-tone={policy.status === 'Active' ? 'acc' : 'mut'} style={{ width: 56, height: 56, borderRadius: 6 }}>
            <Icon name="lock" size={22} />
          </span>
        }
        badges={
          <>
            <Pill tone={statusTone(policy.status)} dot>{policy.status}</Pill>
            <Pill tone={band.tone}>{band.label}</Pill>
            {policy.mfaRequired && <Tag tone="acc">Second factor required</Tag>}
            {policy.expiryDays === 0 && <Tag>Never expires</Tag>}
          </>
        }
        meta={
          <>
            <Fact icon="key" label="Minimum length" value={`${policy.minLength} characters`} />
            <Fact icon="clock" label="Expiry" value={expiryLabel(policy)} />
            <Fact icon="ban" label="Lockout" value={`${policy.lockoutAttempts} attempts / ${policy.lockoutMins} min`} />
            {/* The organizations themselves are listed further down the page,
                so the count here only cost the fifth fact its own line. */}
            <Fact icon="users" label="Identities covered" value={num(policy.users)} />
          </>
        }
        actions={
          <>
            <Button variant="danger" icon="trash" disabled={policy.orgs.length > 0} onClick={() => onDelete(policy)}>Delete</Button>
            <Button variant="pri" icon="edit" onClick={() => onEdit(policy)}>Edit policy</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'rules', label: 'Rules', icon: 'sliders' },
              { id: 'orgs', label: 'Organizations', icon: 'building', count: policy.orgs.length },
              { id: 'identities', label: 'Identities', icon: 'users', count: covered.length },
              { id: 'history', label: 'History', icon: 'history', count: trail.length },
            ]}
          />
        }
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            {policy.orgs.length === 0 && (
              <Banner tone="warn">
                This policy is defined but governs no organization, so it has no effect. Add a mapping in the
                policy mapping register to bring it into force.
              </Banner>
            )}

            {tab === 'rules' && (
              <>
                <Card title="Composition" sub="Evaluated at credential set, change and reset">
                  <KeyValue
                    rows={[
                      { k: 'Minimum length', v: `${policy.minLength} characters`, icon: 'key' },
                      { k: 'Maximum length', v: `${policy.maxLength} characters`, icon: 'key' },
                      { k: 'Upper case required', v: policy.upper > 0 ? `${policy.upper} minimum` : 'Not required', icon: 'tag' },
                      { k: 'Lower case required', v: policy.lower > 0 ? `${policy.lower} minimum` : 'Not required', icon: 'tag' },
                      { k: 'Digits required', v: policy.digits > 0 ? `${policy.digits} minimum` : 'Not required', icon: 'tag' },
                      { k: 'Symbols required', v: policy.special > 0 ? `${policy.special} minimum` : 'Not required', icon: 'bolt' },
                      { k: 'Repeated characters', v: policy.maxRepeat > 0 ? `No more than ${policy.maxRepeat} in a row` : 'Unrestricted', icon: 'copy' },
                      { k: 'Sequential characters', v: policy.noSequential ? 'Rejected' : 'Permitted', icon: 'sort' },
                      { k: 'Username inside the credential', v: policy.noUsername ? 'Rejected' : 'Permitted', icon: 'user' },
                    ]}
                  />
                </Card>

                <Card
                  title="Lifetime and history"
                  sub="How long a credential survives and what it may not be reused as"
                >
                  <KeyValue
                    rows={[
                      { k: 'Expiry', v: expiryLabel(policy), icon: 'clock' },
                      { k: 'History remembered', v: policy.history === 0 ? 'Reuse permitted' : `${policy.history} previous credentials`, icon: 'history' },
                      { k: 'Minimum age', v: policy.minAgeHours === 0 ? 'Change permitted immediately' : `${policy.minAgeHours} hours between changes`, icon: 'clock' },
                      { k: 'Expiry warning', v: policy.warnDays === 0 ? 'No warning issued' : `${policy.warnDays} days before expiry`, icon: 'bell' },
                      { k: 'Grace sign-ins', v: policy.graceLogins === 0 ? 'None' : `${policy.graceLogins} after expiry`, icon: 'unlock' },
                      { k: 'Self-service reset', v: policy.selfService ? 'Permitted with a second factor' : 'Service desk only', icon: 'refresh' },
                    ]}
                  />
                </Card>

                <Card title="Lockout" sub="What happens after repeated failures">
                  <KeyValue
                    rows={[
                      { k: 'Threshold', v: `${policy.lockoutAttempts} failed attempts`, icon: 'ban' },
                      { k: 'Lockout window', v: `${policy.lockoutMins} minutes`, icon: 'lock' },
                      { k: 'Release', v: policy.lockoutReset, icon: 'unlock' },
                      { k: 'Second factor', v: policy.mfaRequired ? 'Required for every identity covered' : 'Optional', icon: 'device' },
                    ]}
                  />
                </Card>

                <Card
                  title="Content checks"
                  sub="Shared lists applied on top of the composition rules"
                  actions={<Button size="sm" iconRight="chevR" onClick={() => onNavigate('/iam/passwordPolicy/dictionary')}>Password dictionary</Button>}
                >
                  <div className="feed-it">
                    <span className="feed-ic" data-tone={policy.dictionary ? 'ok' : 'mut'}>
                      <Icon name="file" size={13} />
                    </span>
                    <div className="feed-m">
                      <div className="feed-t"><b>Password dictionary</b></div>
                      <div className="feed-s">
                        <span>
                          {policy.dictionary
                            ? `Enforced. ${DICTIONARY_WORDS.length} forbidden terms are matched as substrings, case insensitively, after character substitutions are resolved.`
                            : 'Not enforced. Credentials may contain breach-corpus and keyboard-pattern terms.'}
                        </span>
                      </div>
                    </div>
                    <span style={{ alignSelf: 'center' }}>
                      <Pill tone={policy.dictionary ? 'ok' : 'mut'} dot>{policy.dictionary ? 'Enforced' : 'Off'}</Pill>
                    </span>
                  </div>
                  <div className="feed-it">
                    <span className="feed-ic" data-tone={policy.noUsername ? 'ok' : 'mut'}>
                      <Icon name="user" size={13} />
                    </span>
                    <div className="feed-m">
                      <div className="feed-t"><b>Identity attributes</b></div>
                      <div className="feed-s">
                        <span>
                          {policy.noUsername
                            ? 'Username, email local part, first name and last name are refused inside a credential.'
                            : 'Identity attributes are not checked against the credential.'}
                        </span>
                      </div>
                    </div>
                    <span style={{ alignSelf: 'center' }}>
                      <Pill tone={policy.noUsername ? 'ok' : 'mut'} dot>{policy.noUsername ? 'Enforced' : 'Off'}</Pill>
                    </span>
                  </div>
                </Card>
              </>
            )}

            {tab === 'orgs' && (
              <Card
                title="Assigned organizations"
                sub="An organization is governed by exactly one password policy"
                actions={<Pill tone={policy.orgs.length > 0 ? 'ok' : 'warn'} dot>{policy.orgs.length} assigned</Pill>}
                footer={
                  <>
                    <Icon name="info" size={12} />
                    <span>Changes take effect at the next credential change for each identity.</span>
                    <span className="spacer" />
                    <Button size="sm" icon="building" onClick={() => onNavigate(`${LIST_PATH}/mappings`)}>Policy mappings</Button>
                  </>
                }
              >
                <Banner tone="info">
                  Assignment is made in the policy mapping register, where a policy can be bound to a whole
                  organization or narrowed to one application or a branch of a directory.
                </Banner>

                <div style={{ marginTop: 14 }}>
                  {policy.orgs.length === 0 ? (
                    <EmptyState
                      size="sm"
                      icon="building"
                      title="No organization assigned"
                      body="Until a mapping names this policy, the organizations it would cover stay on the platform default."
                    />
                  ) : policy.orgs.map((o) => (
                    <div key={o} className="row-between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--hair)' }}>
                      <span className="row" style={{ gap: 10 }}>
                        <Icon name="building" size={13} style={{ color: 'var(--accent)' }} />
                        <span className="t-sm">{o}</span>
                        <span className="t-xs t-mut">{num(seatsFor([o]))} identities</span>
                      </span>
                      <Tag tone="acc">Governed</Tag>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === 'identities' && (
              <div className="section">
                <div className="section-head">
                  <span className="section-title">Identities covered</span>
                  <span className="section-sub">
                    Directory identities in the organizations this policy governs. Credential age is measured from the
                    last successful change.
                  </span>
                </div>
                {identityRows.length === 0 ? (
                  <EmptyState
                    icon="users"
                    title="No identities covered"
                    body="Bind this policy to an organization in the policy mapping register to bring identities into scope."
                  />
                ) : (
                  <DataWorkbench
                    id={`password-policy-identities-${policy.id}`}
                    rows={identityRows}
                    pageSize={10}
                    searchPlaceholder="Search covered identities…"
                    onRowClick={() => onNavigate('/iam/users')}
                    columns={[
                      {
                        key: 'username', label: 'Username', locked: true, cls: 'td-main',
                        render: (u) => (
                          <span className="cell-id">
                            <Avatar first={u.firstName} last={u.lastName} size="sm" />
                            <span className="trunc">
                              <span style={{ display: 'block' }}>{u.username}</span>
                              <span className="cell-sub">{u.email}</span>
                            </span>
                          </span>
                        ),
                      },
                      { key: 'organization', label: 'Organization' },
                      { key: 'department', label: 'Department' },
                      { key: 'status', label: 'Status', render: (u) => <Pill tone={statusTone(u.status)} dot>{u.status}</Pill> },
                      { key: 'credentialAge', label: 'Credential age', align: 'right', render: (u) => <span className="num">{u.credentialAge} d</span> },
                      {
                        key: 'expiresIn', label: 'Expires in', align: 'right',
                        render: (u) => (u.expiresIn == null
                          ? <span className="t-mut">Never</span>
                          : <span className="num" style={{ color: u.expiresIn <= 0 ? 'var(--bad)' : u.expiresIn <= policy.warnDays ? 'var(--warn-core)' : undefined }}>
                            {u.expiresIn <= 0 ? 'Expired' : `${u.expiresIn} d`}
                          </span>),
                      },
                    ]}
                    emptyTitle="No identities match"
                    emptyBody="Adjust the search."
                    emptyIcon="users"
                  />
                )}
              </div>
            )}

            {tab === 'history' && (
              <Card title="Change history" sub="Every recorded version of this policy">
                <div className="tl">
                  {trail.map((e) => (
                    <div className="tl-it" key={e.id} data-tone={e.tone}>
                      <span className="tl-dot"><Icon name={e.icon} size={8} stroke={3} /></span>
                      <div className="tl-t">{e.title}</div>
                      <div className="tl-s">{e.sub}</div>
                      <div className="tl-time">{e.ts}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="stack">
            <StrengthPreview rules={policy} />

            <Card title="Coverage" sub="Where this policy is in force">
              <div className="stat-strip">
                <div className="stat-cell">
                  <span className="stat-k"><Icon name="building" size={12} />Organizations</span>
                  <span className="stat-v">{policy.orgs.length}</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-k"><Icon name="users" size={12} />Identities</span>
                  <span className="stat-v">{num(policy.users)}</span>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                {policy.orgs.length === 0 ? (
                  <EmptyState size="sm" icon="building" title="Unassigned" body="This policy governs no organization." />
                ) : (
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {policy.orgs.map((o) => <Tag key={o} tone="acc">{o}</Tag>)}
                  </div>
                )}
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <Button size="sm" icon="building" onClick={() => setTab('orgs')}>Assigned organizations</Button>
              </div>
            </Card>

            <Card title="Second factor" sub="Interaction with the authentication policy">
              <Banner tone={policy.mfaRequired ? 'ok' : 'warn'}>
                {policy.mfaRequired
                  ? 'Every identity covered by this policy must hold a second factor. Self-service reset is gated behind that factor.'
                  : 'A second factor is optional under this policy, so a stolen credential is sufficient to authenticate.'}
              </Banner>
              <div className="row" style={{ marginTop: 12 }}>
                <Button size="sm" iconRight="chevR" onClick={() => onNavigate('/iam/mfa')}>Authentication policy</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

