import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm, SkeletonKeyValue, SkeletonList,
  SkeletonText,
} from '../../components/primitives/Skeleton'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { MFA_METHODS } from '../../data/seed'
import { num, pct } from '../../lib/format'
import { useEffect, useMemo, useState } from 'react'
import { useLoading } from '../../lib/useLoading'
import { BASE_PATH, DIRECTORY, STRENGTH, dayStr, providerHealth, providerSeries, validateProvider } from './authData'
import Control from './Control'
import DeliveryHealth, { DeliveryHealthSkeleton } from './DeliveryHealth'
import TestResult from './TestResult'

/* The panel under the tab bar, while the record settles. Each tab is a
   different shape, so each has its own: a field grid the size of the groups
   the provider actually carries, the health readout's three cards, or the
   three entries of the change log. */
function PanelSkeleton({ provider, tab }) {
  if (tab === 'health') return <DeliveryHealthSkeleton />
  if (tab === 'history') {
    return <SkeletonCard><SkeletonList rows={3} media="square" trailing={false} /></SkeletonCard>
  }
  return (
    <>
      {provider.groups.map((g) => (
        <SkeletonCard key={g.label}>
          <SkeletonForm fields={g.fields.length} cols={2} actions={false} />
        </SkeletonCard>
      ))}
    </>
  )
}

