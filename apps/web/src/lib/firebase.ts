import { type FirebaseApp, initializeApp } from 'firebase/app'
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, type Firestore, getFirestore } from 'firebase/firestore'

import { env } from './env'

/** Firebase services used by the browser. */
export interface FirebaseClients {
  app: FirebaseApp
  auth: Auth
  firestore: Firestore
}

// Emulator addresses from infra/firebase.json.
const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099'
const FIRESTORE_EMULATOR = { host: '127.0.0.1', port: 8080 }

let clients: FirebaseClients | undefined

/**
 * Returns the Firebase app, Auth and Firestore, initializing them on first use. Call it from effects
 * and event handlers only, so nothing connects while the static export is prerendered.
 */
export function getFirebase(): FirebaseClients {
  if (clients) return clients
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    ...(env.NEXT_PUBLIC_FIREBASE_APP_ID ? { appId: env.NEXT_PUBLIC_FIREBASE_APP_ID } : {}),
  })
  const auth = getAuth(app)
  const firestore = getFirestore(app)
  if (env.NEXT_PUBLIC_USE_EMULATORS) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true })
    connectFirestoreEmulator(firestore, FIRESTORE_EMULATOR.host, FIRESTORE_EMULATOR.port)
  }
  clients = { app, auth, firestore }
  return clients
}
