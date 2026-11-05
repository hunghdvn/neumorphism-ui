import { afterEach, describe, expect, test } from 'vitest';
import { NeuDivider } from '../../divider.js';
import { axeViolations, internalsOf, mount } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const base = (el: Element) => el.shadowRoot!.querySelector('.base') as HTMLElement;
const divider = (attrs = '') => mount<NeuDivider>(`<neu-divider${attrs}></neu-divider>`);

describe('neu-divider', () => {
  test('defaults, reflection and invalid values', () => {
    const el = divider();
    expect(el).toBeInstanceOf(NeuDivider);
    expect(el.orientation).toBe('horizontal');
    el.orientation = 'vertical';
    expect(el.getAttribute('orientation')).toBe('vertical');
    expect(divider(' orientation="diagonal"').orientation).toBe('horizontal');
  });

  test('is a separator with the matching orientation, and exposes the base part', async () => {
    const el = divider();
    expect(internalsOf(el).role).toBe('separator');
    expect(internalsOf(el).ariaOrientation).toBe('horizontal');
    el.orientation = 'vertical';
    expect(internalsOf(el).ariaOrientation).toBe('vertical');
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')];
    expect(parts.map((p) => p.getAttribute('part'))).toEqual(['base']);
    expect(await axeViolations(el)).toEqual([]);
  });

  test('a horizontal divider is a block that engraves a 2px line', () => {
    const el = divider();
    expect(getComputedStyle(el).display).toBe('block');
    expect(base(el).getBoundingClientRect().height).toBe(2);
  });

  test('a vertical divider in inline text still shows a line about 1em tall', () => {
    const p = mount<HTMLElement>(
      '<p style="font-size:16px">Home <neu-divider orientation="vertical"></neu-divider> About</p>',
    );
    const rect = base(p.querySelector('neu-divider')!).getBoundingClientRect();
    expect(rect.height).toBeGreaterThanOrEqual(16);
    expect(rect.height).toBeLessThan(40);
    expect(rect.width).toBe(2);
  });

  test('a vertical divider is as tall as its sibling in a flex row', () => {
    const row = mount<HTMLElement>(
      '<div style="display:flex"><span style="display:block;height:40px">x</span><neu-divider orientation="vertical"></neu-divider></div>',
    );
    const el = row.querySelector('neu-divider') as NeuDivider;
    expect(base(el).getBoundingClientRect().height).toBe(40);
    expect(base(el).getBoundingClientRect().width).toBe(2);
  });
});
