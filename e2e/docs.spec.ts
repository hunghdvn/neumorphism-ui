import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const elementsDir = resolve(import.meta.dirname, '../packages/elements');
const contentDir = resolve(import.meta.dirname, '../apps/docs/src/content/docs');

// Every page of the site, read from the content folder so a new page is covered without a list
// to keep in step. '' is the home page.
const pagePaths = readdirSync(contentDir, { recursive: true })
  .map((file) => String(file).replaceAll('\\', '/'))
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => file.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, ''))
  .map((slug) => (slug ? `${slug}/` : ''))
  .sort();
const componentPaths = pagePaths.filter((path) => path.startsWith('components/'));

interface Declaration {
  tagName: string;
  attributes: { name: string }[];
}

function buttonDeclaration(): Declaration {
  const manifest = JSON.parse(readFileSync(resolve(elementsDir, 'custom-elements.json'), 'utf8'));
  const declarations: Declaration[] = manifest.modules.flatMap(
    (module: { declarations: Declaration[] }) => module.declarations,
  );
  return declarations.find((declaration) => declaration.tagName === 'neu-button') as Declaration;
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${page.url()}: ${message.text()}`);
  });
  return errors;
}

test('the page list covers the home page, the guides and the components', () => {
  expect(pagePaths).toContain('');
  expect(pagePaths).toContain('getting-started/installation/');
  expect(pagePaths).toContain('guides/theming/');
  expect(componentPaths).toContain('components/button/');
  expect(componentPaths).toHaveLength(17);
});

test('the button page lists every attribute of the manifest', async ({ page }) => {
  const expected = buttonDeclaration().attributes.map((attribute) => attribute.name);
  await page.goto('components/button/');
  const table = page.locator('table[data-table="attributes"]');
  const names = await table.locator('tbody tr td:first-child').allTextContents();
  expect([...names].sort()).toEqual([...expected].sort());
});

test('code blocks are not server-rendered', async ({ page }) => {
  await page.goto('components/button/');
  const pre = page.locator('pre').first();
  expect(await pre.innerText()).toContain('<neu-button');
  expect(await pre.innerHTML()).not.toContain('shadowrootmode');
});

test('demos follow the site theme', async ({ page }) => {
  await page.goto('components/button/');
  await page.locator('starlight-theme-select select:visible').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-neu-theme', 'dark');
  const demos = page.locator('.demo');
  expect(await demos.count()).toBeGreaterThan(0);
  for (const demo of await demos.all()) {
    await expect(demo).toHaveCSS('background-color', 'rgb(43, 47, 54)');
  }
});

test('a stored site theme applies before the page scripts run, whatever the OS theme', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('starlight-theme', 'light'));
  // With every script file blocked, only inline scripts run: the theme must not wait for a bundle.
  await page.route('**/*.js', (route) => route.abort());
  await page.goto('components/button/');
  await expect(page.locator('html')).toHaveAttribute('data-neu-theme', 'light');
  await expect(page.locator('.demo').first()).toHaveCSS('background-color', 'rgb(224, 229, 236)');
});

test('the keyboard table follows the docs', async ({ page }) => {
  const { componentDocs } = await import(pathToFileURL(resolve(elementsDir, 'dist/docs.js')).href);
  await page.goto('components/button/');
  const rows = page.locator('table[data-table="keyboard"] tbody tr');
  await expect(rows).toHaveCount(componentDocs.get('neu-button').keyboard.length);
});

test('the home page renders a server-side shadow root without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL,
  });
  const page = await context.newPage();
  await page.goto('./');
  const hasShadowRoot = await page
    .locator('.demo neu-button')
    .first()
    .evaluate((el) => el.shadowRoot !== null);
  expect(hasShadowRoot).toBe(true);
  await context.close();
});

test('every page loads without errors and defines every neu-* element on it', async ({ page }) => {
  const errors = collectErrors(page);
  for (const path of pagePaths) {
    await page.goto(path || './');
    await page.waitForLoadState('networkidle');
    const undefinedTags = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .map((el) => el.localName)
        .filter((tag) => tag.startsWith('neu-') && !customElements.get(tag)),
    );
    expect(undefinedTags, path).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('a page without demos does not load the components', async ({ page }) => {
  await page.goto('guides/react/');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => customElements.get('neu-button'))).toBeUndefined();
});

test('every component page lists its API', async ({ page }) => {
  for (const path of componentPaths) {
    await page.goto(path);
    expect(
      await page.locator('table[data-table="attributes"]').count(),
      path,
    ).toBeGreaterThanOrEqual(1);
  }
});

test('every root-relative link and asset carries the base path and resolves', async ({
  page,
  request,
}) => {
  const found = new Set<string>();
  for (const path of pagePaths) {
    await page.goto(path || './');
    const urls = await page
      .locator('a[href^="/"], link[href^="/"], script[src^="/"], img[src^="/"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node.getAttribute('href') ?? node.getAttribute('src')) as string),
      );
    for (const url of urls) found.add(url.split('#')[0]);
  }
  const urls = [...found];
  expect(urls.length).toBeGreaterThan(0);
  for (const url of urls) {
    expect(url.startsWith('/neumorphism-ui/'), url).toBe(true);
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
  }
});

test('the demo wrappers align their children', async ({ page }) => {
  await page.goto('components/button/');
  const tops = await page
    .locator('.demo')
    .first()
    .locator('neu-button')
    .evaluateAll((buttons) => buttons.slice(0, 3).map((b) => b.getBoundingClientRect().top));
  expect(tops).toHaveLength(3);
  expect(new Set(tops).size, tops.join(', ')).toBe(1);
});

test('the playground controls follow the site theme, not the OS theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await page.locator('starlight-theme-select select:visible').selectOption('light');
  const control = page.locator('[data-playground] neu-slider').first();
  await expect
    .poll(() => control.evaluate((el) => getComputedStyle(el).getPropertyValue('--neu-bg').trim()))
    .toBe('#e0e5ec');
});

test('the playground starts with every variable at its default', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('[data-playground-css]')).toContainText('Nothing changed');
});

test('the playground updates the preview and the CSS', async ({ page }) => {
  await page.goto('./');
  const preview = page.locator('[data-playground-preview]');
  await page.locator('neu-slider[data-var="--neu-distance"]').evaluate((el) => {
    (el as HTMLInputElement).value = '10';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect
    .poll(() =>
      preview.evaluate((el) => getComputedStyle(el).getPropertyValue('--neu-distance').trim()),
    )
    .toBe('10px');
  await expect(page.locator('[data-playground-css]')).toContainText('--neu-distance: 10px;');
});

async function pickColor(page: Page, key: 'bg' | 'accent', value: string): Promise<void> {
  await page.locator(`input[data-color="${key}"]`).evaluate((el, next) => {
    (el as HTMLInputElement).value = next;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test('a colour set back to its default leaves the playground CSS', async ({ page }) => {
  await page.goto('./');
  const output = page.locator('[data-playground-css]');
  await pickColor(page, 'bg', '#ffeedd');
  await expect(output).toContainText('--neu-bg: #ffeedd;');
  await pickColor(page, 'bg', '#e0e5ec');
  await expect(output).toContainText('Nothing changed');
});

test('the playground CSS keeps each theme to where it is active', async ({ page }) => {
  await page.goto('./');
  await pickColor(page, 'bg', '#ffeedd');
  const css = (await page.locator('[data-playground-css]').textContent())!;
  const tokens = readFileSync(
    resolve(import.meta.dirname, '../packages/tokens/src/neu.css'),
    'utf8',
  );
  const bg = (selector: string) =>
    page.evaluate(
      (s) => getComputedStyle(document.querySelector(s)!).getPropertyValue('--neu-bg').trim(),
      selector,
    );

  await page.setContent(
    `<style>${tokens}</style><style>${css}</style><div id="light" data-neu-theme="light"></div><div id="dark" data-neu-theme="dark"></div>`,
  );
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await bg('html')).toBe('#ffeedd');
  expect(await bg('#light')).toBe('#ffeedd');
  expect(await bg('#dark')).toBe('#2b2f36');
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await bg('html')).toBe('#2b2f36');
  expect(await bg('#light')).toBe('#ffeedd');
});

test('the playground dark switch', async ({ page }) => {
  await page.goto('./');
  const preview = page.locator('[data-playground-preview]');
  await page.locator('neu-switch[data-playground-dark]').click();
  await expect(preview).toHaveAttribute('data-neu-theme', 'dark');
});

test('the playground follows a dark switch restored by the browser', async ({ page }) => {
  await page.goto('./');
  // What a reload or back navigation does: restore the state, with no change event.
  await page.locator('neu-switch[data-playground-dark]').evaluate((el) => {
    (el as unknown as { formStateRestoreCallback(state: string): void }).formStateRestoreCallback(
      'checked',
    );
    window.dispatchEvent(new PageTransitionEvent('pageshow'));
  });
  await expect(page.locator('[data-playground-preview]')).toHaveAttribute('data-neu-theme', 'dark');
  await expect(page.locator('input[data-color="bg"]')).toHaveValue('#2b2f36');
});

test('the CDN snippet matches the version and hashes pinned in the README', async ({ page }) => {
  const readme = readFileSync(resolve(import.meta.dirname, '../README.md'), 'utf8');
  const snippet = readme.split(/^### From a CDN\s*$/m)[1].match(/```html\n([\s\S]*?)```/)![1];
  const version = snippet.match(/elements@([^/]+)\/cdn\/neu\.min\.js/)![1];
  const hashes = snippet.match(/sha384-[A-Za-z0-9+/=]+/g)!;
  expect(hashes).toHaveLength(2);
  await page.goto('getting-started/installation/');
  const text = await page.locator('main').innerText();
  expect(text).toContain(`elements@${version}/cdn/neu.min.js`);
  expect(text).toContain(`tokens@${version}/neu.css`);
  for (const hash of hashes) expect(text).toContain(hash);
});
