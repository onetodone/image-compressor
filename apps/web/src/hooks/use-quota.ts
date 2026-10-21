'use client'

import { dailyJobLimit, jobsUsedToday, type Quota, utcDayKey } from '@onetodone/image-compressor-shared'
import type { User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'

import { getFirebase } from '@/lib/firebase'

/**
 * Returns the user's quota for today, updated live from `users/{uid}`, so submits and refunds show
 * up without a reload. `null` until the first snapshot arrives.
 * @param user signed-in user, or `null` while signing in
 */
export function useQuota(user: User | null): Quota | null {
  const [used, setUsed] = useState<{ uid: string; count: number } | null>(null)
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) return
    return onSnapshot(doc(getFirebase().firestore, 'users', uid), (snapshot) => {
      const data = snapshot.data()
      const stored =
        typeof data?.dayKey === 'string' && typeof data.jobsToday === 'number'
          ? { dayKey: data.dayKey, jobsToday: data.jobsToday }
          : undefined
      setUsed({ uid, count: jobsUsedToday(stored, new Date()) })
    })
  }, [uid])

  if (!user || used?.uid !== user.uid) return null
  return { dayKey: utcDayKey(new Date()), used: used.count, limit: dailyJobLimit(user.isAnonymous) }
}
