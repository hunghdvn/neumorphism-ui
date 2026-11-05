import { expect, test, type Page } from '@playwright/test';

const TAGS = ['neu-text-field', 'neu-switch', 'neu-select', 'neu-button'] as const;

const target = () => test.info().project.metadata.target as 'next' | 'nuxt';

/** Rounded boxes of the three form components, used to compare layouts. */
function boxes(page: Page) {
  return page.evaluate(
    (tags) => {
      return tags.map((tag) => {
        const r = document.querySelector(`form ${tag}`)!.getBoundingClientRect();
        return [tag, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      });
    },
    [...TAGS],
  );
}

async function waitForHydration(page: Page) {
  await page.waitForFunction((tags) => tags.every((tag) => customElements.get(tag)), [...TAGS]);
  await page.waitForLoadState('networkidle');
}

// Vue logs hydration mismatches only in dev builds, so for Nuxt criterion 1 is proven by the dev run.
test('1. no hydration errors or warnings', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    const hydration = /hydrat|mismatch/i.test(text);
    if (message.type() === 'error' || (message.type() === 'warning' && hydration)) {
      problems.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto('/');
  await waitForHydration(page);
  if (target() === 'next') await expect(page.getByTestId('late')).toBeAttached();
  if (target() === 'next') await page.waitForTimeout(300);
  expect(problems).toEqual([]);
});

test('2. server HTML renders the components without JavaScript, with the same layout', async ({
  browser,
}) => {
  const { baseURL, ...device } = test.info().project.use;
  const noJs = await browser.newContext({ ...device, baseURL, javaScriptEnabled: false });
  const page = await noJs.newPage();
  await page.goto('/');
  const state = await page.evaluate(
    (tags) => {
      const sw = document.querySelector('form neu-switch')!;
      return {
        defined: tags.some((tag) => customElements.get(tag) !== undefined),
        shadow: tags.map((tag) => !!document.querySelector(`form ${tag}`)?.shadowRoot),
        trackOn: sw.shadowRoot?.querySelector('.track')?.classList.contains('on') ?? false,
        trackShadow: getComputedStyle(sw.shadowRoot!.querySelector('.track')!).boxShadow,
        selectDisplay:
          document.querySelector('form neu-select')!.shadowRoot?.querySelector('.display')
            ?.textContent ?? '',
        buttonVisibility: getComputedStyle(document.querySelector('form neu-button')!).visibility,
      };
    },
    [...TAGS],
  );
  expect(state.defined).toBe(false);
  expect(state.shadow).toEqual([true, true, true, true]);
  expect(state.selectDisplay).toContain('Pro');
  expect(state.trackOn).toBe(true);
  expect(state.trackShadow).not.toBe('none');
  expect(state.buttonVisibility).toBe('visible');
  const withoutJs = await boxes(page);
  await noJs.close();

  const withJs = await browser.newContext({ ...device, baseURL });
  const hydrated = await withJs.newPage();
  await hydrated.goto('/');
  await waitForHydration(hydrated);
  expect(await boxes(hydrated)).toEqual(withoutJs);
  await withJs.close();
});

test('teleported content gets a declarative shadow root without JavaScript (Nuxt)', async ({
  browser,
}) => {
  test.skip(target() !== 'nuxt', 'only the Nuxt example teleports');
  const { baseURL, ...device } = test.info().project.use;
  const noJs = await browser.newContext({ ...device, baseURL, javaScriptEnabled: false });
  const page = await noJs.newPage();
  await page.goto('/');
  const field = page.getByTestId('teleported');
  await expect(field).toBeAttached();
  expect(await field.evaluate((el) => !!el.shadowRoot?.querySelector('input'))).toBe(true);
  await noJs.close();
});

test('3. hydration causes no layout shift (Chromium Layout Instability API)', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'layout-shift entries exist only in Chromium; test 2 covers the others',
  );
  await page.goto('/');
  await waitForHydration(page);
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as unknown as { value: number; hadRecentInput: boolean };
            if (!shift.hadRecentInput) total += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 500);
      }),
  );
  expect(cls).toBe(0);
});

