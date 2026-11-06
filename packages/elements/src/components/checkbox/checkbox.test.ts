import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuCheckbox } from '../../checkbox.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  keyup,
  mount,
  mountForm,
  tick,
} from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('neu-checkbox', () => {
  test('defaults: unchecked, not indeterminate, value on, size md', () => {
    const el = mount<NeuCheckbox>('<neu-checkbox>Agree</neu-checkbox>');
    expect([el.checked, el.indeterminate, el.value, el.size, el.name]).toEqual([
      false,
      false,
      'on',
      'md',
      '',
    ]);
    expect(el.defaultChecked).toBe(false);
  });

  test('role checkbox; aria-checked, state and control follow the value', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox>Agree</neu-checkbox>');
    const control = el.shadowRoot!.querySelector('.control')!;
    expect(internalsOf(el).role).toBe('checkbox');
    expect(internalsOf(el).ariaChecked).toBe('false');
    await userEvent.click(el);
    expect(el.checked).toBe(true);
    expect(internalsOf(el).ariaChecked).toBe('true');
    expect(el.matches(':state(checked)')).toBe(true);
    expect(control.classList.contains('on')).toBe(true);
  });

  test('the checked attribute is the default; the property is the current state', () => {
    const el = mount<NeuCheckbox>('<neu-checkbox checked>A</neu-checkbox>');
    expect(el.checked).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(el.defaultChecked).toBe(true);
  });

  test('reflection: name, value, disabled, required and size reflect; checked and indeterminate do not', () => {
    const el = mount<NeuCheckbox>('<neu-checkbox>A</neu-checkbox>');
    el.name = 'n';
    el.value = 'v';
    el.disabled = true;
    el.required = true;
    el.size = 'lg';
    expect(
      ['name', 'value', 'disabled', 'required', 'size'].map((a) => el.getAttribute(a)),
    ).toEqual(['n', 'v', '', '', 'lg']);
    el.checked = true;
    el.indeterminate = true;
    expect(el.hasAttribute('checked')).toBe(false);
    expect(el.hasAttribute('indeterminate')).toBe(false);
  });

  test('an invalid size falls back to md', () => {
    const el = mount<NeuCheckbox>('<neu-checkbox size="huge">A</neu-checkbox>');
    expect(el.size).toBe('md');
  });

  test('the indeterminate attribute sets the initial state; aria-checked is mixed', () => {
    const el = mount<NeuCheckbox>('<neu-checkbox indeterminate>A</neu-checkbox>');
    expect(el.indeterminate).toBe(true);
    expect(internalsOf(el).ariaChecked).toBe('mixed');
    expect(el.matches(':state(indeterminate)')).toBe(true);
    expect(el.shadowRoot!.querySelector('.control')!.classList.contains('mixed')).toBe(true);
    el.indeterminate = false;
    expect(internalsOf(el).ariaChecked).toBe('false');
    expect(el.matches(':state(indeterminate)')).toBe(false);
  });

  test('clicking an indeterminate checkbox checks it; aria-checked goes mixed → true', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox indeterminate>A</neu-checkbox>');
    expect(internalsOf(el).ariaChecked).toBe('mixed');
    await userEvent.click(el);
    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(false);
    expect(internalsOf(el).ariaChecked).toBe('true');
    expect(el.shadowRoot!.querySelector('.control')!.className).toBe('control on');
  });

  test('clicking a checked and indeterminate checkbox unchecks it, like a native one', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox checked indeterminate>A</neu-checkbox>');
    const native = document.createElement('input');
    native.type = 'checkbox';
    native.checked = true;
    native.indeterminate = true;
    native.click();
    await userEvent.click(el);
    expect([el.checked, el.indeterminate]).toEqual([native.checked, native.indeterminate]);
    expect([el.checked, el.indeterminate]).toEqual([false, false]);
    expect(internalsOf(el).ariaChecked).toBe('false');
  });

  test('a cancelled click restores both checked and indeterminate', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox indeterminate>A</neu-checkbox>');
    const events: string[] = [];
    el.addEventListener('click', (event) => event.preventDefault());
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.click();
    await tick();
    expect([el.checked, el.indeterminate]).toEqual([false, true]);
    expect(internalsOf(el).ariaChecked).toBe('mixed');
    expect(events).toEqual([]);
  });

  test('form reset does not touch indeterminate', async () => {
    const form = mountForm('<neu-checkbox name="n" checked indeterminate>A</neu-checkbox>');
    const el = form.querySelector('neu-checkbox') as NeuCheckbox;
    el.indeterminate = true;
    el.checked = false;
    form.reset();
    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(true);
  });

  test('state flips before click listeners; input then change fire afterwards', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox>N</neu-checkbox>');
    const events: string[] = [];
    el.addEventListener('click', () => events.push(`click:${el.checked}`));
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await userEvent.click(el);
    await tick();
    expect(events).toEqual(['click:true', 'input', 'change']);
  });

  test('input and change are composed and bubble', () => {
    const el = mount<NeuCheckbox>('<neu-checkbox>N</neu-checkbox>');
    const seen: [boolean, boolean][] = [];
    el.addEventListener('change', (event) => seen.push([event.bubbles, event.composed]));
    el.click();
    expect(seen).toEqual([[true, true]]);
  });

  test('disabled: no events, no toggle, not focusable', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox disabled>N</neu-checkbox>');
    const events: string[] = [];
    for (const type of ['click', 'input', 'change'])
      el.addEventListener(type, () => events.push(type));
    el.click();
    await tick();
    expect(events).toEqual([]);
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(internalsOf(el).ariaDisabled).toBe('true');
  });

  test('Space toggles, Enter does not', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox>N</neu-checkbox>');
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);
    expect(keydown(el, 'Enter').defaultPrevented).toBe(false);
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);
    expect(keydown(el, ' ').defaultPrevented).toBe(true);
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(false);
  });

  test('a Space keyup without its own keydown does not toggle', async () => {
    const el = mount<NeuCheckbox>('<neu-checkbox>N</neu-checkbox>');
    el.focus();
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(false);
  });

  test('form value is value when checked and missing otherwise; required unchecked is valueMissing', async () => {
    const form = mountForm('<neu-checkbox name="tos" value="yes" required>Accept</neu-checkbox>');
    const el = form.querySelector('neu-checkbox') as NeuCheckbox;
    expect(new FormData(form).has('tos')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).not.toBe('');
    expect(el.matches(':state(user-invalid)')).toBe(false);
    await userEvent.click(el);
    expect(new FormData(form).get('tos')).toBe('yes');
    expect(el.validity.valid).toBe(true);
    await userEvent.click(el);
    await tick();
    expect(el.validity.valueMissing).toBe(true);
    expect(el.matches(':state(user-invalid)')).toBe(true);
  });

  test('an indeterminate but unchecked required checkbox is still valueMissing', () => {
    const el = mount<NeuCheckbox>('<neu-checkbox required indeterminate>A</neu-checkbox>');
    expect(el.validity.valueMissing).toBe(true);
  });

  test('form.reset() returns to the default and clears dirtiness', async () => {
    const form = mountForm('<neu-checkbox name="n" checked>N</neu-checkbox>');
    const el = form.querySelector('neu-checkbox') as NeuCheckbox;
    await userEvent.click(el);
    expect(el.checked).toBe(false);
    form.reset();
    expect(el.checked).toBe(true);
    el.removeAttribute('checked');
    expect(el.checked).toBe(false);
  });

  test('a disabled fieldset styles it like the disabled attribute', () => {
    const form = mountForm(
      '<fieldset disabled><neu-checkbox>A</neu-checkbox></fieldset><neu-checkbox disabled>B</neu-checkbox>',
    );
    const looks = [...form.querySelectorAll('neu-checkbox')].map((el) => [
      getComputedStyle(el).cursor,
      getComputedStyle(el.shadowRoot!.querySelector('.base')!).opacity,
    ]);
    expect(looks).toEqual([
      ['not-allowed', '0.55'],
      ['not-allowed', '0.55'],
    ]);
  });

  test('an external <label for> toggles it', async () => {
    document.body.innerHTML = '<label for="c">Agree</label><neu-checkbox id="c"></neu-checkbox>';
    const el = document.getElementById('c') as NeuCheckbox;
    await userEvent.click(document.querySelector('label')!);
    expect(el.checked).toBe(true);
  });

  test('has no axe violations, plain and indeterminate', async () => {
    const el = mount<NeuCheckbox>(
      '<neu-checkbox>Agree</neu-checkbox><neu-checkbox indeterminate checked>Some</neu-checkbox>',
    );
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
