import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import web from './apps/web/eslint.config.mjs'

export default defineConfig([
  globalIgnores(['**/dist/', '**/coverage/', 'apps/web/.next/', 'apps/web/out/']),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    ignores: ['apps/web/**'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  // eslint-config-next resolves from apps/web, the only workspace that depends on it.
  { basePath: 'apps/web', extends: [web] },
  prettier,
])
