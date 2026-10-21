import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The app uses the App Router only; this rule looks for a Pages Router directory.
  { rules: { '@next/next/no-html-link-for-pages': 'off' } },
  // globalIgnores replaces eslint-config-next's default ignores, so they are repeated here.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