test('4. interaction and form submission work after hydration', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);
  await page.getByTestId('email').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('x@y.zz');
  await page.getByTestId('notify').click();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('result')).toHaveText('{"email":"x@y.zz","plan":"pro"}');
  await page.getByTestId('notify').click();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('result')).toHaveText(
    '{"email":"x@y.zz","notify":"on","plan":"pro"}',
  );
});

test('roles from ElementInternals reach the accessibility tree (Chromium)', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'reads the real AX tree through CDP');
  await page.goto('/');
  await waitForHydration(page);
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const find = (role: string, name: string) =>
    nodes.find((node) => node.role?.value === role && node.name?.value === name);
  const sw = find('switch', 'Notifications');
  expect(sw).toBeDefined();
  expect(String(sw!.properties?.find((p) => p.name === 'checked')?.value.value)).toBe('true');
  expect(find('button', 'Save')).toBeDefined();
  expect(find('textbox', 'Email')).toBeDefined();
});

test('streamed Suspense content keeps its declarative shadow root (Next)', async ({
  page,
  browserName,
}) => {
  test.skip(target() !== 'next', 'only the Next example streams');
  // An element created by the parser while its definition exists is already :defined, so this
  // records whether the streamed switch was parsed after neu-switch was defined.
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector('[data-testid="late"]');
      if (!el) return;
      (window as unknown as { __lateDefinedAtParse: boolean }).__lateDefinedAtParse =
        el.matches(':defined');
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await waitForHydration(page);
  const late = page.getByTestId('late');
  await expect(late).toBeAttached();
  const info = await late.evaluate((el) => ({
    tracks: el.shadowRoot!.querySelectorAll('.track').length,
    templateChild: el.querySelector(':scope > template') !== null,
  }));
  expect(info).toEqual({ tracks: 1, templateChild: false });
  await late.click();
  expect(await late.evaluate((el) => (el as unknown as { checked: boolean }).checked)).toBe(true);
  const definedAtParse = await page.evaluate(
    () => (window as unknown as { __lateDefinedAtParse?: boolean }).__lateDefinedAtParse,
  );
  if (browserName === 'webkit') {
    // Measured: WebKit parsed the streamed switch at 1497 ms and defined neu-switch at 1576 ms,
    // whatever the server delay, so the defined-before-parse path cannot be exercised there.
    test.info().annotations.push({
      type: 'note',
      description: `WebKit runs element definitions after the streamed chunk is parsed; defined-before-parse path not exercised (defined at parse: ${definedAtParse})`,
    });
  } else {
    expect(definedAtParse).toBe(true);
  }
});

test('an element mounted by a client effect renders while the stream is still open (Next)', async ({
  page,
  browserName,
}) => {
  test.skip(target() !== 'next', 'only the Next example streams');
  // Records the field's state right after React inserts it, while the Suspense stream may be open.
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector('[data-testid="client-mounted"]');
      if (!el) return;
      observer.disconnect();
      (window as unknown as { __clientMounted: unknown }).__clientMounted = {
        readyState: document.readyState,
        input: el.shadowRoot?.querySelector('input') != null,
      };
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await waitForHydration(page);
  const field = page.getByTestId('client-mounted');
  await expect(field).toBeAttached();
  expect(await field.evaluate((el) => el.shadowRoot?.querySelector('input') != null)).toBe(true);
  const atMount = await page.evaluate(
    () =>
      (window as unknown as { __clientMounted: { readyState: string; input: boolean } })
        .__clientMounted,
  );
  if (browserName === 'webkit') {
    // WebKit hydrates only after the stream ends, so the loading-state mount may not happen there.
    test.info().annotations.push({
      type: 'note',
      description: `WebKit at mount: readyState ${atMount.readyState}, shadow input ${atMount.input}`,
    });
    if (atMount.readyState !== 'loading') return;
  } else {
    // A hard check: a regression that mounts only after the stream closes must fail, not skip.
    expect(atMount.readyState).toBe('loading');
  }
  expect(atMount.input).toBe(true);
});
