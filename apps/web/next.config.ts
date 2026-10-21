import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'

import type { NextConfig } from 'next'

// The web app shares the repository's root .env with the API and worker, but Next.js only reads
// .env files next to the app. The public variables are passed through `env`, which inlines them
// into the bundle. Variables set in the environment win over the file.
const rootEnvFile = path.resolve(import.meta.dirname, '../../.env')
const fileEnv = existsSync(rootEnvFile) ? parseEnv(readFileSync(rootEnvFile, 'utf8')) : {}
const publicEnv = Object.fromEntries(
  Object.entries({ ...fileEnv, ...process.env }).filter(
    (entry): entry is [string, string] => entry[0].startsWith('NEXT_PUBLIC_') && entry[1] !== undefined,
  ),
)

const config: NextConfig = {
  // Static export served by Firebase Hosting; there is no Next.js server.
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  env: publicEnv,
}

export default config
