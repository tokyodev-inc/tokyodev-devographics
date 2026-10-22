import { defineConfig } from '@playwright/test'

// Checks a running results site; see tests/results.spec.ts.
// RESULTS_URL defaults to the local Gatsby site (`pnpm tdev` in monorepo/results).
export default defineConfig({
    testDir: './tests',
    timeout: 15 * 60 * 1000,
    workers: 2,
    reporter: [['list']],
    use: {
        baseURL: process.env.RESULTS_URL || 'http://localhost:9001',
        viewport: { width: 1400, height: 1000 }
    }
})
