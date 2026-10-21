'use client'

import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'

import { getFirebase } from '@/lib/firebase'

/** The signed-in Firebase user, or why no session could be started. */
export interface AuthState {
  user: User | null
  error: string | null
}

/** Returns the current Firebase user and signs in anonymously when there is none. */
export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, error: null })

  useEffect(() => {
    const { auth } = getFirebase()
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        setState({ user, error: null })
        return
      }
      signInAnonymously(auth).catch(() =>
        setState({ user: null, error: 'Could not start a session. Reload the page.' }),
      )
    })
  }, [])

  return state
}
