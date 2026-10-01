import { afterEach, expect, test } from 'vitest';
import { defineComponent } from './define.js';
import { FormControlElement, implicitSubmit } from './form-control.js';
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
  const form = mountForm('<neu-probe-field name="a" required></neu-probe-field>');
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
  form.requestSubmit();
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

test('implicitSubmit submits only when the form has a submit button or a single control', () => {
  const single = mountForm('<neu-probe-field name="a" value="1"></neu-probe-field>');
  const multi = mountForm(
    '<neu-probe-field name="a" value="1"></neu-probe-field><neu-probe-field name="b" value="2"></neu-probe-field>',
  );
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
