import { PROJECT_ID } from './config.js'

function emulatorUrl(variable: 'FIREBASE_AUTH_EMULATOR_HOST' | 'FIRESTORE_EMULATOR_HOST'): string {
  const host = process.env[variable]
  if (!host) throw new Error(`${variable} is not set; run integration tests with pnpm test:integration`)
  return `http://${host}`
}

async function call(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`${init.method} ${url} failed with ${response.status}: ${await response.text()}`)
  return response.json()
}

async function signUp(body: object): Promise<{ idToken: string; localId: string }> {
  const url = `${emulatorUrl('FIREBASE_AUTH_EMULATOR_HOST')}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test`
  const json = await call(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  })
  return json as { idToken: string; localId: string }
}

/** Creates an anonymous user in the Auth emulator and returns its ID token and uid. */
export async function signInAnonymously(): Promise<{ token: string; uid: string }> {
  const { idToken, localId } = await signUp({})
  return { token: idToken, uid: localId }
}

/** Creates an email/password user in the Auth emulator and returns its ID token and uid. */
export async function signUpWithEmail(): Promise<{ token: string; uid: string }> {
  const { idToken, localId } = await signUp({ email: `${crypto.randomUUID()}@example.com`, password: 'secret123' })
  return { token: idToken, uid: localId }
}

/** Deletes every document in the Firestore emulator. */
export async function clearFirestore(): Promise<void> {
  const url = `${emulatorUrl('FIRESTORE_EMULATOR_HOST')}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  await call(url, { method: 'DELETE' })
}
