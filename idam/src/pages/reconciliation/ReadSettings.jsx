import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { AUTH_METHODS, HTTP_METHODS } from './trustModel'

// ---------------------------------------------------------------------------
// Read settings for an HTTP trust source.
//
// The connector facet says where the source is and how to authenticate to it.
// It does not say how to walk a paged JSON response, because a provisioning
// connector writes single records and never has to. Reconciliation reads whole
// populations, so the token call and the two response paths stay beside the
// connector rather than being folded into it.
// ---------------------------------------------------------------------------

// A JSON textarea that says so when the content will not parse, rather than
// failing silently at run time.
export function JsonField({ id, label, hint, value, onChange, placeholder }) {
  const trimmed = String(value || '').trim()
  let error = ''
  if (trimmed) {
    try { JSON.parse(trimmed) } catch { error = 'This is not valid JSON.' }
  }
  return (
    <Field label={label} span={2} hint={hint} error={error || undefined} htmlFor={id}>
      <TextInput id={id} as="textarea" rows={3} className="mono" value={value} placeholder={placeholder} onChange={onChange} />
    </Field>
  )
}

export function jsonIssues(d = {}) {
  const out = []
  const check = (key, label) => {
    const raw = String(d[key] || '').trim()
    if (!raw) return
    try { JSON.parse(raw) } catch { out.push(`${label} is not valid JSON.`) }
  }
  check('get_token_api_headers', 'Get token API headers')
  check('get_token_api_payload', 'Get token API payload')
  check('users_data_api_headers', 'Get users API headers')
  check('users_data_api_payload', 'Get users API payload')
  if (!String(d.listPath || '').trim()) {
    out.push('A response list path is required, or the run cannot find the users in the response.')
  }
  return out
}

export default function ReadSettings({ value, onChange, idPrefix = 'ts' }) {
  const d = value || {}
  return (
    <>
      <Card title="Get token" sub="The call that acquires a token, when the users call needs one">
        <div className="grid grid-2">
          <Field label="HTTP method" htmlFor={`${idPrefix}-tm`}>
            <Select id={`${idPrefix}-tm`} value={d.get_token_api_http_method} options={HTTP_METHODS} onChange={(e) => onChange({ get_token_api_http_method: e.target.value })} />
          </Field>
          <Field label="Auth type" htmlFor={`${idPrefix}-ta`}>
            <Select id={`${idPrefix}-ta`} value={d.get_token_api_auth_method} options={AUTH_METHODS} onChange={(e) => onChange({ get_token_api_auth_method: e.target.value })} />
          </Field>
          <Field label="Get token API URL" span={2} hint="Left blank, the connector's own credential is used as it stands." htmlFor={`${idPrefix}-turl`}>
            <TextInput id={`${idPrefix}-turl`} className="mono" value={d.get_token_api_url} placeholder="https://hr.example.com/oauth/token" onChange={(e) => onChange({ get_token_api_url: e.target.value })} />
          </Field>
          <JsonField
            id={`${idPrefix}-thead`}
            label="Get token API headers (JSON)"
            hint="Sent with the token request."
            value={d.get_token_api_headers}
            placeholder={'{ "Content-Type": "application/json" }'}
            onChange={(e) => onChange({ get_token_api_headers: e.target.value })}
          />
          <JsonField
            id={`${idPrefix}-tpay`}
            label="Get token API payload (JSON)"
            value={d.get_token_api_payload}
            placeholder={'{ "clientId": "…", "clientSecret": "…" }'}
            onChange={(e) => onChange({ get_token_api_payload: e.target.value })}
          />
        </div>
      </Card>

      <Card title="Get users" sub="How the user records are requested, and where they sit in the response">
        <div className="grid grid-2">
          <Field label="HTTP method" htmlFor={`${idPrefix}-um`}>
            <Select id={`${idPrefix}-um`} value={d.users_data_api_http_method} options={HTTP_METHODS} onChange={(e) => onChange({ users_data_api_http_method: e.target.value })} />
          </Field>
          <Field label="Auth type" htmlFor={`${idPrefix}-ua`}>
            <Select id={`${idPrefix}-ua`} value={d.users_data_api_auth_method} options={AUTH_METHODS} onChange={(e) => onChange({ users_data_api_auth_method: e.target.value })} />
          </Field>
          <JsonField
            id={`${idPrefix}-uhead`}
            label="Get users API headers (JSON)"
            value={d.users_data_api_headers}
            placeholder={'{ "Accept": "application/json" }'}
            onChange={(e) => onChange({ users_data_api_headers: e.target.value })}
          />
          <JsonField
            id={`${idPrefix}-upay`}
            label="Get users API payload (JSON)"
            value={d.users_data_api_payload}
            placeholder={'{ "page": 1, "size": 200 }'}
            onChange={(e) => onChange({ users_data_api_payload: e.target.value })}
          />
          <Field label="Response list path" required hint="Where the array of users sits in the response, for example data.items." htmlFor={`${idPrefix}-lp`}>
            <TextInput id={`${idPrefix}-lp`} className="mono" value={d.listPath} placeholder="data.items" onChange={(e) => onChange({ listPath: e.target.value })} />
          </Field>
          <Field label="Record path" hint="Optional path into a single record, when it is nested." htmlFor={`${idPrefix}-dp`}>
            <TextInput id={`${idPrefix}-dp`} className="mono" value={d.detailPath} placeholder="attributes" onChange={(e) => onChange({ detailPath: e.target.value })} />
          </Field>
        </div>
      </Card>
    </>
  )
}
