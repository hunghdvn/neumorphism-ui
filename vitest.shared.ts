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

/**
 * Firefox runs its files one at a time. Vitest opens a page per worker, and the workers' pages
 * open while the first ones already run tests; in Firefox every page that opens takes the
 * window focus from the others. The focused element then loses `:focus` and gets a focusout
 * to nowhere, which fails any test that was checking focus at that moment. Chromium and WebKit
 * keep each page focused on its own.
 */
function instance(browser: BrowserName) {
  return browser === 'firefox' ? { browser, fileParallelism: false } : { browser };
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
      instances: selectedBrowsers().map(instance),
    },
  };
}
