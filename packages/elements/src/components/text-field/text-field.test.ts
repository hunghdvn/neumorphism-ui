import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../button.js';
import { NeuTextField } from '../../text-field.js';
import { axeViolations, mount, mountForm } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const inputOf = (el: NeuTextField) => el.shadowRoot!.querySelector('input')!;

describe('neu-text-field', () => {
  test('renders a labelled native input that receives focus through the host', () => {
    const el = mount<NeuTextField>(
      '<neu-text-field label="Email" placeholder="you@x.com"></neu-text-field>',
    );
    expect(el.shadowRoot!.querySelector('label')!.textContent).toBe('Email');
    expect(inputOf(el).placeholder).toBe('you@x.com');
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(inputOf(el));
  });

  test('label and help text can come from slots', () => {
    const el = mount<NeuTextField>(
      '<neu-text-field><span slot="label">Name</span><span slot="help-text">Full name</span></neu-text-field>',
    );
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name=label]')!;
    expect(slot.assignedElements()[0]!.textContent).toBe('Name');
  });

  test('typing updates value and fires input; change is re-fired on the host after blur', async () => {
    const el = mount<NeuTextField>('<neu-text-field label="Name"></neu-text-field>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.focus();
    await userEvent.keyboard('ab');
    inputOf(el).blur();
    expect(el.value).toBe('ab');
    expect(events).toEqual(['input', 'input', 'change']);
  });

  test('the value attribute is the default; the property is the current value', () => {
    const el = mount<NeuTextField>('<neu-text-field label="A" value="x"></neu-text-field>');
    expect(el.value).toBe('x');
    el.value = 'y';
    expect(el.getAttribute('value')).toBe('x');
    expect(el.defaultValue).toBe('x');
    el.setAttribute('value', 'z');
    expect(el.value).toBe('y');
  });

  test('a value set before connecting is shown once rendered', () => {
    const el = document.createElement('neu-text-field') as NeuTextField;
    el.setAttribute('label', 'A');
    el.value = 'early';
    document.body.append(el);
    expect(inputOf(el).value).toBe('early');
    expect(el.value).toBe('early');
  });

  test('takes part in forms: FormData, validation, reset', () => {
    const form = mountForm(
      '<neu-text-field name="email" label="Email" type="email" value="a@b.co" required></neu-text-field>',
    );
    const el = form.querySelector('neu-text-field') as NeuTextField;
    expect(new FormData(form).get('email')).toBe('a@b.co');
    el.value = '';
    expect(el.validity.valueMissing).toBe(true);
    el.value = 'not-an-email';
    expect(el.validity.typeMismatch).toBe(true);
    form.reset();
    expect(el.value).toBe('a@b.co');
    expect(el.validity.valid).toBe(true);
  });

  test('error-text shows only after the user commits an invalid edit', async () => {
    const el = mount<NeuTextField>(
      '<neu-text-field label="Email" type="email" required error-text="Enter an email"></neu-text-field>',
    );
    const error = el.shadowRoot!.querySelector('.error-text')!;
    expect(el.matches(':state(user-invalid)')).toBe(false);
    expect(getComputedStyle(error).display).toBe('none');
    el.focus();
    await userEvent.keyboard('x');
    inputOf(el).blur();
    expect(el.matches(':state(user-invalid)')).toBe(true);
    expect(error.textContent).toBe('Enter an email');
    expect(getComputedStyle(error).display).toBe('block');
  });

  test('Enter submits the form when it has a submit button', async () => {
    const form = mountForm(
      '<neu-text-field name="q" label="Search"></neu-text-field><neu-text-field name="r" label="Other"></neu-text-field>' +
        '<neu-button type="submit">Go</neu-button>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    (form.querySelector('neu-text-field') as NeuTextField).focus();
    await userEvent.keyboard('{Enter}');
    expect(submitted).toBe(1);
  });

  test('escapes hostile attribute values', () => {
    const el = mount<NeuTextField>(
      `<neu-text-field label="<img src=x onerror=alert(1)>" placeholder='" autofocus onfocus="x'></neu-text-field>`,
    );
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    expect(inputOf(el).hasAttribute('onfocus')).toBe(false);
    expect(el.shadowRoot!.querySelector('.label-text')!.textContent).toBe(
      '<img src=x onerror=alert(1)>',
    );
  });

  test('a disabled fieldset disables the inner input', () => {
    const form = mountForm(
      '<fieldset disabled><neu-text-field name="a" label="A" value="1"></neu-text-field></fieldset>',
    );
    const el = form.querySelector('neu-text-field') as NeuTextField;
    expect(inputOf(el).disabled).toBe(true);
    expect(new FormData(form).has('a')).toBe(false);
  });

  test('passes attribute changes through to the inner input', () => {
    const el = mount<NeuTextField>('<neu-text-field label="A"></neu-text-field>');
    el.setAttribute('maxlength', '3');
    el.setAttribute('inputmode', 'numeric');
    el.readOnly = true;
    expect([inputOf(el).maxLength, inputOf(el).inputMode, inputOf(el).readOnly]).toEqual([
      3,
      'numeric',
      true,
    ]);
    el.removeAttribute('maxlength');
    expect(inputOf(el).hasAttribute('maxlength')).toBe(false);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuTextField>(
      '<neu-text-field label="Email" help-text="Work email"></neu-text-field>',
    );
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
