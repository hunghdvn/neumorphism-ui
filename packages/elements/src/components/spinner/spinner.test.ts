import { afterEach, describe, expect, test } from 'vitest';
import { NeuSpinner } from '../../spinner.js';
import { axeViolations, internalsOf, mount } from '../../test-utils/helpers.js';
import { spinnerDef } from './spinner.def.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const part = (el: Element, name: string) => el.shadowRoot!.querySelector(`.${name}`) as HTMLElement;
const spinner = (attrs = '') => mount<NeuSpinner>(`<neu-spinner${attrs}></neu-spinner>`);

describe('neu-spinner', () => {
  test('defaults, reflection and invalid values', () => {
    const el = spinner();
    expect(el).toBeInstanceOf(NeuSpinner);
    expect([el.label, el.size]).toEqual(['Loading', 'md']);
    el.size = 'lg';
    expect(el.getAttribute('size')).toBe('lg');
    expect(spinner(' size="huge"').size).toBe('md');
    expect(spinner(' label="Saving"').label).toBe('Saving');
  });

  test('an empty label survives a copy of the markup instead of turning back into "Loading"', () => {
    const el = spinner();
    el.label = '';
    expect(el.getAttribute('label')).toBe('');
    const copy = el.cloneNode() as NeuSpinner;
    document.body.append(copy);
    expect(copy.label).toBe('');
    expect(internalsOf(copy).ariaLabel).toBeNull();
  });

  test('is a status named by its label, and exposes the documented parts', async () => {
    const el = spinner();
    expect(internalsOf(el).role).toBe('status');
    expect(internalsOf(el).ariaLabel).toBe('Loading');
    el.label = 'Saving';
    expect(internalsOf(el).ariaLabel).toBe('Saving');
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')];
    expect(parts.map((p) => p.getAttribute('part'))).toEqual(['base', 'track', 'indicator']);
    expect(await axeViolations(el)).toEqual([]);
  });

  test('the live region has the label as visually hidden text to announce', () => {
    const el = spinner(' label="Saving"');
    const text = part(el, 'label');
    expect(text.textContent).toBe('Saving');
    el.label = 'Uploading';
    expect(text.textContent).toBe('Uploading');
    const rect = text.getBoundingClientRect();
    expect(rect.width).toBeLessThanOrEqual(1);
    expect(rect.height).toBeLessThanOrEqual(1);
    expect(getComputedStyle(text).clipPath).toBe('inset(50%)');
    expect(el.getBoundingClientRect().width).toBe(24);
  });

  test('the three sizes are 1rem, 1.5rem and 2.25rem', () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const el = spinner();
    const width = () => el.getBoundingClientRect().width;
    el.size = 'sm';
    expect(width()).toBe(rem);
    el.size = 'md';
    expect(width()).toBe(1.5 * rem);
    el.size = 'lg';
    expect(width()).toBe(2.25 * rem);
    expect(part(el, 'base').getBoundingClientRect().height).toBe(2.25 * rem);
  });

  test('the indicator spins and the track is an inset ring', () => {
    const el = spinner();
    const indicator = getComputedStyle(part(el, 'indicator'));
    expect(indicator.animationName).not.toBe('none');
    expect(indicator.animationName).toBe('neu-spinner-rotate');
    expect(getComputedStyle(part(el, 'track')).boxShadow).toContain('inset');
  });

  test('reduced motion slows the spin down instead of stopping it', () => {
    expect(spinnerDef.styles).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{[^}]*animation-duration: 2\.7s/,
    );
  });
});
