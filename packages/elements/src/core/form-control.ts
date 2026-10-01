import { NeuElement } from './neu-element.js';

/** Base for every control that has a value (spec §6.6). */
export abstract class FormControlElement extends NeuElement {
  static formAssociated = true;
  private interacted = false;
  private checkingSilently = false;

  constructor() {
    super();
    // The browser fires `invalid` on a failed submit attempt and on reportValidity().
    this.addEventListener('invalid', () => {
      if (!this.checkingSilently) this.markInteracted();
    });
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }
  get validity(): ValidityState {
    return this.internals.validity;
  }
  get validationMessage(): string {
    return this.internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity(): boolean {
    this.checkingSilently = true;
    try {
      return this.internals.checkValidity();
    } finally {
      this.checkingSilently = false;
    }
  }

  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  formResetCallback(): void {
    this.interacted = false;
    this.resetToDefault();
    this.commit();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    this.restoreState(state);
    this.commit();
  }

  protected abstract formValue(): string | null;
  protected formState(): string {
    return this.formValue() ?? '';
  }
  protected abstract validate(): void;
  protected abstract resetToDefault(): void;
  protected abstract restoreState(state: string): void;

  /** Pushes the current value and validity to the form. Call after every value change. */
  protected commit(): void {
    this.internals.setFormValue(this.formValue(), this.formState());
    this.validate();
    this.syncUserInvalid();
  }

  /** The user committed an edit, so validation errors may now be shown. */
  protected markInteracted(): void {
    this.interacted = true;
    this.syncUserInvalid();
  }

  private syncUserInvalid(): void {
    this.toggleState('user-invalid', this.interacted && !this.internals.validity.valid);
  }
}

const SUBMITTERS =
  'button:not([type]), button[type="submit"], input[type="submit"], input[type="image"], neu-button[type="submit"]';

/** Enter in a text control submits like a native input: needs a submit button or a lone control. */
export function implicitSubmit(form: HTMLFormElement | null): void {
  if (!form) return;
  if (form.querySelector(SUBMITTERS) !== null || form.elements.length === 1) form.requestSubmit();
}
