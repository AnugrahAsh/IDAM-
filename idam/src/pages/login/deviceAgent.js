export const AGENT_URL = 'http://127.0.0.1:57231/device-info'
export const AGENT_MISSING = 'IDAM Device Agent is not running in your system'
export const AGENT_ERROR = 'Error Fetching Device Information'
const TIMEOUT_MS = 2500

export const probeDeviceAgent = async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(AGENT_ERROR)
    const body = await res.json()
    const missing = ['deviceId', 'nonce', 'signature', 'publicKey', 'deviceInfo'].filter((k) => !body[k])
    if (missing.length) {
      return { ok: false, reason: `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required` }
    }
    return {
      ok: true,
      deviceId: body.deviceId,
      nonce: body.nonce,
      signature: body.signature,
      publicKey: body.publicKey,
      deviceInfo: body.deviceInfo,
    }
  } catch (err) {
    return { ok: false, reason: err.name === 'AbortError' ? AGENT_MISSING : AGENT_MISSING }
  } finally {
    clearTimeout(timer)
  }
}
