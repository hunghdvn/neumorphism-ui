import { afterEach, describe, expect, test } from 'vitest';
import './all.js';
import type { NeuTextField } from './text-field.js';
import { definitions, formDefaultProp, renderDSD, type TemplateContext } from './ssr.js';

afterEach(() => {
  document.body.innerHTML = '';
});

interface Case {
  tag: string;
  attrs: Record<string, string>;
  light: string;
  /** What the server read from the light DOM (the options of a select); the client reads it itself. */
  ctx?: TemplateContext;
  /** Selector of a node inside the shadow root that must survive hydration. */
  ref: string;
}

const cases: Case[] = [
  { tag: 'neu-button', attrs: { variant: 'primary' }, light: 'Save', ref: '.base' },
  { tag: 'neu-switch', attrs: { checked: '', name: 'n' }, light: 'Notify', ref: '.track' },
  {
    tag: 'neu-text-field',
    attrs: { label: 'Email', value: 'a@b.co', 'help-text': 'Work email' },
    light: '',
    ref: 'input',
  },
  {
    tag: 'neu-textarea',
    attrs: { label: 'Notes', value: '\nA', rows: '4', 'help-text': 'Anything' },
    light: '',
    ref: 'textarea',
  },
  {
    tag: 'neu-number-field',
    attrs: { label: 'Qty', value: '3', min: '0', max: '9', 'help-text': 'Whole units' },
    light: '',
    ref: 'input',
  },
  {
    tag: 'neu-button-group',
    attrs: { label: 'Align', orientation: 'vertical' },
    light: '<neu-button>A</neu-button><neu-button>B</neu-button>',
    ref: '.base',
  },
  {
    tag: 'neu-surface',
    attrs: { shape: 'inset', elevation: 'lg', radius: 'full', padding: 'sm' },
    light: '<p>Inside</p>',
    ref: '.base',
  },
  { tag: 'neu-badge', attrs: { variant: 'success', pill: '' }, light: 'New', ref: '.base' },
  { tag: 'neu-divider', attrs: { orientation: 'vertical' }, light: '', ref: '.base' },
  { tag: 'neu-icon', attrs: { name: 'check', label: 'Done' }, light: '', ref: '.box' },
  { tag: 'neu-icon-button', attrs: { icon: 'x', label: 'Close' }, light: '', ref: '.icon' },
  {
    tag: 'neu-avatar',
    attrs: {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      initials: 'HD',
      label: 'Hung',
      size: 'lg',
    },
    light: '',
    ref: '.image',
  },
  { tag: 'neu-spinner', attrs: { label: 'Saving', size: 'lg' }, light: '', ref: '.indicator' },
  {
    tag: 'neu-checkbox',
    attrs: { checked: '', name: 'n' },
    light: 'Agree',
    ref: '.control',
  },
  {
    tag: 'neu-radio-group',
    attrs: { label: 'Plan', name: 'plan', value: 'b', orientation: 'horizontal' },
    light: '<neu-radio value="a">A</neu-radio><neu-radio value="b">B</neu-radio>',
    ref: '.items',
  },
  { tag: 'neu-radio', attrs: { value: 'a' }, light: 'Option A', ref: '.control' },
  {
    tag: 'neu-slider',
    attrs: { value: '30', min: '0', max: '200', step: '5', name: 'n', label: 'Volume' },
    light: '',
    ref: '.track',
  },
  {
    tag: 'neu-select',
    attrs: { label: 'Plan', value: 'b' },
    light: '<neu-option value="a">Alpha</neu-option><neu-option value="b">Beta</neu-option>',
    ctx: {
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
    },
    ref: '.combobox',
  },
  { tag: 'neu-option', attrs: { value: 'a' }, light: 'Alpha', ref: 'slot' },
];

function attributeText(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${value}"`))
    .join('');
}

/** Parses SSR markup in a document without custom element definitions, so nothing upgrades yet. */
function parseDetached(markup: string): Element {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.setHTMLUnsafe(markup);
  return doc.body.firstElementChild!;
}

