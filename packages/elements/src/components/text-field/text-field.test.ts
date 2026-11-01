import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../button.js';
import '../../switch.js';
import { NeuTextField } from '../../text-field.js';
import { axeViolations, keydown, mount, mountForm, tick } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const inputOf = (el: NeuTextField) => el.shadowRoot!.querySelector('input')!;

/**
 * Cancels `invalid` so a failed submit shows no browser popup. Firefox's popup takes focus from the
 * test frame, and the next real pointer or key input in a parallel test file then goes nowhere.
 */
function suppressValidationPopup(form: HTMLFormElement): void {
  form.addEventListener('invalid', (event) => event.preventDefault(), { capture: true });
}

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

  test('focus() puts the caret in the input without selecting the whole value', () => {
    const el = mount<NeuTextField>('<neu-text-field label="A"></neu-text-field>');
    el.value = 'abc';
    el.focus();
    const input = inputOf(el);
    expect(el.shadowRoot!.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).not.toEqual([0, 3]);
    expect(input.selectionStart).toBe(input.selectionEnd);
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

  test('error-text from the attribute is in the initial template', () => {
    const el = mount<NeuTextField>('<neu-text-field label="A" error-text="Oops"></neu-text-field>');
    const error = el.shadowRoot!.querySelector('.error-text')!;
    expect(error.textContent).toBe('Oops');
    expect(getComputedStyle(error).display).toBe('none');
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
    await tick();
    expect(submitted).toBe(1);
  });

  test('preventDefault on the Enter keydown stops the implicit submission', async () => {
    const form = mountForm(
      '<neu-text-field name="q" label="Search"></neu-text-field><neu-button type="submit">Go</neu-button>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    const el = form.querySelector('neu-text-field') as NeuTextField;
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') event.preventDefault();
    });
    el.focus();
    await userEvent.keyboard('{Enter}');
    await tick();
    expect(submitted).toBe(0);
  });

  test('Enter submits once the keydown has finished dispatching, not a task later', () => {
    const form = mountForm(
      '<neu-text-field name="q" label="Search"></neu-text-field><neu-button type="submit">Go</neu-button>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    const el = form.querySelector('neu-text-field') as NeuTextField;
    const cancelEnter = (event: KeyboardEvent) => {
      if (event.key === 'Enter') event.preventDefault();
    };
    document.addEventListener('keydown', cancelEnter);
    try {
      keydown(inputOf(el), 'Enter');
      expect(submitted).toBe(0);
    } finally {
      document.removeEventListener('keydown', cancelEnter);
    }
    keydown(inputOf(el), 'Enter');
    expect(submitted).toBe(1);
  });

  describe('implicit submission (Enter)', () => {
    /** Presses Enter in the first text field of `form` and reports how often it submitted. */
    async function enterIn(form: HTMLFormElement): Promise<number> {
      let submitted = 0;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitted++;
      });
      form.querySelector<NeuTextField>('neu-text-field')!.focus();
      await userEvent.keyboard('{Enter}');
      await tick();
      return submitted;
    }

    test('does nothing when the default button is disabled or loading', async () => {
      const forms = [
        '<button type="submit" disabled>Go</button>',
        '<neu-button type="submit" disabled>Go</neu-button>',
        '<neu-button type="submit" loading>Go</neu-button>',
        '<button disabled>Go</button><neu-button type="submit">Later</neu-button>',
      ].map((button) => mountForm(`<neu-text-field name="q" label="Q"></neu-text-field>${button}`));
      const results: number[] = [];
      for (const form of forms) results.push(await enterIn(form));
      expect(results).toEqual([0, 0, 0, 0]);
    });

    test('clicks the default button, so its click listeners run and it is the submitter', async () => {
      const native = mountForm(
        '<neu-text-field name="q" label="Q"></neu-text-field><button type="button">No</button>' +
          '<button name="go" value="1">Go</button><button>Second</button>',
      );
      const neu = mountForm(
        '<neu-text-field name="q" label="Q"></neu-text-field><neu-button type="submit">Go</neu-button>',
      );
      const seen: string[] = [];
      native.addEventListener('submit', (event) => {
        seen.push(`submitter:${(event.submitter as HTMLButtonElement | null)?.textContent}`);
      });
      for (const button of document.querySelectorAll('button, neu-button')) {
        button.addEventListener('click', () => seen.push(`click:${button.textContent}`));
      }
      expect([await enterIn(native), await enterIn(neu)]).toEqual([1, 1]);
      expect(seen).toEqual(['click:Go', 'submitter:Go', 'click:Go']);
    });

    test('without a submit button, submits when the field is the only one that blocks it', async () => {
      const results = [
        '<input type="hidden" name="csrf" value="t">',
        '<neu-switch name="s">S</neu-switch><neu-button>Other</neu-button>',
        '<fieldset><input type="checkbox" name="c"><input type="radio" name="r"></fieldset>',
      ].map((extra) => mountForm(`${extra}<neu-text-field name="q" label="Q"></neu-text-field>`));
      const submitted: number[] = [];
      for (const form of results) submitted.push(await enterIn(form));
      expect(submitted).toEqual([1, 1, 1]);
    });

    test('without a submit button, does nothing when another field blocks it', async () => {
      const forms = [
        '<neu-text-field name="r" label="R"></neu-text-field>',
        '<input type="email" name="e">',
        '<input type="date" name="d">',
      ].map((extra) => mountForm(`<neu-text-field name="q" label="Q"></neu-text-field>${extra}`));
      const submitted: number[] = [];
      for (const form of forms) submitted.push(await enterIn(form));
      expect(submitted).toEqual([0, 0, 0]);
    });

    test('uses a submit neu-button outside the form (form="f") as the default button', async () => {
      document.body.innerHTML =
        '<form id="f"><neu-text-field name="a" label="A" required></neu-text-field>' +
        '<neu-text-field name="b" label="B"></neu-text-field></form>' +
        '<footer><neu-button form="f" type="submit">Go</neu-button></footer>';
      const form = document.getElementById('f') as HTMLFormElement;
      const field = form.querySelector('neu-text-field') as NeuTextField;
      suppressValidationPopup(form);
      let clicks = 0;
      document.querySelector('neu-button')!.addEventListener('click', () => clicks++);
      expect(await enterIn(form)).toBe(0);
      expect(clicks).toBe(1);
      expect(field.matches(':state(user-invalid)')).toBe(true);
    });

    test('a click on a submit neu-button outside the form reveals user-invalid inside it', async () => {
      document.body.innerHTML =
        '<form id="f"><neu-text-field name="a" label="A" required></neu-text-field></form>' +
        '<neu-button form="f" type="submit">Go</neu-button>';
      const form = document.getElementById('f') as HTMLFormElement;
      const field = form.querySelector('neu-text-field') as NeuTextField;
      suppressValidationPopup(form);
      form.addEventListener('submit', (event) => event.preventDefault());
      document.querySelector<HTMLElement>('neu-button')!.click();
      expect(field.matches(':state(user-invalid)')).toBe(true);
    });
  });

  test('Enter on an invalid required field reveals user-invalid', async () => {
    const form = mountForm(
      '<neu-text-field name="q" label="Search" required></neu-text-field><neu-button type="submit">Go</neu-button>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    const el = form.querySelector('neu-text-field') as NeuTextField;
    el.focus();
    await userEvent.keyboard('{Enter}');
    await tick();
    expect(submitted).toBe(0);
    expect(el.matches(':state(user-invalid)')).toBe(true);
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

  test('a disabled fieldset styles it like the disabled attribute', () => {
    const form = mountForm(
      '<fieldset disabled><neu-text-field label="A"></neu-text-field></fieldset>' +
        '<neu-text-field label="B" disabled></neu-text-field>',
    );
    const looks = [...form.querySelectorAll('neu-text-field')].map((el) => [
      getComputedStyle(el).cursor,
      getComputedStyle(el.shadowRoot!.querySelector('.control')!).opacity,
    ]);
    expect(looks).toEqual([
      ['not-allowed', '0.6'],
      ['not-allowed', '0.6'],
    ]);
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
