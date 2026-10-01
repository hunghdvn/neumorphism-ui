import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

export type Mode = 'prod' | 'dev';
export type Target = 'next' | 'nuxt';

const browsers = [
  ['chromium', devices['Desktop Chrome']],
  ['firefox', devices['Desktop Firefox']],
  ['webkit', devices['Desktop Safari']],
] as const;

/** One project per browser × framework; the framework is in project.metadata.target. */
export function ssrConfig(mode: Mode): PlaywrightTestConfig {
  const ports: Record<Target, number> =
    mode === 'prod' ? { next: 3100, nuxt: 3200 } : { next: 3101, nuxt: 3201 };
  const servers =
    mode === 'prod'
      ? [
          { command: 'pnpm --filter next-example start', port: ports.next },
          {
            command: 'node .output/server/index.mjs',
            cwd: 'apps/examples/nuxt',
            env: { PORT: String(ports.nuxt) },
            port: ports.nuxt,
          },
        ]
      : [
          { command: 'pnpm --filter next-example dev', port: ports.next },
          { command: 'pnpm --filter nuxt-example dev', port: ports.nuxt },
        ];
  return defineConfig({
    testDir: 'e2e',
    testMatch: 'ssr.spec.ts',
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list']],
    use: { trace: 'retain-on-failure' },
    projects: browsers.flatMap(([browser, device]) =>
      (['next', 'nuxt'] as const).map((target) => ({
        name: `${target}-${mode}-${browser}`,
        metadata: { target, mode },
        use: { ...device, baseURL: `http://localhost:${ports[target]}` },
      })),
    ),
    webServer: servers.map((server) => ({
      ...server,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    })),
  });
}
