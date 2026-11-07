import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../option.js';
import '../../text-field.js';
import { NeuSelect } from '../../select.js';
import { renderDSD } from '../../ssr.js';
import { axeViolations, internalsOf, mount, mountForm, tick } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const THREE =
  '<neu-option value="a">Alpha</neu-option><neu-option value="b">Beta</neu-option><neu-option value="c">Gamma</neu-option>';

function select(attrs = '', inner = THREE): NeuSelect {
  return mount<NeuSelect>(`<neu-select label="Plan" ${attrs}>${inner}</neu-select>`);
}

const part = (el: Element, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!;
const combobox = (el: Element) => part(el, 'combobox');
const listbox = (el: Element) => part(el, 'listbox');
const display = (el: Element) => part(el, 'display');
const optionsOf = (el: Element) => [
  ...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]'),
];
const isOpen = (el: Element) => listbox(el).matches(':popover-open');
const active = (el: Element) => combobox(el).getAttribute('aria-activedescendant');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Cancels `invalid` so reportValidity() shows no browser popup. Firefox's popup takes focus from
 * the test frame, and the next real pointer or key input in a parallel test file then goes nowhere.
 */
function suppressValidationPopup(el: Element): void {
  el.addEventListener('invalid', (event) => event.preventDefault());
}

/** A keydown on the combobox, where focus always is (spec §7.2). */
function press(el: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
    ...init,
  });
  combobox(el).dispatchEvent(event);
  return event;
}

/** Records the events a select fires, with its value at that moment. */
function record(el: NeuSelect): string[] {
  const events: string[] = [];
  for (const type of ['input', 'change', 'neu-open', 'neu-close']) {
    el.addEventListener(type, () => events.push(type === 'input' ? `input:${el.value}` : type));
  }
  return events;
}

/** Parses server markup for a select without upgrading it (an unknown tag keeps the root). */
function serverRoot(markup: string): ShadowRoot {
  const holder = document.createElement('div');
  holder.setHTMLUnsafe(`<neu-select-ssr>${markup}</neu-select-ssr>`);
  return holder.firstElementChild!.shadowRoot!;
}

const many = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `<neu-option value="v${i}">Item ${String(i).padStart(2, '0')}</neu-option>`,
  ).join('');

