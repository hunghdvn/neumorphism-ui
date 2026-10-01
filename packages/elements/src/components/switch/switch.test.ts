import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuSwitch } from '../../switch.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  mount,
  mountForm,
  tick,
} from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('neu-switch', () => {
  test('role switch; aria-checked, state and track follow the value', async () => {
    const el = mount<NeuSwitch>('<neu-switch>Notifications</neu-switch>');
    expect(internalsOf(el).role).toBe('switch');
    expect(internalsOf(el).ariaChecked).toBe('false');
    await userEvent.click(el);
    expect(el.checked).toBe(true);
    expect(internalsOf(el).ariaChecked).toBe('true');
    expect(el.matches(':state(checked)')).toBe(true);
    expect(el.shadowRoot!.querySelector('.track')!.classList.contains('on')).toBe(true);
  });

  test('the checked attribute is the default; the property is the current state', () => {
    const el = mount<NeuSwitch>('<neu-switch checked>N</neu-switch>');
    expect(el.checked).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(el.defaultChecked).toBe(true);
  });

  test('a changed default moves an untouched switch, but not a toggled one', () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.setAttribute('checked', '');
    expect(el.checked).toBe(true);
    el.click();
    expect(el.checked).toBe(false);
    el.removeAttribute('checked');
    el.setAttribute('checked', '');
    expect(el.checked).toBe(false);
  });

  test('state flips before click listeners; input then change fire afterwards', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', () => events.push(`click:${el.checked}`));
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await userEvent.click(el);
    expect(events).toEqual(['click:true', 'input', 'change']);
  });

  test('preventDefault on click cancels the toggle and fires nothing', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', (event) => event.preventDefault());
    el.addEventListener('change', () => events.push('change'));
    el.click();
    await tick();
    expect(el.checked).toBe(false);
    expect(events).toEqual([]);
  });

  test('disabled: no events, no toggle, not focusable', async () => {
    const el = mount<NeuSwitch>('<neu-switch disabled>N</neu-switch>');
    const events: string[] = [];
    for (const type of ['click', 'input', 'change'])
      el.addEventListener(type, () => events.push(type));
    el.click();
    await tick();
    expect(events).toEqual([]);
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
  });

  test('Space toggles on keyup, Enter on keydown, and Space does not scroll', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.focus();
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);
    expect(keydown(el, ' ').defaultPrevented).toBe(true);
  });

  test('re-connecting does not double-handle clicks', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
    await userEvent.click(el);
    expect(el.checked).toBe(true);
  });

  test('submits its value when checked and nothing when unchecked', () => {
    const form = mountForm('<neu-switch name="notify" value="yes" checked>N</neu-switch>');
    expect(new FormData(form).get('notify')).toBe('yes');
    (form.querySelector('neu-switch') as NeuSwitch).checked = false;
    expect(new FormData(form).has('notify')).toBe(false);
  });

  test('required + unchecked: valueMissing with a browser message; user-invalid only after interaction', async () => {
    const form = mountForm('<neu-switch name="tos" required>Accept</neu-switch>');
    const el = form.querySelector('neu-switch') as NeuSwitch;
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).not.toBe('');
    expect(el.matches(':state(user-invalid)')).toBe(false);
    await userEvent.click(el);
    await userEvent.click(el);
    expect(el.matches(':state(user-invalid)')).toBe(true);
  });

  test('form.reset() returns to the default and clears dirtiness', async () => {
    const form = mountForm('<neu-switch name="n" checked>N</neu-switch>');
    const el = form.querySelector('neu-switch') as NeuSwitch;
    await userEvent.click(el);
    expect(el.checked).toBe(false);
    form.reset();
    expect(el.checked).toBe(true);
    el.removeAttribute('checked');
    expect(el.checked).toBe(false);
  });

  test('an external <label for> toggles it', async () => {
    document.body.innerHTML = '<label for="s">Notify</label><neu-switch id="s"></neu-switch>';
    const el = document.getElementById('s') as NeuSwitch;
    await userEvent.click(document.querySelector('label')!);
    expect(el.checked).toBe(true);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuSwitch>('<neu-switch>Notifications</neu-switch>');
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
