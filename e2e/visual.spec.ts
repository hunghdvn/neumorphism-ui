import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    [
      'neu-button',
      'neu-switch',
      'neu-text-field',
      'neu-icon',
      'neu-icon-button',
      'neu-button-group',
      'neu-surface',
      'neu-divider',
      'neu-badge',
      'neu-avatar',
      'neu-spinner',
      'neu-textarea',
      'neu-number-field',
      'neu-checkbox',
      'neu-radio-group',
      'neu-radio',
      'neu-slider',
      'neu-select',
      'neu-option',
    ].every((tag) => customElements.get(tag)),
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
  await expect(page.locator('#light neu-button').first()).toBeFocused();
  await expect(page.locator('#light .row').first()).toHaveScreenshot('focus.png');
});

for (const theme of ['light', 'dark', 'custom']) {
  test(`${theme} open select`, async ({ page }) => {
    const select = page.locator(`#${theme} neu-select[label="Filled"]`);
    await select.scrollIntoViewIfNeeded();
    await select.locator('[part="combobox"]').click();
    await expect(select.locator('[part="listbox"]')).toBeVisible();
    await expect(page).toHaveScreenshot(`select-open-${theme}.png`);
    await page.keyboard.press('Escape');
    await expect(select.locator('[part="listbox"]')).toBeHidden();
  });
}
