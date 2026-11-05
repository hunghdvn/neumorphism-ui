import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../button.js';
import '../../text-field.js';
import { renderDSD } from '../../ssr.js';
import { NeuTextarea } from '../../textarea.js';
import { axeViolations, internalsOf, mount, mountForm, tick } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const areaOf = (el: NeuTextarea) => el.shadowRoot!.querySelector('textarea')!;

/** Cancels `invalid` so a failed submit shows no browser popup (see the text-field tests). */
function suppressValidationPopup(form: HTMLFormElement): void {
  form.addEventListener('invalid', (event) => event.preventDefault(), { capture: true });
}

describe('neu-textarea', () => {
  test('renders a labelled native textarea that receives focus through the host', () => {
    const el = mount<NeuTextarea>(
      '<neu-textarea label="Notes" placeholder="Write here"></neu-textarea>',
    );
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Notes');
    expect(areaOf(el).placeholder).toBe('Write here');
    expect(areaOf(el).getAttribute('part')).toBe('textarea');
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(areaOf(el));
  });

  test('has the documented defaults', () => {
    const el = mount<NeuTextarea>('<neu-textarea label="A"></neu-textarea>');
    expect([el.value, el.rows, el.resize, el.size, el.minLength, el.maxLength]).toEqual([
      '',
      3,
      'vertical',
      'md',
      -1,
      -1,
    ]);
    expect([el.required, el.disabled, el.readOnly]).toEqual([false, false, false]);
  });

  test('a value starting with a newline survives client render and SSR', () => {
    const el = mount<NeuTextarea>('<neu-textarea label="A" value="\nA"></neu-textarea>');
    expect(el.value).toBe('\nA');
    expect(areaOf(el).value).toBe('\nA');

    const attrs = { label: 'A', value: '\nA' };
    const doc = document.implementation.createHTMLDocument('');
    doc.body.setHTMLUnsafe(
      `<neu-textarea label="A" value="&#10;A">${renderDSD('neu-textarea', attrs)}</neu-textarea>`,
    );
    const server = doc.body.firstElementChild!;
    expect(server.shadowRoot!.querySelector('textarea')!.value).toBe('\nA');
    document.body.append(document.adoptNode(server));
    expect((server as NeuTextarea).value).toBe('\nA');
  });

  test('the value attribute is the default; the property is the current value', () => {
    const el = mount<NeuTextarea>('<neu-textarea label="A" value="x"></neu-textarea>');
    expect(el.value).toBe('x');
    el.value = 'y';
    expect(el.getAttribute('value')).toBe('x');
    expect(el.defaultValue).toBe('x');
    el.setAttribute('value', 'z');
    expect(el.value).toBe('y');
  });

  test('a value set before connecting is shown once rendered', () => {
    const el = document.createElement('neu-textarea') as NeuTextarea;
    el.value = 'early\nline';
    document.body.append(el);
    expect(areaOf(el).value).toBe('early\nline');
  });

  test('typing updates value and fires input; change is re-fired on the host after blur', async () => {
    const el = mount<NeuTextarea>('<neu-textarea label="Name"></neu-textarea>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.focus();
    await userEvent.keyboard('ab');
    areaOf(el).blur();
    expect(el.value).toBe('ab');
    expect(events).toEqual(['input', 'input', 'change']);
  });

  test('reflects the state attributes and passes them to the textarea', () => {
    const el = mount<NeuTextarea>('<neu-textarea label="A"></neu-textarea>');
    el.name = 'n';
    el.required = true;
    el.disabled = true;
    el.readOnly = true;
    el.resize = 'none';
    el.size = 'lg';
    expect(el.getAttribute('name')).toBe('n');
    expect(el.hasAttribute('required')).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('readonly')).toBe(true);
    expect(el.getAttribute('resize')).toBe('none');
    expect(el.getAttribute('size')).toBe('lg');
    expect([areaOf(el).required, areaOf(el).disabled, areaOf(el).readOnly]).toEqual([
      true,
      true,
      true,
    ]);
    el.setAttribute('maxlength', '3');
    el.setAttribute('minlength', '1');
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('enterkeyhint', 'send');
    expect([areaOf(el).maxLength, areaOf(el).minLength, areaOf(el).autocomplete]).toEqual([
      3,
      1,
      'off',
    ]);
    expect(areaOf(el).getAttribute('enterkeyhint')).toBe('send');
    el.removeAttribute('maxlength');
    expect(areaOf(el).hasAttribute('maxlength')).toBe(false);
  });

  test('invalid size and resize fall back to the defaults', () => {
    const el = mount<NeuTextarea>('<neu-textarea size="xl" resize="both"></neu-textarea>');
    expect([el.size, el.resize]).toEqual(['md', 'vertical']);
  });

  test('rows sets the height; invalid rows fall back to 3', () => {
    const el = mount<NeuTextarea>('<neu-textarea label="A" rows="6"></neu-textarea>');
    const area = areaOf(el);
    expect(area.rows).toBe(6);
    const six = area.getBoundingClientRect().height;
    el.setAttribute('rows', '2');
    expect(area.rows).toBe(2);
    expect(area.getBoundingClientRect().height).toBeLessThan(six);
    for (const bad of ['0', '-4', '2.5', 'abc']) {
      el.setAttribute('rows', bad);
      expect(area.rows).toBe(3);
    }
    expect(el.hasAttribute('rows')).toBe(true);
  });

  test('resize=auto grows with the content and never below rows', async () => {
    const el = mount<NeuTextarea>('<neu-textarea label="A" resize="auto" rows="2"></neu-textarea>');
    const area = areaOf(el);
    const base = area.getBoundingClientRect().height;
    expect(getComputedStyle(area).resize).toBe('none');
    el.value = 'a\nb\nc\nd\ne\nf\ng\nh';
    const grown = area.getBoundingClientRect().height;
    expect(grown).toBeGreaterThan(base * 2);
    el.focus();
    await userEvent.keyboard('{Enter}x{Enter}y');
    expect(area.getBoundingClientRect().height).toBeGreaterThan(grown);
    el.value = '';
    expect(area.getBoundingClientRect().height).toBe(base);
    el.rows = 5;
    expect(area.getBoundingClientRect().height).toBeGreaterThan(base);
  });

  test('resize=auto leaves the height alone when resize changes away from it', () => {
    const el = mount<NeuTextarea>('<neu-textarea label="A" resize="auto"></neu-textarea>');
    el.value = 'a\nb\nc\nd\ne\nf';
    el.resize = 'vertical';
    expect(areaOf(el).style.blockSize).toBe('');
  });

  test('Enter inserts a newline and does not submit the form', async () => {
    const form = mountForm(
      '<neu-textarea name="t" label="T"></neu-textarea><neu-button type="submit">Go</neu-button>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    const el = form.querySelector('neu-textarea') as NeuTextarea;
    el.focus();
    await userEvent.keyboard('a{Enter}b');
    await tick();
    expect(submitted).toBe(0);
    expect(el.value).toBe('a\nb');
  });

  test('takes part in forms: FormData, reset, disabled', () => {
    const form = mountForm('<neu-textarea name="t" label="T" value="x"></neu-textarea>');
    const el = form.querySelector('neu-textarea') as NeuTextarea;
    expect(new FormData(form).get('t')).toBe('x');
    el.value = 'a\nb';
    expect(new FormData(form).get('t')).toBe('a\nb');
    form.reset();
    expect(el.value).toBe('x');
    el.disabled = true;
    expect(new FormData(form).has('t')).toBe(false);
  });

  test('validity mirrors the inner textarea (required, minlength, maxlength)', () => {
    const form = mountForm('<neu-textarea name="t" label="T" required></neu-textarea>');
    const el = form.querySelector('neu-textarea') as NeuTextarea;
    expect(el.validity.valueMissing).toBe(true);
    el.value = 'abc';
    expect(el.validity.valid).toBe(true);
    el.minLength = 5;
    // minlength only applies to a value the user edited; a script-set value stays valid.
    expect(el.validity.tooShort).toBe(areaOf(el).validity.tooShort);
    el.maxLength = 2;
    expect(el.validity.tooLong).toBe(areaOf(el).validity.tooLong);
    el.required = false;
    el.value = '';
    expect(el.validity.valueMissing).toBe(false);
  });

  test('a required empty textarea is invalid before it connects', () => {
    const el = document.createElement('neu-textarea') as NeuTextarea;
    el.required = true;
    expect(el.validity.valueMissing).toBe(true);
    el.value = 'x';
    expect(el.validity.valid).toBe(true);
  });

  test('tooLong is reported for a typed value over maxlength before connecting', () => {
    const el = document.createElement('neu-textarea') as NeuTextarea;
    el.maxLength = 3;
    el.value = 'abcdef';
    expect(el.validity.valid).toBe(true);
  });

  test('error-text shows only after the user commits an invalid edit', async () => {
    const form = mountForm(
      '<neu-textarea label="Notes" minlength="5" error-text="Write more"></neu-textarea>',
    );
    suppressValidationPopup(form);
    const el = form.querySelector('neu-textarea') as NeuTextarea;
    const error = el.shadowRoot!.querySelector('.error-text')!;
    expect(el.matches(':state(user-invalid)')).toBe(false);
    expect(getComputedStyle(error).display).toBe('none');
    el.focus();
    await userEvent.keyboard('x');
    areaOf(el).blur();
    expect(el.matches(':state(user-invalid)')).toBe(true);
    expect(error.textContent).toBe('Write more');
    expect(getComputedStyle(error).display).toBe('block');
  });

  test('a disabled fieldset disables the inner textarea and styles it as disabled', () => {
    const form = mountForm(
      '<fieldset disabled><neu-textarea name="a" label="A" value="1"></neu-textarea></fieldset>',
    );
    const el = form.querySelector('neu-textarea') as NeuTextarea;
    expect(areaOf(el).disabled).toBe(true);
    expect(new FormData(form).has('a')).toBe(false);
    expect(getComputedStyle(el).cursor).toBe('not-allowed');
    expect(getComputedStyle(el.shadowRoot!.querySelector('.control')!).opacity).toBe('0.6');
  });

  test('is a textbox with a name and its help text as the description', () => {
    const el = mount<NeuTextarea>(
      '<neu-textarea label="Notes" help-text="Anything"></neu-textarea>',
    );
    const area = areaOf(el);
    expect(area.getAttribute('aria-describedby')).toBe('help');
    expect(el.shadowRoot!.querySelector('label')!.getAttribute('for')).toBe('input');
    expect(area.id).toBe('input');
    expect(internalsOf(el).ariaInvalid).toBeNull();
  });

  test('escapes hostile attribute values', () => {
    const el = mount<NeuTextarea>(
      `<neu-textarea label="<img src=x onerror=alert(1)>" placeholder='" autofocus onfocus="x' value="</textarea><img src=y>"></neu-textarea>`,
    );
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    expect(areaOf(el).hasAttribute('onfocus')).toBe(false);
    expect(el.value).toBe('</textarea><img src=y>');
  });

  test('Enter in a textarea does not mark untouched fields user-invalid', async () => {
    const form = mountForm(
      '<neu-text-field name="a" label="A" required></neu-text-field><neu-textarea name="t" label="T"></neu-textarea>',
    );
    const field = form.querySelector('neu-text-field')!;
    const el = form.querySelector('neu-textarea') as NeuTextarea;
    el.addEventListener('input', () => form.checkValidity());
    el.focus();
    await userEvent.keyboard('a{Enter}b');
    await tick();
    expect(field.matches(':state(user-invalid)')).toBe(false);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuTextarea>(
      '<neu-textarea label="Notes" help-text="Anything you like"></neu-textarea>',
    );
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
