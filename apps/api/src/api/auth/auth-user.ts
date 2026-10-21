import type { Request } from 'express'

/** The user behind a request, taken from a verified Firebase ID token. */
export interface AuthUser {
  uid: string
  isAnonymous: boolean
}

export type AuthenticatedRequest = Request & { user?: AuthUser }
