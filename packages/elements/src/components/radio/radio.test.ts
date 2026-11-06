import { afterEach, describe, expect, test } from 'vitest';
import { NeuRadio } from '../../radio.js';
import '../../radio-group.js';
import { axeViolations, internalsOf, mount, tick } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('neu-radio', () => {
  test('defaults: not checked, value "on" like a native radio, not disabled; role radio and aria-checked false', () => {
    const el = mount<NeuRadio>('<neu-radio>One</neu-radio>');
    expect([el.checked, el.value, el.disabled]).toEqual([false, 'on', false]);
    expect(el.hasAttribute('value')).toBe(false);
    expect(internalsOf(el).role).toBe('radio');
    expect(internalsOf(el).ariaChecked).toBe('false');
    expect(el.matches(':state(checked)')).toBe(false);
  });

  test('reflection: value and disabled reflect', () => {
    const el = mount<NeuRadio>('<neu-radio>One</neu-radio>');
    el.value = 'v';
    el.disabled = true;
    expect([el.getAttribute('value'), el.getAttribute('disabled')]).toEqual(['v', '']);
    el.setAttribute('value', 'w');
    expect(el.value).toBe('w');
  });

  test('checked is read-only and follows the group', async () => {
    const group = mount<HTMLElement>(
      '<neu-radio-group value="b"><neu-radio value="a">A</neu-radio><neu-radio value="b">B</neu-radio></neu-radio-group>',
    );
    await tick();
    const [a, b] = [...group.querySelectorAll<NeuRadio>('neu-radio')];
    expect(() => {
      (a as { checked: boolean }).checked = true;
    }).toThrow();
    expect([a!.checked, b!.checked]).toEqual([false, true]);
    expect(internalsOf(b!).ariaChecked).toBe('true');
    expect(b!.matches(':state(checked)')).toBe(true);
    expect(getComputedStyle(b!.shadowRoot!.querySelector('.indicator')!).transform).not.toBe(
      getComputedStyle(a!.shadowRoot!.querySelector('.indicator')!).transform,
    );
  });

  test('disabled: aria-disabled, no tabindex, no events; the look is dimmed', async () => {
    const el = mount<NeuRadio>('<neu-radio disabled>One</neu-radio>');
    const events: string[] = [];
    el.addEventListener('click', () => events.push('click'));
    el.click();
    await tick();
    expect(events).toEqual([]);
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(internalsOf(el).ariaDisabled).toBe('true');
    expect(getComputedStyle(el).cursor).toBe('not-allowed');
    expect(getComputedStyle(el.shadowRoot!.querySelector('.base')!).opacity).toBe('0.55');
  });

  test('an enabled radio is focusable', () => {
    const el = mount<NeuRadio>('<neu-radio>One</neu-radio>');
    expect(el.getAttribute('tabindex')).toBe('0');
    el.disabled = true;
    expect(el.hasAttribute('tabindex')).toBe(false);
    el.disabled = false;
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  test('the shadow tree has the documented parts', () => {
    const el = mount<NeuRadio>('<neu-radio>One</neu-radio>');
    expect(
      [...el.shadowRoot!.querySelectorAll('[part]')].map((node) => node.getAttribute('part')),
    ).toEqual(['base', 'control', 'indicator', 'label']);
  });

  test('has no axe violations inside a group', async () => {
    const el = mount<HTMLElement>(
      '<neu-radio-group label="Pick" value="a"><neu-radio value="a">One</neu-radio><neu-radio value="b" disabled>Two</neu-radio></neu-radio-group>',
    );
    await tick();
    expect(await axeViolations(el)).toEqual([]);
  });
});
