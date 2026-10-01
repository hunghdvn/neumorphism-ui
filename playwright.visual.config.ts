import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'visual.spec.ts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 } },
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 900 } },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1000, height: 900 } },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1000, height: 900 } },
    },
  ],
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
