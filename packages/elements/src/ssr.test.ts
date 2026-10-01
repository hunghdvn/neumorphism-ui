import { afterEach, describe, expect, test } from 'vitest';
import './all.js';
import type { NeuTextField } from './text-field.js';
import { definitions, renderDSD } from './ssr.js';

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
  });

  test('unknown tags render nothing, including Object.prototype keys', () => {
    expect(renderDSD('neu-nope', {})).toBe('');
    expect(renderDSD('constructor', {})).toBe('');
  });

  test('definitions lists the phase-1 tags', () => {
    expect([...definitions.keys()].sort()).toEqual(['neu-button', 'neu-switch', 'neu-text-field']);
  });
});
