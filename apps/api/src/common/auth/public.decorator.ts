import { SetMetadata } from '@nestjs/common'

/** Metadata key set by {@link Public}. */
export const IS_PUBLIC_KEY = 'isPublic'

/** Marks a route or controller as reachable without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
