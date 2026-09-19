import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import TestResult from '../applications/TestResult'

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 65536, 7)

// A read-only end-user bind against the directory: does this person's password
// authenticate, and does the platform find the record it expects afterwards?
// Distinct from Test connection, which only exercises the service credential.
export const probeAuth = (app, username) => {
  const seed = hash(`${app.name}:${username}`)
  const steps = []
  const push = (label, state, detail, ms) => steps.push({ id: steps.length + 1, label, state, detail, ms })
  const dn = `uid=${username},${app.baseDn}`
  let stopped = false

  if (app.status === 'Failed') {
    push('Reach the directory', 'fail', `${app.url} did not answer. The directory is currently failing.`, 12)
    stopped = true
  } else {
    push('Reach the directory', 'ok', `${app.url} answered in ${app.bindMs} ms.`, app.bindMs || 20)
  }

  if (stopped) push('Bind as the service account', 'skip', 'Not attempted.', 0)
  else push('Bind as the service account', 'ok', `Bound as ${app.bindDn}.`, 18 + (seed % 22))

  const found = seed % 7 !== 0
  if (stopped) push('Locate the entry', 'skip', 'Not attempted.', 0)
  else if (!found) {
    push('Locate the entry', 'fail', `No entry matched uid=${username} below ${app.baseDn}.`, 24 + (seed % 30))
    stopped = true
  } else push('Locate the entry', 'ok', `Matched ${dn}.`, 24 + (seed % 30))

  const accepted = seed % 5 !== 0
  if (stopped) push('Bind as the user', 'skip', 'Not attempted.', 0)
  else if (!accepted) {
    push('Bind as the user', 'fail', 'The directory rejected the credential (invalid credentials, code 49).', 30 + (seed % 40))
    stopped = true
  } else push('Bind as the user', 'ok', 'The directory accepted the credential.', 30 + (seed % 40))

  if (stopped) push('Read mapped attributes', 'skip', 'Not attempted.', 0)
  else push('Read mapped attributes', 'ok', 'uid, mail, givenName and sn returned on the entry.', 12 + (seed % 18))

  const failed = steps.some((s) => s.state === 'fail')
  const at = new Date()
  return {
    ok: !failed,
    level: failed ? 'bad' : 'ok',
    ms: steps.reduce((a, s) => a + s.ms, 0),
    at: `${at.toISOString().slice(11, 19)} UTC`,
    steps,
    summary: failed
      ? 'This identity cannot authenticate against the directory with the details supplied.'
      : `${username} authenticates and the platform can read every mapped attribute on the entry.`,
  }
}

function AuthTestForm({ app }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [probe, setProbe] = useState(null)

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Field label="Username" required span={2} hint={`Bound below ${app.baseDn}.`} htmlFor="auth-user">
          <TextInput
            id="auth-user"
            className="mono"
            value={username}
            placeholder="a.rossi"
            onChange={(e) => { setUsername(e.target.value); setProbe(null) }}
          />
        </Field>
        <Field label="Password" required span={2} hint="Used for this bind only. It is never stored or logged." htmlFor="auth-pw">
          <TextInput
            id="auth-pw"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setProbe(null) }}
          />
        </Field>
      </div>

      <div className="row">
        <Button
          variant="pri"
          icon="play"
          disabled={!username.trim() || !password}
          onClick={() => setProbe(probeAuth(app, username.trim()))}
        >
          Run authentication test
        </Button>
      </div>

      <TestResult
        probe={probe}
        idle="Supply an end-user credential to bind against this directory. The test locates the entry, binds as the user and reads the mapped attributes. Nothing is written."
      />
    </div>
  )
}

export default AuthTestForm
