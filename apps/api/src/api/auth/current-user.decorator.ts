import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

import type { AuthenticatedRequest, AuthUser } from './auth-user.js'

/** Injects the authenticated user into a route handler parameter. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>()
  if (!user) throw new Error('CurrentUser used on a route without authentication')
  return user
})
