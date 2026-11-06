import { expect, expectTypeOf, test } from 'vitest';
import { defineComponent, type OptionData, type TemplateContext } from './define.js';
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
  });
  expect(def.tag).toBe('neu-demo');
  expect(def.template({ size: 'sm', on: false }).value).toBe('<b>sm</b>');
  expectTypeOf<InferProps<typeof def.props>>().toEqualTypeOf<{ size: 'sm' | 'md'; on: boolean }>();
});

test('a template may take a context; the options it carries are typed', () => {
  const def = defineComponent({
    tag: 'neu-demo-pick',
    props: { value: { type: 'string' } },
    optionsFrom: 'neu-demo-item',
    styles: '',
    template: (p, ctx) =>
      html`<b>${ctx?.options?.find((option) => option.value === p.value)?.label ?? '-'}</b>`,
  });
  const options: OptionData[] = [{ value: 'a', label: 'A', disabled: true }];
  expect(def.template({ value: 'a' }, { options }).value).toBe('<b>A</b>');
  expect(def.template({ value: 'a' }).value).toBe('<b>-</b>');
  expect(def.optionsFrom).toBe('neu-demo-item');
  expectTypeOf<TemplateContext['options']>().toEqualTypeOf<readonly OptionData[] | undefined>();
});
