import { expect, test } from '@playwright/test';

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

test('every internal link resolves', async ({ page, request }) => {
  await page.goto('./');
  const hrefs = await page
    .locator('a[href^="/neumorphism-ui/"]')
    .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href') as string))]);
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});
