import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuSwitch } from '../../switch.js';
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
    await tick();
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

  test('el.click() fires input then change before it returns', () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push(`input:${el.checked}`));
    el.addEventListener('change', () => events.push(`change:${el.checked}`));
    el.click();
    expect(events).toEqual(['input:true', 'change:true']);
  });

  test('a click listener that stops propagation still gets input and change, a task later', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', (event) => event.stopPropagation());
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.click();
    expect(events).toEqual([]);
    await tick();
    expect(events).toEqual(['input', 'change']);
    expect(el.checked).toBe(true);
  });

  test('preventDefault in a click listener reverts within the click', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', (event) => event.preventDefault());
    el.addEventListener('input', () => events.push('input'));
    el.click();
    expect(el.checked).toBe(false);
    await tick();
    expect(el.checked).toBe(false);
    expect(events).toEqual([]);
  });

  test('setting checked inside a click listener suppresses input and change', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', () => {
      el.checked = false;
    });
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.click();
    await tick();
    expect(el.checked).toBe(false);
    expect(events).toEqual([]);
  });

  test('a switch removed by a click listener fires no input or change', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('click', () => el.remove());
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.click();
    await tick();
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

  test('a tabindex the author sets later survives a disabled toggle; aria-disabled follows', () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    expect(el.getAttribute('tabindex')).toBe('0');
    el.setAttribute('tabindex', '-1');
    el.disabled = true;
    expect([el.hasAttribute('tabindex'), internalsOf(el).ariaDisabled]).toEqual([false, 'true']);
    el.disabled = false;
    expect([el.getAttribute('tabindex'), internalsOf(el).ariaDisabled]).toEqual(['-1', null]);
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

  test('Enter is left uncancelled; a document keydown listener that cancels it stops the toggle', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const cancelEnter = (event: KeyboardEvent) => {
      if (event.key === 'Enter') event.preventDefault();
    };
    document.addEventListener('keydown', cancelEnter);
    try {
      el.focus();
      await userEvent.keyboard('{Enter}');
      keydown(el, 'Enter');
      await tick();
      expect(el.checked).toBe(false);
    } finally {
      document.removeEventListener('keydown', cancelEnter);
    }
    expect(keydown(el, 'Enter').defaultPrevented).toBe(false);
    expect(el.checked).toBe(true);
  });

  test('a Space keyup without a Space keydown on the switch does not toggle', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.focus();
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(false);
    keydown(el, ' ');
    el.blur();
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(false);
  });

  test('a Space keydown cancelled before it reaches the switch does not arm it', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const cancelSpace = (event: KeyboardEvent) => {
      if (event.key === ' ') event.preventDefault();
    };
    document.addEventListener('keydown', cancelSpace, { capture: true });
    try {
      keydown(el, ' ');
      expect(el.matches(':state(pressed)')).toBe(false);
      keyup(el, ' ');
      await tick();
      expect(el.checked).toBe(false);
    } finally {
      document.removeEventListener('keydown', cancelSpace, { capture: true });
    }
  });

  test('Space is cancelled before an ancestor that stops propagation sees it, so the page cannot scroll', async () => {
    const form = mountForm('<neu-switch>N</neu-switch>');
    const el = form.querySelector('neu-switch') as NeuSwitch;
    let seen: boolean | undefined;
    form.addEventListener('keydown', (event) => {
      seen = event.defaultPrevented;
      event.stopPropagation();
    });
    expect(keydown(el, ' ').defaultPrevented).toBe(true);
    expect(seen).toBe(true);
    expect(el.matches(':state(pressed)')).toBe(true);
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(true);
  });

  test('an ancestor claims Space by cancelling the keyup', async () => {
    const form = mountForm('<neu-switch>N</neu-switch>');
    const el = form.querySelector('neu-switch') as NeuSwitch;
    form.addEventListener('keyup', (event) => event.preventDefault());
    keydown(el, ' ');
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(false);
    expect(el.matches(':state(pressed)')).toBe(false);
  });

  test('pressed is cleared when the element regains focus', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.focus();
    keydown(el, ' ');
    // The window loses focus (the element stays active), and Space is released elsewhere.
    el.dispatchEvent(new FocusEvent('blur'));
    expect(el.matches(':state(pressed)')).toBe(true);
    el.dispatchEvent(new FocusEvent('focus'));
    expect(el.matches(':state(pressed)')).toBe(false);
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(false);
  });

  test('the window losing focus between Space down and up does not disarm it', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.focus();
    keydown(el, ' ');
    // Deactivating the window or frame fires blur, but the element stays the active element.
    el.dispatchEvent(new FocusEvent('blur'));
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(true);
  });

  test('a keyup listener that calls preventDefault stops the Space toggle', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const events: string[] = [];
    el.addEventListener('keyup', (event) => event.preventDefault());
    el.addEventListener('change', () => events.push('change'));
    keydown(el, ' ');
    keyup(el, ' ');
    await tick();
    expect(el.checked).toBe(false);
    expect(events).toEqual([]);
  });

  test('a repeated Enter keydown does not toggle', () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }),
    );
    expect(el.checked).toBe(false);
  });

  test('re-connecting does not double-handle clicks', async () => {
    const el = mount<NeuSwitch>('<neu-switch>N</neu-switch>');
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
    await userEvent.click(el);
    expect(el.checked).toBe(true);
  });

  test('a disabled fieldset styles it like the disabled attribute', () => {
    const form = mountForm(
      '<fieldset disabled><neu-switch>A</neu-switch></fieldset><neu-switch disabled>B</neu-switch>',
    );
    const looks = [...form.querySelectorAll('neu-switch')].map((el) => [
      getComputedStyle(el).cursor,
      getComputedStyle(el.shadowRoot!.querySelector('.base')!).opacity,
    ]);
    expect(looks).toEqual([
      ['not-allowed', '0.55'],
      ['not-allowed', '0.55'],
    ]);
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
    await tick();
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