function ssrMarkup(c: Case): string {
  return `<${c.tag}${attributeText(c.attrs)}>${renderDSD(c.tag, c.attrs, c.ctx)}${c.light}</${c.tag}>`;
}

describe('SSR parity', () => {
  for (const c of cases) {
    test(`${c.tag}: hydration keeps the server-rendered nodes and matches a fresh render`, () => {
      const el = parseDetached(ssrMarkup(c));
      const node = el.shadowRoot!.querySelector(c.ref);
      expect(node).not.toBeNull();
      document.body.append(document.adoptNode(el));
      expect(el.shadowRoot!.querySelector(c.ref)).toBe(node);
      expect(el.shadowRoot!.querySelector('style[data-neu-ssr]')).toBeNull();

      const fresh = document.createElement(c.tag);
      for (const [name, value] of Object.entries(c.attrs)) fresh.setAttribute(name, value);
      fresh.innerHTML = c.light;
      document.body.append(fresh);
      expect(el.shadowRoot!.innerHTML).toBe(fresh.shadowRoot!.innerHTML);
    });
  }

  test('text typed into an SSR input before JS ran survives hydration and later default changes', () => {
    const c = cases[2]!;
    const el = parseDetached(ssrMarkup(c));
    el.shadowRoot!.querySelector('input')!.value = 'typed early';
    document.body.append(document.adoptNode(el));
    const field = el as NeuTextField;
    expect(field.value).toBe('typed early');
    field.setAttribute('value', 'new default');
    expect(field.value).toBe('typed early');
  });

  /** Where a disabled control shows it: the node to read and the style that changes. */
  const lookOf: Record<
    string,
    ['.base' | '.control' | '.items' | '.combobox', 'boxShadow' | 'opacity']
  > = {
    'neu-button': ['.base', 'boxShadow'],
    'neu-icon-button': ['.base', 'boxShadow'],
    'neu-switch': ['.base', 'opacity'],
    'neu-checkbox': ['.base', 'opacity'],
    'neu-text-field': ['.control', 'opacity'],
    'neu-textarea': ['.control', 'opacity'],
    'neu-number-field': ['.control', 'opacity'],
    'neu-radio-group': ['.items', 'opacity'],
    'neu-radio': ['.base', 'opacity'],
    'neu-slider': ['.base', 'opacity'],
    'neu-select': ['.combobox', 'opacity'],
  };

  test('server-rendered disabled controls look disabled before their definitions run', () => {
    // The same server markup under tag names that are never defined, so nothing upgrades.
    // neu-option is left out: it is data for its select and never rendered, disabled or not.
    const looks = cases
      .filter((c) => 'disabled' in definitions.get(c.tag)!.props && c.tag !== 'neu-option')
      .map((c) => {
        const markup = ssrMarkup({ ...c, attrs: { ...c.attrs, disabled: '' } });
        const probe = `${c.tag}-not-defined`;
        document.body.setHTMLUnsafe(markup.replaceAll(c.tag, probe));
        const el = document.body.querySelector(probe)!;
        const part = (selector: string) =>
          getComputedStyle(el.shadowRoot!.querySelector(selector)!);
        const [selector, property] = lookOf[c.tag]!;
        const look = part(selector)[property];
        return [c.tag, getComputedStyle(el).cursor, look];
      });
    expect(looks).toEqual([
      ['neu-button', 'not-allowed', 'none'],
      ['neu-switch', 'not-allowed', '0.55'],
      ['neu-text-field', 'not-allowed', '0.6'],
      ['neu-textarea', 'not-allowed', '0.6'],
      ['neu-number-field', 'not-allowed', '0.6'],
      ['neu-icon-button', 'not-allowed', 'none'],
      ['neu-checkbox', 'not-allowed', '0.55'],
      ['neu-radio-group', 'not-allowed', '0.55'],
      ['neu-radio', 'not-allowed', '0.55'],
      ['neu-slider', 'not-allowed', '0.55'],
      ['neu-select', 'not-allowed', '0.6'],
    ]);
  });

  test('only the field controls delegate focus', () => {
    expect(renderDSD('neu-text-field', {})).toContain('shadowrootdelegatesfocus');
    expect(renderDSD('neu-textarea', {})).toContain('shadowrootdelegatesfocus');
    expect(renderDSD('neu-number-field', {})).toContain('shadowrootdelegatesfocus');
    expect(renderDSD('neu-select', {})).toContain('shadowrootdelegatesfocus');
    expect(renderDSD('neu-button', {})).not.toContain('shadowrootdelegatesfocus');
    expect(renderDSD('neu-option', {})).not.toContain('shadowrootdelegatesfocus');
  });

  test('a select with a value and no readable options renders an empty display, not the placeholder', () => {
    const attrs = { value: 'b', placeholder: 'Pick' };
    const unread = renderDSD('neu-select', attrs, { options: [] });
    expect(unread).toContain('class="display" data-ref="display"></span>');
    expect(unread).not.toContain('Pick');
    const noValue = renderDSD('neu-select', { placeholder: 'Pick' }, { options: [] });
    expect(noValue).toContain('class="display placeholder" data-ref="display">Pick</span>');
    // Readable options without a match keep the placeholder, as the client does.
    const miss = renderDSD('neu-select', attrs, { options: [{ value: 'a', label: 'Alpha' }] });
    expect(miss).toContain('>Pick</span>');
  });

  test('a template context reaches the template: the select shows the matching option label', () => {
    const options = [{ value: 'b', label: 'Beta' }];
    expect(renderDSD('neu-select', { value: 'b' }, { options })).toContain('>Beta</span>');
    expect(renderDSD('neu-select', { value: 'b' })).not.toContain('Beta');
    // Components without options ignore a context.
    expect(renderDSD('neu-button', {}, { options })).toBe(renderDSD('neu-button', {}));
  });

  test('attribute values are escaped in SSR output', () => {
    const out = renderDSD('neu-text-field', {
      label: '<img src=x onerror=alert(1)>',
      placeholder: '" onfocus="x',
    });
    expect(out).not.toContain('<img');
    expect(out).not.toContain('" onfocus="');
    expect(out).toContain('&lt;img');
    expect(out).toContain('&quot;');
  });

  test('unknown tags render nothing, including Object.prototype keys', () => {
    expect(renderDSD('neu-nope', {})).toBe('');
    expect(renderDSD('constructor', {})).toBe('');
  });

  test('definitions lists the registered tags', () => {
    expect([...definitions.keys()].sort()).toEqual([
      'neu-avatar',
      'neu-badge',
      'neu-button',
      'neu-button-group',
      'neu-checkbox',
      'neu-divider',
      'neu-icon',
      'neu-icon-button',
      'neu-number-field',
      'neu-option',
      'neu-radio',
      'neu-radio-group',
      'neu-select',
      'neu-slider',
      'neu-spinner',
      'neu-surface',
      'neu-switch',
      'neu-text-field',
      'neu-textarea',
    ]);
  });

  test('formDefaultProp names the property that holds a form control default', () => {
    expect([...definitions.values()].map((def) => [def.tag, formDefaultProp(def)])).toEqual([
      ['neu-avatar', undefined],
      ['neu-badge', undefined],
      ['neu-button', undefined],
      ['neu-button-group', undefined],
      ['neu-checkbox', 'defaultChecked'],
      ['neu-divider', undefined],
      ['neu-icon', undefined],
      ['neu-icon-button', undefined],
      ['neu-number-field', 'defaultValue'],
      ['neu-option', undefined],
      ['neu-radio', undefined],
      ['neu-radio-group', 'defaultValue'],
      ['neu-select', 'defaultValue'],
      ['neu-slider', 'defaultValue'],
      ['neu-spinner', undefined],
      ['neu-surface', undefined],
      ['neu-switch', 'defaultChecked'],
      ['neu-text-field', 'defaultValue'],
      ['neu-textarea', 'defaultValue'],
    ]);
  });
});
