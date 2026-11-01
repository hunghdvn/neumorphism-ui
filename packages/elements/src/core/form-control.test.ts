import { afterEach, expect, test } from 'vitest';
import { implicitSubmit } from '../components/text-field/implicit-submit.js';
import { defineComponent } from './define.js';
import { FormControlElement } from './form-control.js';
import { html } from './html.js';

const fieldDef = defineComponent({
  tag: 'neu-probe-field',
  props: {
    value: { type: 'string' },
    name: { type: 'string', reflect: true },
    required: { type: 'boolean', reflect: true },
    disabled: { type: 'boolean', reflect: true },
  },
  form: { valueProp: 'value' },
  styles: '',
  template: () => html`<span data-ref="anchor">field</span>`,
  docs: { summary: '', events: [], slots: [], parts: [], cssProperties: [] },
});

class NeuProbeField extends FormControlElement {
  static override def = fieldDef;
  private current: string;
  disabledSeen = false;

  constructor() {
    super();
    this.current = String(this.props.value);
  }

  get value(): string {
    return this.current;
  }
  set value(next: string) {
    this.current = String(next);
    this.commit();
  }

  /** Simulates the user editing the field. */
  edit(next: string): void {
    this.current = next;
    this.commit();
    this.markInteracted();
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('value')) this.current = String(this.props.value);
  }
  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled')) this.disabledSeen = this.isDisabled;
    this.commit();
  }
  protected formValue(): string | null {
    return this.current === '' ? null : this.current;
  }
  protected validate(): void {
    if (this.props.required === true && this.current === '') {
      this.internals.setValidity(
        { valueMissing: true },
        'Required',
        this.ref('anchor') ?? undefined,
      );
    } else {
      this.internals.setValidity({});
    }
  }
  protected resetToDefault(): void {
    this.current = String(this.props.value);
  }
  protected restoreState(state: string): void {
    this.current = state;
  }
}
NeuProbeField.define();

function mountForm(inner: string): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = inner;
  document.body.append(form);
  return form;
}

/**
 * Cancels `invalid` so a failed submit shows no browser popup. Firefox's popup takes focus from the
 * test frame, and real pointer or key input in a parallel test file then goes nowhere.
 */
function suppressValidationPopup(form: HTMLFormElement): void {
  form.addEventListener('invalid', (event) => event.preventDefault(), { capture: true });
}

afterEach(() => {
  document.body.innerHTML = '';
});

test('contributes name/value to FormData; a null value is omitted', () => {
  const form = mountForm(
    '<neu-probe-field name="a" value="1"></neu-probe-field><neu-probe-field name="b"></neu-probe-field>',
  );
  const data = new FormData(form);
  expect(data.get('a')).toBe('1');
  expect(data.has('b')).toBe(false);
});

test('form.reset() restores the default value and clears user-invalid', () => {
  const form = mountForm('<neu-probe-field name="a" value="1" required></neu-probe-field>');
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  field.edit('');
  expect(field.matches(':state(user-invalid)')).toBe(true);
  form.reset();
  expect(field.value).toBe('1');
  expect(new FormData(form).get('a')).toBe('1');
  expect(field.matches(':state(user-invalid)')).toBe(false);
});

test('user-invalid appears only after interaction or a submit attempt', () => {
  const form = mountForm(
    '<neu-probe-field name="a" required></neu-probe-field><button>Go</button>',
  );
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  expect(field.validity.valueMissing).toBe(true);
  expect(field.validationMessage).toBe('Required');
  expect(field.checkValidity()).toBe(false);
  expect(field.matches(':state(user-invalid)')).toBe(false);
  let submitted = false;
  form.addEventListener('submit', (event) => {
    submitted = true;
    event.preventDefault();
  });
  form.querySelector('button')!.click();
  expect(submitted).toBe(false);
  expect(field.matches(':state(user-invalid)')).toBe(true);
});

