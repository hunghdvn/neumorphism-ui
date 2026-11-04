import { afterEach, describe, expect, test } from 'vitest';
import tokens from '../../../../tokens/src/neu.css?inline';
import { NeuBadge } from '../../badge.js';
import { axeViolations, internalsOf, mount } from '../../test-utils/helpers.js';
import { badgeDef } from './badge.def.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const base = (el: Element) => el.shadowRoot!.querySelector('.base') as HTMLElement;
const color = (el: Element) => getComputedStyle(base(el)).color;
const badge = (attrs = '') => mount<NeuBadge>(`<neu-badge${attrs}>New</neu-badge>`);

/** Resolves a colour string to the browser's computed rgb() form. */
function rgb(value: string): string {
  const probe = document.createElement('i');
  probe.style.color = value;
  document.body.append(probe);
  const out = getComputedStyle(probe).color;
  probe.remove();
  return out;
}

describe('neu-badge', () => {
  test('defaults, reflection and invalid values', () => {
    const el = badge();
    expect(el).toBeInstanceOf(NeuBadge);
    expect(el.variant).toBe('neutral');
    expect(el.pill).toBe(false);
    el.variant = 'danger';
    el.pill = true;
    expect(el.getAttribute('variant')).toBe('danger');
    expect(el.hasAttribute('pill')).toBe(true);
    expect(badge(' variant="loud"').variant).toBe('neutral');
  });

  test('exposes the base part, has no role and passes axe', async () => {
    const el = badge();
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')];
    expect(parts.map((p) => p.getAttribute('part'))).toEqual(['base']);
    expect(internalsOf(el).role).toBeFalsy();
    expect(await axeViolations(el)).toEqual([]);
  });

  test('every variant has its own text colour that matches its token', () => {
    const el = badge();
    const colors = new Map<string, string>();
    for (const variant of ['neutral', 'accent', 'success', 'warning', 'danger'] as const) {
      el.variant = variant;
      colors.set(variant, color(el));
    }
    expect(new Set(colors.values()).size).toBe(5);
    expect(colors.get('accent')).toBe(rgb('#6d5dfc'));
    expect(colors.get('success')).toBe(rgb('#3bb273'));
    expect(colors.get('warning')).toBe(rgb('#e6a23c'));
    expect(colors.get('danger')).toBe(rgb('#e5484d'));
  });

  test('pill makes the badge fully round', () => {
    const el = badge();
    expect(getComputedStyle(base(el)).borderTopLeftRadius).toBe('6px');
    el.pill = true;
    expect(getComputedStyle(base(el)).borderTopLeftRadius).toBe('999px');
  });

  test.each(['--neu-success', '--neu-warning'])(
    'the %s fallback equals the tokens default',
    (name) => {
      const tokenValue = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim();
      const fallback = new RegExp(`var\\(${name},\\s*([^)]+)\\)`)
        .exec(badgeDef.styles)?.[1]
        ?.trim();
      expect(tokenValue).toBeDefined();
      expect(fallback).toBe(tokenValue);
    },
  );
});
