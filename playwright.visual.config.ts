import { defineConfig, devices } from '@playwright/test';

// Local override for machines where 4173 is taken; CI keeps the default.
const port = Number(process.env.VISUAL_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'visual.spec.ts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  // threshold 0.02: the default 0.2 let a full token retune and a missing focus ring pass.
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001,
      threshold: 0.02,
    },
  },
  use: {
    baseURL: `http://localhost:${port}`,
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
    url: `http://localhost:${port}/`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
  },
});