test('a disabled fieldset disables the control and removes it from FormData', () => {
  const form = mountForm(
    '<fieldset disabled><neu-probe-field name="a" value="1"></neu-probe-field></fieldset>',
  );
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  expect(field.disabledSeen).toBe(true);
  expect(new FormData(form).has('a')).toBe(false);
  form.querySelector('fieldset')!.disabled = false;
  expect(field.disabledSeen).toBe(false);
});

test('formStateRestoreCallback restores a saved state', () => {
  const form = mountForm('<neu-probe-field name="a" value="1"></neu-probe-field>');
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  field.formStateRestoreCallback('restored');
  expect(field.value).toBe('restored');
  expect(new FormData(form).get('a')).toBe('restored');
});

test('form.checkValidity() and a programmatic requestSubmit() stay silent; reportValidity() reveals', () => {
  const form = mountForm('<neu-probe-field name="a" required></neu-probe-field>');
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  form.checkValidity();
  expect(field.matches(':state(user-invalid)')).toBe(false);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  form.requestSubmit();
  expect(field.matches(':state(user-invalid)')).toBe(false);
  const reportResult = field.reportValidity();
  expect(reportResult).toBe(false);
  expect(field.matches(':state(user-invalid)')).toBe(true);
});

test('Enter followed by a submit in the same task counts as a submit attempt', () => {
  const form = mountForm('<input name="q"><neu-probe-field name="a" required></neu-probe-field>');
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  const input = form.querySelector('input') as HTMLInputElement;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  form.requestSubmit();
  expect(field.matches(':state(user-invalid)')).toBe(true);
});

test('submit attempts are seen in a form inside a shadow root', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<form><input name="q"><neu-probe-field name="a" required></neu-probe-field><button>Go</button></form>';
  const form = root.querySelector('form')!;
  const field = root.querySelector('neu-probe-field') as NeuProbeField;
  suppressValidationPopup(form);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  root
    .querySelector('input')!
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  form.requestSubmit();
  expect(field.matches(':state(user-invalid)')).toBe(true);
  form.reset();
  expect(field.matches(':state(user-invalid)')).toBe(false);
  root.querySelector('button')!.click();
  expect(field.matches(':state(user-invalid)')).toBe(true);
});

test('Enter outside every form is no submit attempt, even beside a form named "form"', () => {
  // window.form and document.form resolve to this form through named-property access.
  document.body.innerHTML =
    '<div id="d" tabindex="0"></div><form id="form" name="form"><neu-probe-field name="a" required></neu-probe-field></form>';
  const form = document.getElementById('form') as HTMLFormElement;
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  document
    .getElementById('d')!
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  form.checkValidity();
  expect(field.matches(':state(user-invalid)')).toBe(false);
});

test('submit attempts are seen for a submitter associated with form="id"', () => {
  document.body.innerHTML =
    '<form id="f"><neu-probe-field name="a" required></neu-probe-field></form><button form="f">Go</button>';
  const form = document.getElementById('f') as HTMLFormElement;
  const field = form.querySelector('neu-probe-field') as NeuProbeField;
  suppressValidationPopup(form);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  document.querySelector('button')!.click();
  expect(field.matches(':state(user-invalid)')).toBe(true);
});

test('implicitSubmit submits only when the form has a submit button or a single control', () => {
  // Only text-like fields block implicit submission, so the lone/multi fixtures use native inputs.
  const single = mountForm('<input name="a" value="1">');
  const multi = mountForm('<input name="a" value="1"><input name="b" value="2">');
  const withButton = mountForm(
    '<neu-probe-field name="a" value="1"></neu-probe-field><neu-probe-field name="b" value="2"></neu-probe-field><button>Go</button>',
  );
  const submitted: HTMLFormElement[] = [];
  for (const form of [single, multi, withButton]) {
    form.addEventListener('submit', (event) => {
      submitted.push(form);
      event.preventDefault();
    });
  }
  implicitSubmit(single);
  implicitSubmit(multi);
  implicitSubmit(withButton);
  implicitSubmit(null);
  expect(submitted).toEqual([single, withButton]);
});
