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
const pagePaths = ['', ...componentSlugs.map((slug) => `components/${slug}/`)];

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

test('every internal link resolves', async ({ page, request }) => {
  const found = new Set<string>();
  for (const path of pagePaths) {
    await page.goto(path || './');
    const links = await page
      .locator('a[href^="/neumorphism-ui/"]')
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href') as string));
    for (const link of links) found.add(link);
  }
  const hrefs = [...found];
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});
