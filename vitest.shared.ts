import { playwright } from '@vitest/browser-playwright';

type BrowserName = 'chromium' | 'firefox' | 'webkit';
const ALL_BROWSERS: BrowserName[] = ['chromium', 'firefox', 'webkit'];

/** `BROWSERS=chromium,firefox` limits engines for quick local runs; CI always runs all three. */
function selectedBrowsers(): BrowserName[] {
  const raw = process.env.BROWSERS;
  if (!raw) return ALL_BROWSERS;
  const picked = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name): name is BrowserName => (ALL_BROWSERS as string[]).includes(name));
  return picked.length > 0 ? picked : ALL_BROWSERS;
}

/** The `test` block of a Vitest config that runs files in real browsers. */
export function browserTest(options: { include?: string[]; exclude?: string[] } = {}) {
  return {
    include: options.include ?? ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', ...(options.exclude ?? [])],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: selectedBrowsers().map((browser) => ({ browser })),
    },
  };
}
