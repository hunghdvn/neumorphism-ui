import { expect, expectTypeOf, test } from 'vitest';
import { defineComponent } from './define.js';
import { html } from './html.js';
import type { InferProps } from './props.js';

test('defineComponent returns the definition unchanged and infers literal prop types', () => {
  const def = defineComponent({
    tag: 'neu-demo',
    props: {
      size: { type: 'string', default: 'md', values: ['sm', 'md'] },
      on: { type: 'boolean' },
    },
    styles: '',
    template: (p) => html`<b>${p.size}</b>`,
    docs: { summary: 'Demo', events: [], slots: [], parts: [], cssProperties: [] },
  });
  expect(def.tag).toBe('neu-demo');
  expect(def.template({ size: 'sm', on: false }).value).toBe('<b>sm</b>');
  expectTypeOf<InferProps<typeof def.props>>().toEqualTypeOf<{ size: 'sm' | 'md'; on: boolean }>();
});
