import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { Quota } from '@onetodone/image-compressor-shared'
import { FieldValue, Firestore, type Transaction } from 'firebase-admin/firestore'

import { CallTimer } from '../../common/logging/call-timer.js'
import type { AuthUser } from '../auth/auth-user.js'
import { consumeQuota, currentQuota, readStoredUsage } from './quota.js'

const USERS = 'users'

/** Reads and consumes the daily job quota stored in `users/{uid}`. */
@Injectable()
export class QuotaService {
  constructor(
    private readonly firestore: Firestore,
    private readonly timer: CallTimer,
  ) {}

  async get(user: AuthUser, now = new Date()): Promise<Quota> {
    const snapshot = await this.timer.measure('firestore', 'users.get', () => this.ref(user.uid).get())
    return currentQuota(readStoredUsage(snapshot.data()), user.isAnonymous, now)
  }

  /**
   * Counts one job against today's quota inside the caller's transaction, so the quota and the
   * job status change together. Firestore requires all reads before any write in a transaction,
   * so call this before writing anything else.
   *
   * @throws HttpException 429 when the daily limit is reached
   */
  async consume(tx: Transaction, user: AuthUser, now = new Date()): Promise<Quota> {
    const ref = this.ref(user.uid)
    const snapshot = await tx.get(ref)
    const quota = consumeQuota(readStoredUsage(snapshot.data()), user.isAnonymous, now)
    if (!quota) throw new HttpException('Daily job limit reached', HttpStatus.TOO_MANY_REQUESTS)

    const fields = { dayKey: quota.dayKey, jobsToday: quota.used, isAnonymous: user.isAnonymous }
    if (snapshot.exists) tx.update(ref, fields)
    else tx.set(ref, { ...fields, createdAt: FieldValue.serverTimestamp() })
    return quota
  }

  private ref(uid: string) {
    return this.firestore.collection(USERS).doc(uid)
  }
}