describe('neu-select', () => {
  test('defaults: no value, md, not required or disabled, no name or placeholder', async () => {
    const el = mount<NeuSelect>(`<neu-select>${THREE}</neu-select>`);
    await tick();
    expect([
      el.value,
      el.defaultValue,
      el.name,
      el.label,
      el.placeholder,
      el.helpText,
      el.errorText,
      el.required,
      el.disabled,
      el.size,
    ]).toEqual(['', '', '', '', '', '', '', false, false, 'md']);
    expect(display(el).textContent).toBe('');
    expect(display(el).classList.contains('placeholder')).toBe(true);
    expect(isOpen(el)).toBe(false);
  });

  test('reflection: name, required, disabled and size and the texts reflect; value does not', () => {
    const el = select();
    el.name = 'n';
    el.required = true;
    el.disabled = true;
    el.size = 'lg';
    expect(['name', 'required', 'disabled', 'size'].map((a) => el.getAttribute(a))).toEqual([
      'n',
      '',
      '',
      'lg',
    ]);
    el.value = 'b';
    el.label = 'Tier';
    el.placeholder = 'Pick';
    el.helpText = 'Help';
    el.errorText = 'Oops';
    expect(el.getAttribute('value')).toBeNull();
    expect(
      ['label', 'placeholder', 'help-text', 'error-text'].map((a) => el.getAttribute(a)),
    ).toEqual(['Tier', 'Pick', 'Help', 'Oops']);
    el.setAttribute('help-text', 'More');
    expect(el.helpText).toBe('More');
    expect(el.shadowRoot!.querySelector('.help-text')!.textContent).toBe('More');
  });

  test('setting label or placeholder keeps the options and the value', async () => {
    const el = select('value="b"');
    await tick();
    press(el, 'ArrowDown');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    const count = optionsOf(el).length;
    expect(count).toBe(3);
    el.label = 'Tier';
    el.placeholder = 'Pick';
    await tick();
    expect(el.value).toBe('b');
    expect(optionsOf(el)).toHaveLength(count);
    expect(events).toEqual([]);
  });

  test('an invalid size falls back to md', () => {
    expect(select('size="xl"').size).toBe('md');
  });

  test('the value attribute is the default; the property is the current value', async () => {
    const el = select('value="b"');
    await tick();
    expect([el.value, el.defaultValue, display(el).textContent]).toEqual(['b', 'b', 'Beta']);
    el.setAttribute('value', 'c');
    expect([el.value, display(el).textContent]).toEqual(['c', 'Gamma']);
    el.value = 'a';
    expect([el.value, el.getAttribute('value'), display(el).textContent]).toEqual([
      'a',
      'c',
      'Alpha',
    ]);
    el.setAttribute('value', 'b');
    expect(el.value).toBe('a');
    el.defaultValue = 'c';
    expect([el.getAttribute('value'), el.value]).toEqual(['c', 'a']);
  });

  test('an option without a value attribute has its label as value; labels collapse whitespace', async () => {
    const el = select(
      'value="Gold plan"',
      '<neu-option>Basic</neu-option><neu-option>\n  Gold\n  plan </neu-option>',
    );
    await tick();
    expect([el.value, display(el).textContent]).toEqual(['Gold plan', 'Gold plan']);
  });

  test('the first option with a matching value wins', async () => {
    const el = select(
      'value="x"',
      '<neu-option value="x">First</neu-option><neu-option value="x">Second</neu-option>',
    );
    await tick();
    expect(display(el).textContent).toBe('First');
    press(el, 'ArrowDown');
    expect(optionsOf(el).map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false']);
  });

  test('the placeholder shows while nothing is selected and follows its attribute', async () => {
    const el = select('placeholder="Choose a plan"');
    await tick();
    expect(display(el).textContent).toBe('Choose a plan');
    expect(display(el).className).toBe('display placeholder');
    el.placeholder = 'Pick one';
    expect(display(el).textContent).toBe('Pick one');
    el.value = 'b';
    expect([display(el).textContent, display(el).className]).toEqual(['Beta', 'display']);
    expect(getComputedStyle(display(el)).color).not.toBe(
      getComputedStyle(select('placeholder="P"').shadowRoot!.querySelector('.display')!).color,
    );
  });

  test('renderDSD with options shows the selected label; without a match shows the placeholder', () => {
    const options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'b', label: 'Beta twice' },
    ];
    const chosen = serverRoot(
      renderDSD('neu-select', { label: 'Plan', value: 'b', placeholder: 'Pick' }, { options }),
    );
    expect(chosen.querySelector('.display')!.textContent).toBe('Beta');
    expect(chosen.querySelector('.display')!.className).toBe('display');
    expect(chosen.querySelector('.label')!.textContent).toBe('Plan');
    expect(chosen.querySelector('.listbox')!.children).toHaveLength(0);

    for (const ctx of [{ options }, {}, undefined]) {
      const none = serverRoot(renderDSD('neu-select', { value: 'z', placeholder: 'Pick' }, ctx));
      expect(none.querySelector('.display')!.textContent).toBe('Pick');
      expect(none.querySelector('.display')!.className).toBe('display placeholder');
    }
    // Nothing readable on the server (spec §8.4): a set value leaves the display empty instead.
    const unread = serverRoot(
      renderDSD('neu-select', { value: 'z', placeholder: 'Pick' }, { options: [] }),
    );
    expect(unread.querySelector('.display')!.textContent).toBe('');
    expect(unread.querySelector('.display')!.className).toBe('display');
    // Labels are text, never markup.
    const hostile = serverRoot(
      renderDSD('neu-select', { value: 'x' }, { options: [{ value: 'x', label: '<b>x</b>' }] }),
    );
    expect(hostile.querySelector('b')).toBeNull();
    expect(hostile.querySelector('.display')!.textContent).toBe('<b>x</b>');
    expect(renderDSD('neu-select', {})).toContain('shadowrootdelegatesfocus');
  });

  test('server markup without options is filled from the light DOM on hydration', async () => {
    const holder = document.createElement('div');
    holder.setHTMLUnsafe(
      `<neu-select value="c">${renderDSD('neu-select', { value: 'c' })}${THREE}</neu-select>`,
    );
    const el = document.adoptNode(holder.firstElementChild!) as NeuSelect;
    const node = el.shadowRoot!.querySelector('.display');
    document.body.append(el);
    await tick();
    expect(el.shadowRoot!.querySelector('.display')).toBe(node);
    expect([node!.textContent, node!.className]).toEqual(['Gamma', 'display']);
  });

  test('the shadow tree has the documented parts', () => {
    const el = select();
    press(el, 'ArrowDown');
    expect(
      [...el.shadowRoot!.querySelectorAll('[part]')].map((node) => node.getAttribute('part')),
    ).toEqual([
      'base',
      'label',
      'combobox',
      'display',
      'chevron',
      'listbox',
      'option',
      'option',
      'option',
      'help-text',
    ]);
  });

  test('focus() and a click on the label focus the combobox', async () => {
    const el = select();
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(combobox(el));
    combobox(el).blur();
    part(el, 'label').click();
    expect(el.shadowRoot!.activeElement).toBe(combobox(el));
  });

  describe('keyboard', () => {
    test('closed keys open (Down/Up/Enter/Space/Home/End/typing); open keys move, page, select, escape and tab as §7.2', async () => {
      const el = select('value="b"');
      await tick();
      const events = record(el);
      // Down, Up, Enter and Space open on the selected option without changing it.
      for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
        expect(press(el, key).defaultPrevented).toBe(true);
        expect([isOpen(el), active(el)]).toEqual([true, 'option-1']);
        expect(press(el, 'Escape').defaultPrevented).toBe(true);
        expect([isOpen(el), active(el)]).toEqual([false, null]);
      }
      // Home and End open on the first and last option; a letter opens on the match.
      for (const [key, id] of [
        ['Home', 'option-0'],
        ['End', 'option-2'],
        ['g', 'option-2'],
      ]) {
        expect(press(el, key!).defaultPrevented).toBe(true);
        expect([isOpen(el), active(el)]).toEqual([true, id]);
        press(el, 'Escape');
      }
      expect(el.value).toBe('b');
      expect(events.filter((e) => e !== 'neu-open' && e !== 'neu-close')).toEqual([]);
      expect(events).toHaveLength(14);

      // Other keys and modified keys leave it closed.
      for (const [key, init] of [
        ['Escape', {}],
        ['Tab', {}],
        ['PageDown', {}],
        ['a', { ctrlKey: true }],
        ['a', { metaKey: true }],
      ] as const) {
        expect(press(el, key, init).defaultPrevented).toBe(false);
        expect(isOpen(el)).toBe(false);
      }
    });

    test('open keys move without wrapping, jump ten with PageUp/PageDown, and Home/End', async () => {
      const el = select('', many(12));
      await tick();
      press(el, 'ArrowDown');
      expect(active(el)).toBe('option-0');
      press(el, 'ArrowUp');
      expect(active(el)).toBe('option-0');
      expect(press(el, 'ArrowDown').defaultPrevented).toBe(true);
      expect(active(el)).toBe('option-1');
      expect(press(el, 'PageDown').defaultPrevented).toBe(true);
      expect(active(el)).toBe('option-11');
      press(el, 'ArrowDown');
      expect(active(el)).toBe('option-11');
      expect(press(el, 'PageUp').defaultPrevented).toBe(true);
      expect(active(el)).toBe('option-1');
      press(el, 'PageUp');
      expect(active(el)).toBe('option-0');
      press(el, 'End');
      expect(active(el)).toBe('option-11');
      press(el, 'Home');
      expect(active(el)).toBe('option-0');
      press(el, 'PageDown');
      expect(active(el)).toBe('option-10');
      // Moving never selects.
      expect([el.value, isOpen(el)]).toEqual(['', true]);
      expect(optionsOf(el)[10]!.classList.contains('active')).toBe(true);
      expect(optionsOf(el).filter((o) => o.classList.contains('active'))).toHaveLength(1);
    });

    test('Enter, Space and Alt+Up select the active option and close', async () => {
      const el = select();
      await tick();
      const events = record(el);
      for (const [key, init, value] of [
        ['Enter', {}, 'b'],
        [' ', {}, 'c'],
        ['ArrowUp', { altKey: true }, 'b'],
      ] as const) {
        press(el, 'End');
        if (value === 'b') press(el, 'ArrowUp');
        expect(press(el, key, init).defaultPrevented).toBe(true);
        expect([el.value, isOpen(el), active(el)]).toEqual([value, false, null]);
        expect(combobox(el).getAttribute('aria-expanded')).toBe('false');
      }
      expect(events).toEqual([
        'neu-open',
        'input:b',
        'change',
        'neu-close',
        'neu-open',
        'input:c',
        'change',
        'neu-close',
        'neu-open',
        'input:b',
        'change',
        'neu-close',
      ]);
    });

    test('Escape closes without changing the value', async () => {
      const el = select('value="a"');
      await tick();
      const events = record(el);
      press(el, 'End');
      expect(press(el, 'Escape').defaultPrevented).toBe(true);
      expect([el.value, display(el).textContent, isOpen(el)]).toEqual(['a', 'Alpha', false]);
      expect(events).toEqual(['neu-open', 'neu-close']);
    });

    test('Tab selects the active option, closes and lets focus move on', async () => {
      const form = mountForm(`<neu-select label="Plan">${THREE}</neu-select><button>Next</button>`);
      const el = form.querySelector('neu-select') as NeuSelect;
      await tick();
      const events = record(el);
      el.focus();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{ArrowDown}');
      expect([isOpen(el), active(el)]).toEqual([true, 'option-1']);
      await userEvent.keyboard('{Tab}');
      expect([el.value, isOpen(el)]).toEqual(['b', false]);
      expect(document.activeElement).toBe(form.querySelector('button'));
      expect(events).toEqual(['neu-open', 'input:b', 'change', 'neu-close']);
      // A synthetic Tab is not cancelled, so the browser may move focus.
      el.focus();
      press(el, 'ArrowDown');
      expect(press(el, 'Tab').defaultPrevented).toBe(false);
    });

    test('a real Escape closes the listbox once and keeps the state consistent', async () => {
      const el = select('value="a"');
      await tick();
      const events = record(el);
      el.focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(isOpen(el)).toBe(true);
      await userEvent.keyboard('{Escape}');
      await wait(50);
      expect([isOpen(el), combobox(el).getAttribute('aria-expanded'), active(el)]).toEqual([
        false,
        'false',
        null,
      ]);
      expect(events).toEqual(['neu-open', 'neu-close']);
      expect(el.value).toBe('a');
    });

    test('typeahead buffers within 500ms and cycles on a repeated letter', async () => {
      const el = select(
        '',
        '<neu-option>Apple</neu-option><neu-option>Banana</neu-option><neu-option>Band</neu-option><neu-option>Cherry</neu-option>',
      );
      await tick();
      // Closed: a letter opens; the search starts after the active option (Apple).
      press(el, 'b');
      expect([isOpen(el), active(el)]).toEqual([true, 'option-1']);
      // More letters within 500ms extend the prefix, which the active option still matches.
      press(el, 'a');
      expect(active(el)).toBe('option-1');
      press(el, 'N');
      press(el, 'd');
      expect(active(el)).toBe('option-2');
      await wait(600);
      // The buffer cleared: 'c' alone, case-insensitive.
      press(el, 'C');
      expect(active(el)).toBe('option-3');
      await wait(600);
      // A repeated letter cycles through the options starting with it, wrapping.
      press(el, 'b');
      expect(active(el)).toBe('option-1');
      press(el, 'b');
      expect(active(el)).toBe('option-2');
      press(el, 'b');
      expect(active(el)).toBe('option-1');
      await wait(600);
      // No match leaves the active option where it is; typing never selects.
      press(el, 'z');
      expect(active(el)).toBe('option-1');
      expect(el.value).toBe('');
    });

    test('a repeated letter cycles from the active option even past labels with a doubled initial', async () => {
      const el = select(
        '',
        '<neu-option>A4 paper</neu-option><neu-option>AA Battery</neu-option><neu-option>AAA Battery</neu-option><neu-option>Apple</neu-option>',
      );
      await tick();
      // Opens on A4 paper (the first option); every further 'a' moves on, never stalling on AA.
      press(el, 'a');
      expect(active(el)).toBe('option-1');
      press(el, 'a');
      expect(active(el)).toBe('option-2');
      press(el, 'a');
      expect(active(el)).toBe('option-3');
      press(el, 'a');
      expect(active(el)).toBe('option-0');
      await wait(600);
      press(el, 'Escape');
      // From a selected option the cycle starts after it, wrapping.
      el.value = 'AAA Battery';
      press(el, 'a');
      expect(active(el)).toBe('option-3');
      press(el, 'a');
      expect(active(el)).toBe('option-0');
      press(el, 'a');
      expect(active(el)).toBe('option-1');
      expect(el.value).toBe('AAA Battery');
    });

    test('the active option is scrolled into view inside the listbox', async () => {
      const el = select('', many(30));
      await tick();
      press(el, 'End');
      const box = listbox(el);
      expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
      const last = optionsOf(el)[29]!.getBoundingClientRect();
      const frame = box.getBoundingClientRect();
      expect(last.bottom).toBeLessThanOrEqual(frame.bottom + 1);
      press(el, 'Home');
      expect(box.scrollTop).toBe(0);
    });
  });

  test('disabled options are skipped and cannot be chosen', async () => {
    const el = select(
      '',
      '<neu-option value="a" disabled>Alpha</neu-option><neu-option value="b">Beta</neu-option><neu-option value="c" disabled>Gamma</neu-option><neu-option value="d">Delta</neu-option><neu-option value="e" disabled>Echo</neu-option>',
    );
    await tick();
    const events = record(el);
    press(el, 'ArrowDown');
    // Nothing selected: the first enabled option is active.
    expect(active(el)).toBe('option-1');
    expect(optionsOf(el).map((o) => o.getAttribute('aria-disabled'))).toEqual([
      'true',
      null,
      'true',
      null,
      'true',
    ]);
    press(el, 'ArrowDown');
    expect(active(el)).toBe('option-3');
    press(el, 'ArrowDown');
    expect(active(el)).toBe('option-3');
    press(el, 'Home');
    expect(active(el)).toBe('option-1');
    press(el, 'ArrowUp');
    expect(active(el)).toBe('option-1');
    press(el, 'End');
    expect(active(el)).toBe('option-3');
    press(el, 'PageUp');
    expect(active(el)).toBe('option-1');
    press(el, 'PageDown');
    expect(active(el)).toBe('option-3');
    // Typeahead skips them too.
    press(el, 'e');
    expect(active(el)).toBe('option-3');
    // Hovering or clicking a disabled option changes nothing.
    optionsOf(el)[2]!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(active(el)).toBe('option-3');
    optionsOf(el)[2]!.click();
    expect([el.value, isOpen(el)]).toEqual(['', true]);
    expect(events).toEqual(['neu-open']);
    // A script may still select one, like a native select.
    press(el, 'Escape');
    el.value = 'c';
    expect([el.value, display(el).textContent]).toEqual(['c', 'Gamma']);
  });

  test('with every option disabled, the listbox opens with no active option', async () => {
    const el = select('', '<neu-option disabled>A</neu-option><neu-option disabled>B</neu-option>');
    await tick();
    const events = record(el);
    press(el, 'ArrowDown');
    expect([isOpen(el), active(el)]).toEqual([true, null]);
    press(el, 'ArrowDown');
    press(el, 'End');
    expect(active(el)).toBeNull();
    press(el, 'Enter');
    expect([isOpen(el), el.value]).toEqual([false, '']);
    expect(events).toEqual(['neu-open', 'neu-close']);
  });

  test('a value set before its option exists applies when the option arrives; removing the selected option clears the value', async () => {
    const form = mountForm('<neu-select name="plan" label="Plan" placeholder="Pick"></neu-select>');
    const el = form.querySelector('neu-select') as NeuSelect;
    el.value = 'b';
    expect(el.value).toBe('');
    expect(new FormData(form).has('plan')).toBe(false);
    expect([display(el).textContent, display(el).className]).toEqual([
      'Pick',
      'display placeholder',
    ]);

    el.innerHTML = THREE;
    await tick();
    expect(el.value).toBe('b');
    expect([display(el).textContent, display(el).className]).toEqual(['Beta', 'display']);
    expect(new FormData(form).get('plan')).toBe('b');

    el.querySelector('neu-option[value="b"]')!.remove();
    await tick();
    expect(el.value).toBe('');
    expect([display(el).textContent, display(el).className]).toEqual([
      'Pick',
      'display placeholder',
    ]);
    expect(new FormData(form).has('plan')).toBe(false);

    // The requested value is kept: an option with the same value selects again.
    el.insertAdjacentHTML('beforeend', '<neu-option value="b">Beta again</neu-option>');
    await tick();
    expect([el.value, display(el).textContent]).toEqual(['b', 'Beta again']);
    expect(new FormData(form).get('plan')).toBe('b');
  });

  test('a value set before connecting, or before the options, applies once they are there', async () => {
    const el = document.createElement('neu-select') as NeuSelect;
    el.value = 'c';
    document.body.append(el);
    expect(el.value).toBe('');
    el.innerHTML = THREE;
    await tick();
    expect([el.value, display(el).textContent]).toEqual(['c', 'Gamma']);
  });

  test('option text and value attribute changes are read again', async () => {
    const el = select('value="x"');
    await tick();
    expect(el.value).toBe('');
    const gamma = el.querySelector<HTMLElement>('neu-option[value="c"]')!;
    gamma.setAttribute('value', 'x');
    await tick();
    expect([el.value, display(el).textContent]).toEqual(['x', 'Gamma']);
    gamma.firstChild!.nodeValue = 'Gamma ray';
    await tick();
    expect(display(el).textContent).toBe('Gamma ray');
    gamma.textContent = 'Gamma burst';
    await tick();
    expect(display(el).textContent).toBe('Gamma burst');
  });

  test('a disconnected select stops watching its options and reads them again on reconnect', async () => {
    const el = select('value="d"');
    await tick();
    el.remove();
    el.insertAdjacentHTML('beforeend', '<neu-option value="d">Delta</neu-option>');
    await tick();
    expect(display(el).textContent).toBe('');
    document.body.append(el);
    await tick();
    expect([el.value, display(el).textContent]).toEqual(['d', 'Delta']);
  });

  test('options edited while open rebuild the listbox', async () => {
    const el = select('value="b"');
    await tick();
    press(el, 'ArrowDown');
    expect(optionsOf(el).map((o) => o.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    el.insertAdjacentHTML('beforeend', '<neu-option value="d">Delta</neu-option>');
    await tick();
    expect(optionsOf(el).map((o) => [o.id, o.textContent])).toEqual([
      ['option-0', 'Alpha'],
      ['option-1', 'Beta'],
      ['option-2', 'Gamma'],
      ['option-3', 'Delta'],
    ]);
    el.querySelector('neu-option[value="c"]')!.setAttribute('disabled', '');
    el.querySelector('neu-option[value="a"]')!.textContent = 'Alef';
    await tick();
    expect(optionsOf(el).map((o) => [o.textContent, o.getAttribute('aria-disabled')])).toEqual([
      ['Alef', null],
      ['Beta', null],
      ['Gamma', 'true'],
      ['Delta', null],
    ]);
    expect(optionsOf(el).map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
    // The active option survives the rebuild and its id still resolves.
    press(el, 'End');
    expect(active(el)).toBe('option-3');
    el.querySelector('neu-option[value="a"]')!.remove();
    await tick();
    expect(optionsOf(el)).toHaveLength(3);
    expect(el.shadowRoot!.getElementById(active(el)!)).not.toBeNull();
    expect(isOpen(el)).toBe(true);
    // The listbox is built again on each open, so changes made while closed show too.
    press(el, 'Escape');
    el.querySelector('neu-option[value="d"]')!.textContent = 'Delta two';
    await tick();
    press(el, 'ArrowDown');
    expect(optionsOf(el).map((o) => o.textContent)).toEqual(['Beta', 'Gamma', 'Delta two']);
  });

  test('the listbox is built on first open', async () => {
    const el = select('value="a"');
    await tick();
    expect(listbox(el).children).toHaveLength(0);
    press(el, 'ArrowDown');
    expect(optionsOf(el)).toHaveLength(3);
  });

  test('aria: combobox expanded/activedescendant/labelledby; listbox and options roles; axe passes open and closed', async () => {
    const el = select('value="b" help-text="Billed monthly" required');
    await tick();
    const box = combobox(el);
    expect([
      box.getAttribute('role'),
      box.getAttribute('aria-haspopup'),
      box.getAttribute('aria-expanded'),
      box.getAttribute('aria-controls'),
      box.getAttribute('aria-labelledby'),
      box.getAttribute('aria-describedby'),
      box.getAttribute('aria-required'),
      box.getAttribute('tabindex'),
      box.getAttribute('aria-activedescendant'),
    ]).toEqual(['combobox', 'listbox', 'false', 'listbox', 'label', 'help', 'true', '0', null]);
    // The control is the combobox in the shadow root; the host itself has no role.
    expect(internalsOf(el).role).toBeNull();
    expect(el.shadowRoot!.getElementById('label')!.textContent).toBe('Plan');
    expect(el.shadowRoot!.getElementById('help')!.textContent).toBe('Billed monthly');
    expect(listbox(el).getAttribute('role')).toBe('listbox');
    expect(listbox(el).getAttribute('aria-labelledby')).toBe('label');
    expect(await axeViolations(el.parentElement!)).toEqual([]);

    press(el, 'ArrowDown');
    expect([box.getAttribute('aria-expanded'), active(el)]).toEqual(['true', 'option-1']);
    expect(
      optionsOf(el).map((o) => [o.id, o.getAttribute('role'), o.getAttribute('aria-selected')]),
    ).toEqual([
      ['option-0', 'option', 'false'],
      ['option-1', 'option', 'true'],
      ['option-2', 'option', 'false'],
    ]);
    expect(await axeViolations(el.parentElement!)).toEqual([]);

    el.required = false;
    expect(box.hasAttribute('aria-required')).toBe(false);
  });

  test('the listbox sits under the combobox at its width, and flips above when there is no room below', async () => {
    const wrap = mount<HTMLDivElement>(
      `<div style="position:fixed;inset-inline:16px;inset-block-start:16px"><neu-select label="Plan">${THREE}</neu-select></div>`,
    );
    const el = wrap.querySelector('neu-select') as NeuSelect;
    await tick();
    press(el, 'ArrowDown');
    let trigger = combobox(el).getBoundingClientRect();
    let list = listbox(el).getBoundingClientRect();
    expect(list.top).toBeCloseTo(trigger.bottom + 4, 0);
    expect(list.left).toBeCloseTo(trigger.left, 0);
    expect(list.width).toBeCloseTo(trigger.width, 0);
    press(el, 'Escape');

    // At the bottom of the viewport there is more room above: the listbox flips.
    wrap.style.insetBlockStart = 'auto';
    wrap.style.insetBlockEnd = '8px';
    press(el, 'ArrowDown');
    trigger = combobox(el).getBoundingClientRect();
    list = listbox(el).getBoundingClientRect();
    expect(list.bottom).toBeCloseTo(trigger.top - 4, 0);
    expect(list.left).toBeCloseTo(trigger.left, 0);

    // A resize while open places it again; once closed it is left alone.
    wrap.style.insetBlockStart = '16px';
    wrap.style.insetBlockEnd = 'auto';
    window.dispatchEvent(new Event('resize'));
    trigger = combobox(el).getBoundingClientRect();
    list = listbox(el).getBoundingClientRect();
    expect(list.top).toBeCloseTo(trigger.bottom + 4, 0);
    press(el, 'Escape');
    const top = listbox(el).style.top;
    wrap.style.insetBlockStart = '200px';
    window.dispatchEvent(new Event('resize'));
    expect(listbox(el).style.top).toBe(top);
  });

  test('the listbox follows the combobox when the page scrolls', async () => {
    const page = mount<HTMLDivElement>(
      `<div style="padding-block:40px 3000px"><neu-select label="Plan">${THREE}</neu-select></div>`,
    );
    const el = page.querySelector('neu-select') as NeuSelect;
    await tick();
    press(el, 'ArrowDown');
    window.scrollTo(0, 30);
    // The browser fires scroll at its next rendering update, which a loaded CI runner can hold
    // back past the wait (WebKit, run 42179203085): fire the event it would send right away.
    document.dispatchEvent(new Event('scroll', { bubbles: true }));
    await vi.waitFor(() => {
      const trigger = combobox(el).getBoundingClientRect();
      expect(trigger.top).toBeLessThan(40);
      expect(listbox(el).getBoundingClientRect().top).toBeCloseTo(trigger.bottom + 4, 0);
    });
    press(el, 'Escape');
    window.scrollTo(0, 0);
  });

  test('input then change on a new choice, none for the same; neu-open/neu-close', async () => {
    const el = select('value="a"');
    await tick();
    const events = record(el);
    const seen: [string, boolean, boolean][] = [];
    for (const type of ['input', 'change', 'neu-open', 'neu-close']) {
      el.addEventListener(type, (event) => seen.push([type, event.bubbles, event.composed]));
    }
    press(el, 'ArrowDown');
    optionsOf(el)[2]!.click();
    expect([el.value, isOpen(el)]).toEqual(['c', false]);
    press(el, 'ArrowDown');
    optionsOf(el)[2]!.click();
    press(el, 'ArrowDown');
    press(el, 'Enter');
    expect(events).toEqual([
      'neu-open',
      'input:c',
      'change',
      'neu-close',
      'neu-open',
      'neu-close',
      'neu-open',
      'neu-close',
    ]);
    expect(seen.every(([, bubbles, composed]) => bubbles && composed)).toBe(true);
    expect(el.matches(':state(user-invalid)')).toBe(false);
  });

  test('pointer: the combobox toggles, an option click chooses, hovering moves the active option, outside clicks close', async () => {
    const el = select('value="a"');
    await tick();
    const events = record(el);
    await userEvent.click(combobox(el));
    expect([isOpen(el), active(el)]).toEqual([true, 'option-0']);
    expect(el.shadowRoot!.activeElement).toBe(combobox(el));
    // A second click closes; the browser's light dismiss on the same click does not reopen it.
    await userEvent.click(combobox(el));
    await wait(50);
    expect([isOpen(el), combobox(el).getAttribute('aria-expanded')]).toEqual([false, 'false']);

    await userEvent.click(combobox(el));
    optionsOf(el)[1]!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(active(el)).toBe('option-1');
    await userEvent.click(optionsOf(el)[2]!);
    expect([el.value, isOpen(el), display(el).textContent]).toEqual(['c', false, 'Gamma']);
    expect(el.shadowRoot!.activeElement).toBe(combobox(el));

    // Light dismiss: a click elsewhere (above the select, away from the listbox) closes it too.
    const outside = document.createElement('p');
    outside.textContent = 'Outside';
    document.body.prepend(outside);
    await userEvent.click(combobox(el));
    await userEvent.click(outside);
    await vi.waitFor(() => expect(combobox(el).getAttribute('aria-expanded')).toBe('false'));
    expect([isOpen(el), active(el)]).toEqual([false, null]);
    await wait(50);
    expect(events).toEqual([
      'neu-open',
      'neu-close',
      'neu-open',
      'input:c',
      'change',
      'neu-close',
      'neu-open',
      'neu-close',
    ]);
  });

  test('opening one select closes another', async () => {
    const first = select();
    const second = select();
    await tick();
    press(first, 'ArrowDown');
    press(second, 'ArrowDown');
    expect([isOpen(first), isOpen(second)]).toEqual([false, true]);
    await vi.waitFor(() => expect(combobox(first).getAttribute('aria-expanded')).toBe('false'));
  });

  test('disabled: no opening, aria-disabled on the combobox, no tabindex, no events', async () => {
    const el = select('disabled value="a"');
    await tick();
    const events = record(el);
    for (const type of ['click']) el.addEventListener(type, () => events.push(type));
    const box = combobox(el);
    expect([box.getAttribute('aria-disabled'), box.hasAttribute('tabindex')]).toEqual([
      'true',
      false,
    ]);
    box.click();
    el.click();
    for (const key of ['ArrowDown', 'Enter', ' ', 'Home', 'b']) press(el, key);
    await tick();
    expect([isOpen(el), el.value, events]).toEqual([false, 'a', []]);
    el.focus();
    expect(el.shadowRoot!.activeElement).toBeNull();
    expect(getComputedStyle(el).cursor).toBe('not-allowed');
    expect(getComputedStyle(box).opacity).toBe('0.6');

    el.disabled = false;
    expect([box.hasAttribute('aria-disabled'), box.getAttribute('tabindex')]).toEqual([false, '0']);
    // Disabling while open closes it.
    press(el, 'ArrowDown');
    expect(isOpen(el)).toBe(true);
    el.disabled = true;
    expect([isOpen(el), box.getAttribute('aria-expanded'), active(el)]).toEqual([
      false,
      'false',
      null,
    ]);
    // Ruling R-9: the close that disabling causes still pairs the open, exactly once.
    await wait(50);
    expect(events).toEqual(['neu-open', 'neu-close']);
  });

  test('server markup for a disabled or required select carries the state before JS runs', () => {
    const root = serverRoot(renderDSD('neu-select', { disabled: '', required: '' }));
    const box = root.querySelector('.combobox')!;
    expect([
      box.getAttribute('aria-disabled'),
      box.hasAttribute('tabindex'),
      box.getAttribute('aria-required'),
    ]).toEqual(['true', false, 'true']);
  });

  test('FormData/reset/required/user-invalid/fieldset disabled', async () => {
    const form = mountForm(
      `<neu-select name="plan" label="Plan" value="b" required error-text="Pick a plan">${THREE}</neu-select>`,
    );
    const el = form.querySelector('neu-select') as NeuSelect;
    suppressValidationPopup(el);
    await tick();
    expect(el.form).toBe(form);
    expect(new FormData(form).get('plan')).toBe('b');
    expect(el.validity.valid).toBe(true);
    press(el, 'End');
    press(el, 'Enter');
    expect(new FormData(form).get('plan')).toBe('c');
    // An Enter keydown in a form control counts as a submit attempt for the rest of its task.
    await tick();
    form.reset();
    expect([el.value, display(el).textContent]).toEqual(['b', 'Beta']);
    expect(new FormData(form).get('plan')).toBe('b');

    // required with nothing selected: valueMissing with the browser's message.
    el.value = 'nope';
    expect(new FormData(form).has('plan')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).not.toBe('');
    expect(el.checkValidity()).toBe(false);
    expect(el.matches(':state(user-invalid)')).toBe(false);
    const error = el.shadowRoot!.querySelector('.error-text')!;
    expect(getComputedStyle(error).display).toBe('none');
    // Shown only once the user interacted (here: reportValidity).
    el.reportValidity();
    expect(el.matches(':state(user-invalid)')).toBe(true);
    expect([error.textContent, getComputedStyle(error).display]).toEqual(['Pick a plan', 'block']);
    el.errorText = '';
    expect(error.textContent).toBe(el.validationMessage);
    press(el, 'ArrowDown');
    press(el, 'Enter');
    expect([el.value, el.validity.valid, el.matches(':state(user-invalid)')]).toEqual([
      'a',
      true,
      false,
    ]);

    // State restore after navigation.
    el.formStateRestoreCallback('c');
    expect([el.value, new FormData(form).get('plan')]).toEqual(['c', 'c']);

    // A disabled fieldset disables it: no entry, no tab stop, no opening, the disabled look.
    const fieldset = document.createElement('fieldset');
    form.append(fieldset);
    fieldset.append(el);
    fieldset.disabled = true;
    await tick();
    expect(new FormData(form).has('plan')).toBe(false);
    expect(combobox(el).hasAttribute('tabindex')).toBe(false);
    expect(combobox(el).getAttribute('aria-disabled')).toBe('true');
    press(el, 'ArrowDown');
    expect(isOpen(el)).toBe(false);
    expect(getComputedStyle(el).cursor).toBe('not-allowed');
    expect(getComputedStyle(combobox(el)).opacity).toBe('0.6');
    fieldset.disabled = false;
    await tick();
    expect(combobox(el).getAttribute('tabindex')).toBe('0');
  });

  test('an option whose value is empty submits name=, like a native select; required still counts it as missing', async () => {
    const form = mountForm(
      `<neu-select name="p" required><neu-option value="">None</neu-option><neu-option value="x">X</neu-option></neu-select>`,
    );
    const el = form.querySelector('neu-select') as NeuSelect;
    await tick();
    expect([el.value, display(el).textContent]).toEqual(['', 'None']);
    expect(new FormData(form).get('p')).toBe('');
    expect(el.validity.valueMissing).toBe(true);
  });

  test('a form value is null when no option is selected', async () => {
    const form = mountForm(`<neu-select name="p">${THREE}</neu-select>`);
    await tick();
    expect(new FormData(form).has('p')).toBe(false);
  });

  test('the listbox closes when focus moves elsewhere while it is open', async () => {
    const form = mountForm(`<neu-select name="p">${THREE}</neu-select><input id="other">`);
    const el = form.querySelector('neu-select') as NeuSelect;
    await tick();
    const events: string[] = [];
    el.addEventListener('neu-close', () => events.push('close'));
    combobox(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(isOpen(el)).toBe(true);
    (form.querySelector('#other') as HTMLInputElement).focus();
    expect(isOpen(el)).toBe(false);
    expect(combobox(el).getAttribute('aria-expanded')).toBe('false');
    expect(events).toEqual(['close']);
  });

  test('the listbox stays open while the window is left, and closes when focus comes back elsewhere', async () => {
    const form = mountForm(`<neu-select name="p">${THREE}</neu-select><input id="other">`);
    const el = form.querySelector('neu-select') as NeuSelect;
    await tick();
    combobox(el).focus();
    await userEvent.keyboard('{ArrowDown}');
    // Leaving the window, as Firefox reports it: a focusout to nowhere while the document has no
    // focus. A script then focuses another field, which brings no second focusout.
    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    combobox(el).blur();
    hasFocus.mockRestore();
    expect(isOpen(el)).toBe(true);
    (form.querySelector('#other') as HTMLInputElement).focus();
    expect(isOpen(el)).toBe(false);
    expect(combobox(el).getAttribute('aria-expanded')).toBe('false');
  });

  test('a user-invalid select shows the error look on the combobox', async () => {
    const form = mountForm(`<neu-select name="p" label="P" required>${THREE}</neu-select>`);
    const el = form.querySelector('neu-select') as NeuSelect;
    suppressValidationPopup(el);
    // No transition, so the computed shadow is the final one.
    el.style.setProperty('--neu-duration', '0s');
    await tick();
    const before = getComputedStyle(combobox(el)).boxShadow;
    el.reportValidity();
    expect(getComputedStyle(combobox(el)).boxShadow).not.toBe(before);
  });

  test('renders 2.75rem tall, 4.125rem with a label: the heights neu.css reserves before the definition runs', async () => {
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const bare = mount<NeuSelect>(`<neu-select>${THREE}</neu-select>`);
    const labelled = select();
    // A font whose `normal` line height is not 16px must not change the label row.
    const mono = select(`style="font-family: 'Courier New', 'DejaVu Sans Mono', monospace"`);
    await tick();
    expect(bare.getBoundingClientRect().height).toBe(rem * 2.75);
    expect(labelled.getBoundingClientRect().height).toBe(rem * 4.125);
    expect(mono.getBoundingClientRect().height).toBe(rem * 4.125);
    expect(getComputedStyle(bare).display).toBe('block');
    const sizes = ['sm', 'lg'].map(
      (size) => combobox(mount(`<neu-select size="${size}"></neu-select>`)).offsetHeight,
    );
    expect(sizes).toEqual([rem * 2.25, rem * 3.25]);
  });

  test('escapes hostile values: labels, placeholders and option text stay text', async () => {
    const el = select(
      'placeholder="<img src=x>"',
      '<neu-option value="x">&lt;b&gt;bold&lt;/b&gt;</neu-option>',
    );
    el.label = '<i>label</i>';
    await tick();
    expect(display(el).textContent).toBe('<img src=x>');
    press(el, 'ArrowDown');
    expect(optionsOf(el)[0]!.textContent).toBe('<b>bold</b>');
    expect(el.shadowRoot!.querySelector('b, i, img')).toBeNull();
  });

  test('an option without value keeps a no-break space in its label and value', async () => {
    const el = select('', '<neu-option>A  B</neu-option>');
    await tick();
    el.value = 'A  B';
    expect(display(el).textContent).toBe('A  B');
  });

  test('Enter on a select does not mark untouched fields user-invalid', async () => {
    const form = mountForm(
      `<neu-text-field name="a" label="A" required></neu-text-field><neu-select name="plan" label="Plan">${THREE}</neu-select>`,
    );
    const field = form.querySelector('neu-text-field')!;
    const el = form.querySelector('neu-select') as NeuSelect;
    await tick();
    press(el, 'Enter');
    form.checkValidity();
    expect(field.matches(':state(user-invalid)')).toBe(false);
  });

  test('has no axe violations with a placeholder, a value, a disabled option and help text', async () => {
    const wrap = mount<HTMLDivElement>(
      `<div><neu-select label="Plan" placeholder="Pick">${THREE}</neu-select><neu-select label="Size" value="b" help-text="Pick one"><neu-option value="a" disabled>A</neu-option><neu-option value="b">B</neu-option></neu-select></div>`,
    );
    await tick();
    expect(await axeViolations(wrap)).toEqual([]);
    press(wrap.querySelectorAll('neu-select')[1]!, 'ArrowDown');
    expect(await axeViolations(wrap)).toEqual([]);
  });
});

describe('neu-select typeahead and hover', () => {
  test('AltGr characters take part in typeahead', () => {
    const el = select(
      '',
      '<neu-option value="b">b</neu-option><neu-option value="ä">ä</neu-option>',
    );
    press(el, 'ä', { ctrlKey: true, altKey: true });
    expect(isOpen(el)).toBe(true);
    expect(active(el)).toBe('option-1');
    expect(el.value).toBe('');
  });

  test('Ctrl+letter without Alt is not typeahead', () => {
    const el = select();
    press(el, 'b', { ctrlKey: true });
    expect(isOpen(el)).toBe(false);
  });

  test('Ctrl+Alt chords that type nothing are left alone, closed or open', () => {
    const el = select();
    const chord = { ctrlKey: true, altKey: true };
    for (const key of ['ArrowDown', 'Enter', ' ', 'Home']) {
      expect(press(el, key, chord).defaultPrevented).toBe(false);
      expect(isOpen(el)).toBe(false);
    }
    press(el, 'ArrowDown');
    expect(isOpen(el)).toBe(true);
    for (const key of ['ArrowDown', 'Enter', 'Escape', 'Tab']) {
      expect(press(el, key, chord).defaultPrevented).toBe(false);
      expect(isOpen(el)).toBe(true);
    }
    expect(el.value).toBe('');
  });

  test('hovering an option does not scroll the listbox', async () => {
    const many = Array.from(
      { length: 30 },
      (_, i) => `<neu-option value="v${i}">Option ${i}</neu-option>`,
    ).join('');
    const el = select('', many);
    press(el, 'ArrowDown');
    await tick();
    const box = listbox(el);
    expect(box.scrollTop).toBe(0);
    const options = optionsOf(el);
    const boxRect = box.getBoundingClientRect();
    // The last option that is only partly visible.
    const target = options.findLast((o) => o.getBoundingClientRect().top < boxRect.bottom)!;
    expect(target.getBoundingClientRect().bottom).toBeGreaterThan(boxRect.bottom);
    target.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, composed: true }));
    expect(box.scrollTop).toBe(0);
    expect(active(el)).toBe(target.id);
  });
});

describe('neu-select label slot and icons', () => {
  test('a slotted label names the combobox', async () => {
    const el = mount<NeuSelect>(
      `<neu-select><span slot="label">Fruit <b>*</b></span>${THREE}</neu-select>`,
    );
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('#label slot[name="label"]')!;
    expect(slot).not.toBeNull();
    const text = slot
      .assignedNodes()
      .map((n) => n.textContent)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text).toBe('Fruit *');
    expect(combobox(el).getAttribute('aria-labelledby')).toBe('label');
    expect(await axeViolations(el)).toEqual([]);
  });

  test('internal icons expose no svg part', () => {
    const el = select();
    expect(el.shadowRoot!.querySelector('[part~=svg]')).toBeNull();
  });

  test('the label typography sits on ::part(label), so a slotted label inherits it', () => {
    const el = mount<NeuSelect>('<neu-select><span slot="label">Plan</span></neu-select>');
    const part = getComputedStyle(el.shadowRoot!.querySelector('[part=label]')!);
    expect(part.fontWeight).toBe('600');
    expect(getComputedStyle(el.querySelector('[slot=label]')!).fontWeight).toBe('600');
  });
});
