import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { NeuButton, NeuSwitch, NeuTextField } from './index.js';

const h = React.createElement;

test('a switch renders attributes and a declarative shadow root', () => {
  const html = renderToString(h(NeuSwitch, { name: 'notify', defaultChecked: true }, 'Notify'));
  expect(html.startsWith('<neu-switch')).toBe(true);
  expect(html).toMatch(/ checked(="[^"]*")?[ >]/);
  expect(html).toContain('name="notify"');
  expect(html).toContain('<template shadowrootmode="open"><style data-neu-ssr>');
  expect(html).toContain('class="track on"');
  expect(html.endsWith('</template>Notify</neu-switch>')).toBe(true);
});

test('a text field delegates focus and pre-fills its input', () => {
  const html = renderToString(h(NeuTextField, { label: 'Email', defaultValue: 'a@b.co' }));
  expect(html).toContain('shadowrootdelegatesfocus');
  expect(html).toContain('value="a@b.co"');
  expect(html).toContain('>Email</span>');
});

test('a text field escapes a hostile label', () => {
  const html = renderToString(h(NeuTextField, { label: '"><script>x</script>' }));
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>x');
});

test('a button forwards its variant and escapes hostile values', () => {
  const html = renderToString(h(NeuButton, { variant: 'primary', title: '"><script>' }, 'Save'));
  expect(html).toContain('variant="primary"');
  expect(html).not.toContain('"><script>');
});

test('re-exports registerIconLibrary from the elements package', async () => {
  const elements = await import('@neu-ui/elements/icons.js');
  const react = await import('./index.js');
  expect(typeof react.registerIconLibrary).toBe('function');
  expect(react.registerIconLibrary).toBe(elements.registerIconLibrary);
});