export default function ProviderPage({ provider, values, enabled, factorEnabled, onChange, onToggle, onTest, result, onSave, onCancel, dirty }) {
  const [tab, setTab] = useState('config')
  /* One flag for the page, keyed on the tab: the record settles on arrival and
     again when the panel under the tab bar changes, which is the round trip a
     real deployment would make. */
  const loading = useLoading(tab)
  /* The masthead is drawn once. A tab change settles the panel below it, but
     the crumbs, the title and the tab bar are the chrome the operator has just
     clicked on — blanking those would take away the control they used and put
     it back a moment later. So the header is only held on the first arrival. */
  const [arrived, setArrived] = useState(false)
  useEffect(() => { if (!loading) setArrived(true) }, [loading])

  const health = providerHealth(provider)
  const series = useMemo(() => providerSeries(provider), [provider])
  const method = MFA_METHODS.find((m) => m.id === provider.factor)
  const problem = validateProvider(provider, values)

  /* First arrival: the masthead, the panel and the side column are one thing
     landing, so they are held together and released together. */
  if (loading && !arrived) {
    return (
      <Skeleton label={`Loading the ${provider.name.toLowerCase()} provider`}>
        <SkeletonDetailHeader facts={5} actions={2} />
        <div className="detail-body">
          <div className="detail-cols">
            <div className="stack"><PanelSkeleton provider={provider} tab={tab} /></div>
            <div className="stack">
              <SkeletonCard><SkeletonText lines={4} /></SkeletonCard>
              <SkeletonCard><SkeletonKeyValue rows={3} cols={1} /></SkeletonCard>
            </div>
          </div>
        </div>
      </Skeleton>
    )
  }

  return (
    <>
      <DetailHeader
        backTo={`${BASE_PATH}/providers`}
        backLabel="Providers"
        eyebrow="Authentication provider"
        title={provider.name}
        sub={`${provider.vendor} over ${provider.protocol}. Configuration applies to every enrollment and every challenge issued for this factor.`}
        media={
          <span className="feed-ic" data-tone={enabled ? 'acc' : 'mut'} style={{ width: 56, height: 56, borderRadius: 6 }}>
            <Icon name={provider.icon} size={22} />
          </span>
        }
        badges={
          <>
            <Pill tone={enabled ? 'ok' : 'mut'} dot>{enabled ? 'Enabled' : 'Disabled'}</Pill>
            <Pill tone={problem ? 'bad' : 'ok'} dot>{problem ? 'Configuration invalid' : 'Configuration valid'}</Pill>
            <Tag>{provider.hosting}</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="swap" label="Protocol" value={provider.protocol} />
            <Fact icon="globe" label="Endpoint" value={<span className="mono t-xs">{provider.endpoint}</span>} />
            <Fact icon="server" label="Region" value={provider.region} />
            <Fact icon="users" label="Enrolled" value={num(method ? method.enrolled : 0)} />
            <Fact icon="activity" label="Success rate" value={pct(health.successRate, 2)} />
          </>
        }
        actions={
          <>
            <Button icon="bolt" onClick={onTest}>Test Connection</Button>
            <Button icon={enabled ? 'ban' : 'checkC'} onClick={() => onToggle(!enabled)}>
              {enabled ? 'Disable factor' : 'Enable factor'}
            </Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'config', label: 'Configuration', icon: 'sliders' },
              { id: 'health', label: 'Delivery health', icon: 'activity' },
              { id: 'history', label: 'Change history', icon: 'history' },
            ]}
          />
        }
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            {problem && (
              <Banner tone="bad">
                <b>{problem.field}.</b> {problem.message}
              </Banner>
            )}

            {/* The tab bar above is chrome and stays; what settles is the
                panel it switches. One announcing region for the swap — the
                shapes inside it are decoration. */}
            {loading && (
              <Skeleton label={`Loading ${provider.name.toLowerCase()}`}>
                <div className="stack"><PanelSkeleton provider={provider} tab={tab} /></div>
              </Skeleton>
            )}

            {!loading && tab === 'config' && provider.groups.map((g) => (
              <Card key={g.label} title={g.label} sub={`Applies to every ${provider.name.toLowerCase()} enrollment and challenge`}>
                <div className="grid grid-2">
                  {g.fields.map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      required={f.required}
                      hint={f.hint}
                      span={f.span}
                      htmlFor={`page-${provider.id}-${f.key}`}
                    >
                      <Control
                        f={{ ...f, id: `page-${provider.id}-${f.key}` }}
                        value={values[f.key]}
                        onChange={(v) => onChange(f.key, v)}
                      />
                    </Field>
                  ))}
                </div>
              </Card>
            ))}

            {/* Delivery health used to be one card of six figures about this
                provider alone, which left "is any factor failing" answerable
                only by opening every provider page in turn. It is now the same
                readout Email and SMS Management give: this provider expanded,
                every other one an accordion under it. */}
            {!loading && tab === 'health' && (
              <DeliveryHealth
                provider={provider}
                enabled={enabled}
                factorEnabled={factorEnabled}
                onTest={onTest}
              />
            )}

            {!loading && tab === 'history' && (
              <Card title="Change history" sub="Every recorded change to this provider configuration">
                <div className="tl">
                  <div className="tl-it" data-tone="acc">
                    <span className="tl-dot"><Icon name="plus" size={8} stroke={3} /></span>
                    <div className="tl-t">Provider registered</div>
                    <div className="tl-s">{provider.vendor} was registered as the {provider.name.toLowerCase()} provider.</div>
                    <div className="tl-time">{dayStr(220)} · SHUBHAM_JAIN</div>
                  </div>
                  <div className="tl-it" data-tone="ok">
                    <span className="tl-dot"><Icon name="check" size={8} stroke={3} /></span>
                    <div className="tl-t">Connection verified</div>
                    <div className="tl-s">The probe sequence completed against {provider.endpoint}.</div>
                    <div className="tl-time">{health.lastTest} · VANSH_MAKHIJA</div>
                  </div>
                  <div className="tl-it" data-tone={enabled ? 'ok' : 'warn'}>
                    <span className="tl-dot"><Icon name={enabled ? 'checkC' : 'ban'} size={8} stroke={3} /></span>
                    <div className="tl-t">{enabled ? 'Factor enabled for enrollment' : 'Factor withdrawn from enrollment'}</div>
                    <div className="tl-s">
                      {enabled
                        ? 'The factor is offered at enrollment and accepted at challenge across every SSO application.'
                        : 'No new enrollment is offered and existing credentials for this factor are not accepted.'}
                    </div>
                    <div className="tl-time">{dayStr(34)} · PRIYA_NAIR</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="stack">
            <Card title="Connection test" sub="Runs against the values currently in the form">
              <Button variant="pri" icon="bolt" onClick={onTest}>Test Connection</Button>
              <div className="t-micro t-mut" style={{ margin: '16px 0 6px' }}>Probe sequence</div>
              {provider.probe.map((step, i) => (
                <div className="feed-it" key={step}>
                  <span className="feed-ic" data-tone="mut">{i + 1}</span>
                  <div className="feed-m"><div className="feed-t">{step}</div></div>
                </div>
              ))}
              <TestResult result={result} />
            </Card>

            <Card title="Adoption" sub="Directory coverage for this factor">
              {method ? (
                <>
                  <div className="row" style={{ gap: 10 }}>
                    <span style={{ flex: 1 }}>
                      <Meter value={(method.enrolled / DIRECTORY) * 100} tone={STRENGTH[method.strength].tone} />
                    </span>
                    <span className="t-xs num" style={{ fontWeight: 600 }}>{pct((method.enrolled / DIRECTORY) * 100)}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <KeyValue
                      cols={1}
                      rows={[
                        { k: 'Identities enrolled', v: num(method.enrolled), icon: 'users' },
                        { k: 'Assurance', v: STRENGTH[method.strength].label, icon: 'shield' },
                        { k: 'Description', v: method.sub, icon: 'info' },
                      ]}
                    />
                  </div>
                </>
              ) : (
                <EmptyState size="sm" icon="shield" title="No adoption data" body="This provider is not mapped to an enrollment factor." />
              )}
            </Card>
          </div>
        </div>
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved provider configuration' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!!problem} onClick={onSave}>Save changes</Button>
      </StickyActions>
    </>
  )
}

