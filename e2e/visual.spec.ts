import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    ['neu-button', 'neu-switch', 'neu-text-field'].every((tag) => customElements.get(tag)),
  );
  await page.evaluate(() => document.fonts.ready);
  // Put every "invalid" field into the user-invalid state the way a user would.
  for (const field of await page.locator('neu-text-field[data-state="invalid"]').all()) {
    await field.click();
    await page.keyboard.type('x');
    await page.keyboard.press('Tab');
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
});

for (const theme of ['light', 'dark', 'custom']) {
  test(`${theme} theme`, async ({ page }) => {
    await expect(page.locator(`#${theme}`)).toHaveScreenshot(`${theme}.png`);
  });
}

test('keyboard focus ring', async ({ page }) => {
  // beforeEach leaves sequential focus navigation after the last field on the page, where Tab
  // leaves the document in Chromium and Firefox. Start again from the top of a fresh page.
  await page.reload();
  await page.waitForFunction(() => customElements.get('neu-button'));
  await page.keyboard.press('Tab');
  await expect(page.locator('#light .row').first()).toHaveScreenshot('focus.png');
});
