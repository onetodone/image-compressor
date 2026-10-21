import { defaultServerConditions } from 'vite'
import { defineConfig } from 'vitest/config'

// Workspace packages resolve to their TypeScript sources, so tests never depend on a prior build.
const conditions = ['@onetodone/source', ...defaultServerConditions]

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
        },
      },
    ],
  },
})
