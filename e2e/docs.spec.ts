import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const elementsDir = resolve(import.meta.dirname, '../packages/elements');

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
  const demos = page.locator('.demo');
  expect(await demos.count()).toBeGreaterThan(0);
  for (const demo of await demos.all()) {
    await expect(demo).toHaveAttribute('data-neu-theme', 'dark');
    await expect(demo).toHaveCSS('background-color', 'rgb(43, 47, 54)');
  }
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

test('pages load without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

const componentSlugs = [
  'button',
  'icon-button',
  'button-group',
  'switch',
  'text-field',
  'icon',
  'surface',
  'divider',
  'badge',
  'avatar',
  'spinner',
  'textarea',
  'number-field',
  'checkbox',
  'radio-group',
  'slider',
  'select',
];

// The home page plus every docs page; later tasks extend this list.
const pagePaths = [
  '',
  'getting-started/installation/',
  'guides/theming/',
  'guides/ssr/',
  'guides/react/',
  'guides/forms/',
  ...componentSlugs.map((slug) => `components/${slug}/`),
];

test('every guide page loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${page.url()}: ${message.text()}`);
  });
  for (const path of pagePaths.filter((p) => p.startsWith('guides/'))) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(errors).toEqual([]);
});

test('every component page loads without errors and lists its API', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${page.url()}: ${message.text()}`);
  });
  for (const slug of componentSlugs) {
    await page.goto(`components/${slug}/`);
    await page.waitForLoadState('networkidle');
    expect(
      await page.locator('table[data-table="attributes"]').count(),
      slug,
    ).toBeGreaterThanOrEqual(1);
  }
  expect(errors).toEqual([]);
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

test('the playground dark switch', async ({ page }) => {
  await page.goto('./');
  const preview = page.locator('[data-playground-preview]');
  await page.locator('neu-switch[data-playground-dark]').click();
  await expect(preview).toHaveAttribute('data-neu-theme', 'dark');
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
