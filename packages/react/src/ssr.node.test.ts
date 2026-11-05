import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { NeuButton, NeuOption, NeuSelect, NeuSwitch, NeuTextField } from './index.js';

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

test('NeuSelect renders the label of the NeuOption matching value or defaultValue', () => {
  const options = [
    h(NeuOption, { key: 'f', value: 'free' }, 'Free'),
    h(React.Fragment, { key: 'g' }, [
      h(NeuOption, { key: 'p', value: 'pro' }, 'Pro ', h('b', null, 'plan'), 2),
      h('neu-option', { key: 'l' }, ' Lite  tier '),
    ]),
  ];
  const byDefault = renderToString(
    h(NeuSelect, { defaultValue: 'pro', placeholder: 'Pick' }, ...options),
  );
  expect(byDefault).toContain('data-ref="display">Pro plan2</span>');
  expect(byDefault).not.toContain('>Pick</span>');
  const byValue = renderToString(h(NeuSelect, { value: 'Lite tier' }, ...options));
  expect(byValue).toContain('data-ref="display">Lite tier</span>');
  const none = renderToString(h(NeuSelect, { value: 'nope', placeholder: 'Pick' }, ...options));
  expect(none).toContain('data-ref="display">Pick</span>');
});

test('NeuSelect keeps a no-break space in the option label, as the client does', () => {
  const html = renderToString(h(NeuSelect, { value: 'A  B' }, h(NeuOption, null, 'A  B')));
  expect(html).toContain('data-ref="display">A  B</span>');
});

test('NeuSelect leaves the display empty when its options are unreadable', () => {
  const Custom = () => h(NeuOption, { value: 'x' }, 'X');
  const html = renderToString(h(NeuSelect, { value: 'x', placeholder: 'Pick' }, h(Custom, null)));
  expect(html).toContain('data-ref="display"></span>');
  expect(html).not.toContain('>Pick</span>');
  const empty = renderToString(h(NeuSelect, { placeholder: 'Pick' }, h(Custom, null)));
  expect(empty).toContain('data-ref="display">Pick</span>');
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
  const elements = await import('@neumorphism-ui/elements/icons.js');
  const react = await import('./index.js');
  expect(typeof react.registerIconLibrary).toBe('function');
  expect(react.registerIconLibrary).toBe(elements.registerIconLibrary);
});
