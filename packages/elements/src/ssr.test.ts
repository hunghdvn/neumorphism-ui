import { afterEach, describe, expect, test } from 'vitest';
import './all.js';
import type { NeuTextField } from './text-field.js';
import { definitions, formDefaultProp, renderDSD } from './ssr.js';

afterEach(() => {
  document.body.innerHTML = '';
});

interface Case {
  tag: string;
  attrs: Record<string, string>;
  light: string;
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
  { tag: 'neu-icon', attrs: { name: 'check', label: 'Done' }, light: '', ref: '.box' },
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
  return `<${c.tag}${attributeText(c.attrs)}>${renderDSD(c.tag, c.attrs)}${c.light}</${c.tag}>`;
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

  test('server-rendered disabled controls look disabled before their definitions run', () => {
    // The same server markup under tag names that are never defined, so nothing upgrades.
    const looks = cases
      .filter((c) => c.tag !== 'neu-icon')
      .map((c) => {
        const markup = ssrMarkup({ ...c, attrs: { ...c.attrs, disabled: '' } });
        const probe = `${c.tag}-not-defined`;
        document.body.setHTMLUnsafe(markup.replaceAll(c.tag, probe));
        const el = document.body.querySelector(probe)!;
        const part = (selector: string) =>
          getComputedStyle(el.shadowRoot!.querySelector(selector)!);
        const look =
          c.tag === 'neu-button'
            ? part('.base').boxShadow
            : part(c.tag === 'neu-switch' ? '.base' : '.control').opacity;
        return [c.tag, getComputedStyle(el).cursor, look];
      });
    expect(looks).toEqual([
      ['neu-button', 'not-allowed', 'none'],
      ['neu-switch', 'not-allowed', '0.55'],
      ['neu-text-field', 'not-allowed', '0.6'],
    ]);
  });

  test('only the text field delegates focus', () => {
    expect(renderDSD('neu-text-field', {})).toContain('shadowrootdelegatesfocus');
    expect(renderDSD('neu-button', {})).not.toContain('shadowrootdelegatesfocus');
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
      'neu-button',
      'neu-icon',
      'neu-switch',
      'neu-text-field',
    ]);
  });

  test('formDefaultProp names the property that holds a form control default', () => {
    expect([...definitions.values()].map((def) => [def.tag, formDefaultProp(def)])).toEqual([
      ['neu-button', undefined],
      ['neu-icon', undefined],
      ['neu-switch', 'defaultChecked'],
      ['neu-text-field', 'defaultValue'],
    ]);
  });
});
