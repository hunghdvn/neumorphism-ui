import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.DOCS_PORT ?? 4322);

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'docs.spec.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', baseURL: `http://localhost:${port}/neumorphism-ui/` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm --filter docs preview --port ${port}`,
    url: `http://localhost:${port}/neumorphism-ui/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
