import { defaultServerConditions } from 'vite'
import { defineConfig } from 'vitest/config'

// Workspace packages resolve to their TypeScript sources, so tests never depend on a prior build.
// Without the `module` condition, dependencies resolve to the builds Node itself would load: some
// (e.g. the AWS SDK) publish `module` builds with extensionless imports that Node cannot run.
const conditions = ['@onetodone/source', ...defaultServerConditions.filter((condition) => condition !== 'module')]

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['{apps,packages}/*/{src,test}/**/*.test.ts'],
          exclude: ['**/*.int.test.ts', '**/node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['{apps,packages}/*/{src,test}/**/*.int.test.ts'],
          // Files share one set of emulators and clear their data between tests.
          fileParallelism: false,
          env: { METADATA_SERVER_DETECTION: 'none' },
        },
      },
    ],
  },
})
