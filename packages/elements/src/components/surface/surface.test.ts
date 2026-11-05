import { afterEach, describe, expect, test } from 'vitest';
import '../../button.js';
import { NeuSurface } from '../../surface.js';
import { axeViolations, internalsOf, mount } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const base = (el: Element) => el.shadowRoot!.querySelector('.base') as HTMLElement;
const style = (el: Element) => getComputedStyle(base(el));
const surface = (attrs = '') => mount<NeuSurface>(`<neu-surface${attrs}>Content</neu-surface>`);

describe('neu-surface', () => {
  test('defaults, reflection and invalid values', () => {
    const el = surface();
    expect(el).toBeInstanceOf(NeuSurface);
    expect([el.shape, el.elevation, el.radius, el.padding]).toEqual(['raised', 'md', 'md', 'md']);
    el.shape = 'inset';
    el.elevation = 'lg';
    el.radius = 'full';
    el.padding = 'none';
    expect(el.getAttribute('shape')).toBe('inset');
    expect(el.getAttribute('elevation')).toBe('lg');
    expect(el.getAttribute('radius')).toBe('full');
    expect(el.getAttribute('padding')).toBe('none');
    const bad = surface(' shape="x" elevation="x" radius="x" padding="x"');
    expect([bad.shape, bad.elevation, bad.radius, bad.padding]).toEqual([
      'raised',
      'md',
      'md',
      'md',
    ]);
  });

  test('exposes the documented parts and has no role', async () => {
    const el = surface();
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')].map((p) => p.getAttribute('part'));
    expect(parts).toEqual(['base']);
    expect(internalsOf(el).role).toBeFalsy();
    expect(await axeViolations(el)).toEqual([]);
  });

  test('is a block that is not hidden before it is defined', () => {
    expect(getComputedStyle(surface()).display).toBe('block');
  });

  test('shape, elevation, radius and padding map to the documented values', () => {
    const el = surface();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const r = 12;
    expect(style(el).paddingTop).toBe(`${1.25 * rem}px`);
    expect(style(el).borderTopLeftRadius).toBe(`${r}px`);
    expect(style(el).backgroundImage).toBe('none');
    expect(style(el).boxShadow).not.toContain('inset');

    el.padding = 'none';
    expect(style(el).paddingTop).toBe('0px');
    el.padding = 'sm';
    expect(style(el).paddingTop).toBe(`${0.75 * rem}px`);
    el.padding = 'lg';
    expect(style(el).paddingTop).toBe(`${2 * rem}px`);

    el.radius = 'sm';
    expect(style(el).borderTopLeftRadius).toBe(`${r * 0.5}px`);
    el.radius = 'lg';
    expect(style(el).borderTopLeftRadius).toBe(`${r * 2}px`);
    el.radius = 'full';
    expect(style(el).borderTopLeftRadius).toBe('999px');

    el.shape = 'inset';
    expect(style(el).boxShadow).toContain('inset');
    expect(style(el).backgroundImage).toBe('none');
    el.shape = 'flat';
    expect(style(el).boxShadow).toBe('none');
    expect(style(el).backgroundImage).toBe('none');
    el.shape = 'convex';
    expect(style(el).backgroundImage).toContain('linear-gradient');
    expect(style(el).boxShadow).not.toContain('inset');
    const convex = style(el).backgroundImage;
    el.shape = 'concave';
    expect(style(el).backgroundImage).toContain('linear-gradient');
    expect(style(el).backgroundImage).not.toBe(convex);
    expect(style(el).boxShadow).not.toContain('inset');
  });

  test('elevation scales the shadow: sm < md < lg, for raised and inset', () => {
    const blur = (el: NeuSurface) => {
      const m = style(el).boxShadow.match(/(-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px/)!;
      return [parseFloat(m[1]!), parseFloat(m[3]!)];
    };
    const el = surface();
    el.elevation = 'sm';
    expect(blur(el)).toEqual([3, 6]);
    el.elevation = 'md';
    expect(blur(el)).toEqual([6, 12]);
    el.elevation = 'lg';
    expect(blur(el)).toEqual([12, 24]);
    el.shape = 'inset';
    expect(blur(el)).toEqual([12, 24]);
    el.elevation = 'sm';
    expect(blur(el)).toEqual([3, 6]);
  });

  test('a background set on the surface reaches nested components', () => {
    const host = mount(
      '<div><neu-button id="out">a</neu-button><neu-surface style="--neu-bg:#f5d0d8"><neu-button id="in">b</neu-button></neu-surface></div>',
    );
    const shadow = (id: string) =>
      getComputedStyle(
        host.querySelector(`#${id}`)!.shadowRoot!.querySelector('.base') as HTMLElement,
      ).boxShadow;
    expect(shadow('in')).not.toBe(shadow('out'));
    expect(style(host.querySelector('neu-surface')!).backgroundColor).toBe('rgb(245, 208, 216)');
  });
});
