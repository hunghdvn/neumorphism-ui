import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../button.js';
import { NeuNumberField } from '../../number-field.js';
import '../../text-field.js';
import { renderDSD } from '../../ssr.js';
import { axeViolations, keydown, mount, mountForm, tick } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const inputOf = (el: NeuNumberField) => el.shadowRoot!.querySelector('input')!;
const button = (el: NeuNumberField, which: 'decrement' | 'increment') =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`[data-ref=${which}]`)!;

/** Types into the inner input the way a user would, so badInput can arise. */
async function type(el: NeuNumberField, text: string) {
  el.focus();
  await userEvent.keyboard(text);
}

describe('neu-number-field', () => {
  test('a labelled field is 4.125rem tall, the height neu.css reserves, whatever the font', () => {
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const fonts = ['inherit', "'Courier New', 'DejaVu Sans Mono', monospace", 'Georgia, serif'];
    const heights = fonts.map(
      (font) =>
        mount(
          `<neu-number-field label="Qty" style="font-family: ${font}"></neu-number-field>`,
        ).getBoundingClientRect().height,
    );
    expect(heights).toEqual(fonts.map(() => rem * 4.125));
  });

  test('is a native spinbutton named by label', () => {
    const el = mount<NeuNumberField>('<neu-number-field label="Qty"></neu-number-field>');
    const input = inputOf(el);
    expect(input.type).toBe('number');
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Qty');
    expect(input.labels?.[0]).toBe(el.shadowRoot!.querySelector('label'));
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(input);
  });

  test('defaults and attribute to property mapping', () => {
    const el = mount<NeuNumberField>('<neu-number-field></neu-number-field>');
    expect([el.value, el.min, el.max, el.step]).toEqual(['', Number.NaN, Number.NaN, 1]);
    expect(inputOf(el).hasAttribute('min')).toBe(false);
    expect(inputOf(el).hasAttribute('max')).toBe(false);
    expect(inputOf(el).step).toBe('1');
    el.setAttribute('min', '2');
    el.max = 8;
    el.step = 2;
    expect([inputOf(el).min, inputOf(el).max, inputOf(el).step]).toEqual(['2', '8', '2']);
    el.setAttribute('min', 'abc');
    expect(el.min).toBeNaN();
    expect(inputOf(el).hasAttribute('min')).toBe(false);
  });

  test('reflects name, disabled, required, readonly and size; not the limits', () => {
    const el = mount<NeuNumberField>('<neu-number-field></neu-number-field>');
    el.name = 'n';
    el.disabled = true;
    el.required = true;
    el.readOnly = true;
    el.size = 'lg';
    el.min = 1;
    el.max = 5;
    el.step = 2;
    expect(
      ['name', 'disabled', 'required', 'readonly', 'size'].map((a) => el.getAttribute(a)),
    ).toEqual(['n', '', '', '', 'lg']);
    expect(['min', 'max', 'step'].map((a) => el.hasAttribute(a))).toEqual([false, false, false]);
  });

  test('the value attribute is the default; the property is the current value', () => {
    const el = mount<NeuNumberField>('<neu-number-field value="3"></neu-number-field>');
    expect([el.value, el.valueAsNumber, el.defaultValue]).toEqual(['3', 3, '3']);
    el.value = '5';
    expect(el.getAttribute('value')).toBe('3');
    el.valueAsNumber = 7;
    expect(el.value).toBe('7');
    el.valueAsNumber = Number.NaN;
    expect(el.value).toBe('');
  });

  test('a valueAsNumber set before upgrade is re-applied', () => {
    const el = document.createElement('neu-number-field') as NeuNumberField;
    el.valueAsNumber = 4;
    document.body.append(el);
    expect(inputOf(el).value).toBe('4');
    const other = document.createElement('neu-number-field') as NeuNumberField;
    document.body.append(other);
    expect(other.valueAsNumber).toBeNaN();
  });

  test('buttons step and stop at min and max; they fire input then change and keep focus in the input', () => {
    const el = mount<NeuNumberField>(
      '<neu-number-field label="Q" value="8" min="0" max="10" step="1"></neu-number-field>',
    );
    const events: string[] = [];
    const composed: boolean[] = [];
    el.addEventListener('input', (e) => {
      events.push('input');
      composed.push(e.composed);
    });
    el.addEventListener('change', () => events.push('change'));
    const plus = button(el, 'increment');
    plus.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    expect(el.shadowRoot!.activeElement).toBe(inputOf(el));
    plus.click();
    plus.click();
    expect(el.value).toBe('10');
    expect(events).toEqual(['input', 'change', 'input', 'change']);
    expect(composed).toEqual([true, true]);
    plus.click();
    expect(el.value).toBe('10');
    expect(events).toHaveLength(4);
    for (let i = 0; i < 12; i++) button(el, 'decrement').click();
    expect(el.value).toBe('0');
    expect(el.shadowRoot!.activeElement).toBe(inputOf(el));
  });

  test('a pointerdown on a button is cancelled so focus stays in the input', () => {
    const el = mount<NeuNumberField>('<neu-number-field label="Q"></neu-number-field>');
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
    button(el, 'decrement').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(el.shadowRoot!.activeElement).toBe(inputOf(el));
  });

  test('a touch on a button does not focus the input, so no on-screen keyboard opens', () => {
    const el = mount<NeuNumberField>('<neu-number-field label="Q"></neu-number-field>');
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
    });
    button(el, 'increment').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(el.shadowRoot!.activeElement).toBe(null);
    button(el, 'increment').click();
    expect(el.value).toBe('1');
  });

  test('the decimal keypad is asked for only when negative values are out of range', () => {
    const mode = (attrs: string) =>
      inputOf(mount(`<neu-number-field ${attrs}></neu-number-field>`)).getAttribute('inputmode');
    expect([mode('min="0"'), mode('min="2.5"'), mode('min="-50" max="50"'), mode('')]).toEqual([
      'decimal',
      'decimal',
      null,
      null,
    ]);
    const el = mount<NeuNumberField>('<neu-number-field min="0"></neu-number-field>');
    el.min = -5;
    expect(inputOf(el).getAttribute('inputmode')).toBe(null);
    el.min = 1;
    expect(inputOf(el).getAttribute('inputmode')).toBe('decimal');
    const server = renderDSD('neu-number-field', { min: '-1' });
    expect(server).not.toContain('inputmode');
    expect(renderDSD('neu-number-field', { min: '0' })).toContain('inputmode="decimal"');
  });

  test('buttons step an empty field from zero and respect a custom step', () => {
    const el = mount<NeuNumberField>('<neu-number-field step="5"></neu-number-field>');
    button(el, 'increment').click();
    expect(el.value).toBe('5');
    button(el, 'decrement').click();
    button(el, 'decrement').click();
    expect(el.value).toBe('-5');
  });

  test('buttons are disabled with the field or when it is readonly, and fire nothing', () => {
    const el = mount<NeuNumberField>('<neu-number-field value="1"></neu-number-field>');
    const fired: string[] = [];
    el.addEventListener('input', () => fired.push('input'));
    el.addEventListener('change', () => fired.push('change'));
    const state = () => [button(el, 'decrement').disabled, button(el, 'increment').disabled];
    expect(state()).toEqual([false, false]);
    el.readOnly = true;
    expect(state()).toEqual([true, true]);
    el.readOnly = false;
    el.disabled = true;
    expect(state()).toEqual([true, true]);
    button(el, 'increment').click();
    keydown(inputOf(el), 'PageUp');
    expect(el.value).toBe('1');
    expect(fired).toEqual([]);
    el.disabled = false;
    expect(state()).toEqual([false, false]);
  });

  test('a field disabled by its fieldset has disabled buttons', () => {
    const form = mountForm(
      '<fieldset disabled><neu-number-field name="n"></neu-number-field></fieldset>',
    );
    const el = form.querySelector('neu-number-field') as NeuNumberField;
    expect([button(el, 'decrement').disabled, button(el, 'increment').disabled]).toEqual([
      true,
      true,
    ]);
    expect(inputOf(el).disabled).toBe(true);
  });

  test('ArrowUp and ArrowDown stay native', async () => {
    const el = mount<NeuNumberField>('<neu-number-field value="1" step="2"></neu-number-field>');
    expect(keydown(inputOf(el), 'ArrowUp').defaultPrevented).toBe(false);
    el.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(el.value).toBe('3');
  });

  test('PageUp/PageDown step by ten; Home/End jump to min/max only when set', () => {
    const el = mount<NeuNumberField>('<neu-number-field value="50" step="2"></neu-number-field>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    const input = inputOf(el);
    expect(keydown(input, 'PageUp').defaultPrevented).toBe(true);
    expect(el.value).toBe('70');
    keydown(input, 'PageDown');
    keydown(input, 'PageDown');
    expect(el.value).toBe('30');
    expect(events).toEqual(['input', 'change', 'input', 'change', 'input', 'change']);
    expect(keydown(input, 'Home').defaultPrevented).toBe(false);
    expect(keydown(input, 'End').defaultPrevented).toBe(false);
    expect(el.value).toBe('30');
    el.min = 0;
    el.max = 40;
    expect(keydown(input, 'End').defaultPrevented).toBe(true);
    expect(el.value).toBe('40');
    keydown(input, 'Home');
    expect(el.value).toBe('0');
    keydown(input, 'PageUp');
    keydown(input, 'PageUp');
    expect(el.value).toBe('40');
  });

  test('invalid and out-of-range input set badInput / rangeOverflow like a native input; valueAsNumber is NaN when empty', async () => {
    const el = mount<NeuNumberField>(
      '<neu-number-field label="Q" min="0" max="10"></neu-number-field>',
    );
    expect(el.valueAsNumber).toBeNaN();
    await type(el, 'e');
    expect(inputOf(el).validity.badInput).toBe(true);
    expect(el.validity.badInput).toBe(true);
    expect(el.value).toBe('');
    expect(el.valueAsNumber).toBeNaN();
    el.value = '11';
    expect(el.validity.badInput).toBe(false);
    expect(el.validity.rangeOverflow).toBe(true);
    el.value = '-1';
    expect(el.validity.rangeUnderflow).toBe(true);
    el.value = '5';
    expect(el.validity.valid).toBe(true);
    el.step = 2;
    expect(el.validity.stepMismatch).toBe(true);
  });

  test('range validity is right before the field connects', () => {
    const el = document.createElement('neu-number-field') as NeuNumberField;
    el.min = 0;
    el.max = 3;
    el.value = '9';
    expect(el.validity.rangeOverflow).toBe(true);
    el.required = true;
    el.value = '';
    expect(el.validity.valueMissing).toBe(true);
  });

  test('step <= 0 falls back to 1; increment-label and decrement-label override the button names', () => {
    const el = mount<NeuNumberField>('<neu-number-field step="0" value="1"></neu-number-field>');
    expect(inputOf(el).step).toBe('1');
    el.step = -3;
    expect(inputOf(el).step).toBe('1');
    button(el, 'increment').click();
    expect(el.value).toBe('2');
    expect(button(el, 'increment').getAttribute('aria-label')).toBe('Increase');
    expect(button(el, 'decrement').getAttribute('aria-label')).toBe('Decrease');
    el.incrementLabel = 'Mehr';
    el.decrementLabel = 'Weniger';
    expect(button(el, 'increment').getAttribute('aria-label')).toBe('Mehr');
    expect(button(el, 'decrement').getAttribute('aria-label')).toBe('Weniger');
  });

  test('the step buttons are out of the tab order and hold an svg', () => {
    const el = mount<NeuNumberField>('<neu-number-field></neu-number-field>');
    for (const which of ['decrement', 'increment'] as const) {
      expect(button(el, which).tabIndex).toBe(-1);
      expect(button(el, which).querySelector('svg')).not.toBeNull();
    }
  });

  test('typing fires input and change is re-fired on the host after blur', async () => {
    const el = mount<NeuNumberField>('<neu-number-field label="Q"></neu-number-field>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await type(el, '12');
    inputOf(el).blur();
    expect(el.value).toBe('12');
    expect(events).toEqual(['input', 'input', 'change']);
  });

  test('Enter submits implicitly: a lone number field blocks implicit submission like a native one', async () => {
    const lone = mountForm('<neu-number-field name="n" label="N"></neu-number-field>');
    const two = mountForm(
      '<neu-number-field name="n" label="N"></neu-number-field><input type="text" name="t">',
    );
    const withButton = mountForm(
      '<neu-number-field name="n" label="N"></neu-number-field><neu-button type="submit">Go</neu-button><input type="text" name="t">',
    );
    const counts: number[] = [];
    for (const form of [lone, two, withButton]) {
      let submitted = 0;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitted++;
      });
      form.querySelector<NeuNumberField>('neu-number-field')!.focus();
      await userEvent.keyboard('{Enter}');
      await tick();
      counts.push(submitted);
    }
    expect(counts).toEqual([1, 0, 1]);
  });

  test('a subclass registered under another tag still blocks implicit submission', async () => {
    if (!customElements.get('my-qty'))
      customElements.define('my-qty', class extends NeuNumberField {});
    const form = mountForm(
      '<my-qty name="q"></my-qty><neu-text-field name="t" label="T"></neu-text-field>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    form.querySelector<HTMLElement>('neu-text-field')!.focus();
    await userEvent.keyboard('{Enter}');
    await tick();
    expect(submitted).toBe(0);
  });

  test('takes part in forms: FormData, reset, required', () => {
    const form = mountForm(
      '<neu-number-field name="qty" label="Qty" value="3" required></neu-number-field>',
    );
    const el = form.querySelector('neu-number-field') as NeuNumberField;
    expect(new FormData(form).get('qty')).toBe('3');
    el.value = '';
    expect(el.validity.valueMissing).toBe(true);
    el.value = '8';
    form.reset();
    expect(el.value).toBe('3');
    expect(el.validity.valid).toBe(true);
  });

  test('user-invalid shows only after the user interacts', async () => {
    const el = mount<NeuNumberField>(
      '<neu-number-field label="Q" max="5" error-text="Too big"></neu-number-field>',
    );
    el.value = '9';
    expect(el.matches(':state(user-invalid)')).toBe(false);
    el.value = '';
    await type(el, '9');
    inputOf(el).blur();
    expect(el.matches(':state(user-invalid)')).toBe(true);
    expect(el.shadowRoot!.querySelector('.error-text')!.textContent).toBe('Too big');
  });

  test('server markup leaves out unset limits and renders set ones', () => {
    const markup = renderDSD('neu-number-field', { label: 'Q', value: '4', min: '0', max: '9' });
    expect(markup).toContain('type="number"');
    expect(markup).toContain('min="0"');
    expect(markup).toContain('max="9"');
    expect(markup).not.toContain('NaN');
    expect(renderDSD('neu-number-field', {})).not.toMatch(/ (min|max)=/);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuNumberField>(
      '<neu-number-field label="Quantity" value="2" min="0" max="9"></neu-number-field>',
    );
    expect(await axeViolations(el)).toEqual([]);
  });
});
