import { NeuElement } from './neu-element.js';

const SUBMITTERS =
  'button:not([type]), button[type="submit"], input[type="submit"], input[type="image"], neu-button[type="submit"]';

/** Forms the user is trying to submit during the current task (click on a submitter, or Enter). */
const submitAttempts = new WeakSet<HTMLFormElement>();
const watchedForms = new WeakSet<HTMLFormElement>();

function markSubmitAttempt(form: HTMLFormElement): void {
  submitAttempts.add(form);
  // Validation runs in the same task as the click/keydown/submit; forget the attempt afterwards.
  setTimeout(() => submitAttempts.delete(form), 0);
}

function watchSubmitAttempts(form: HTMLFormElement): void {
  if (watchedForms.has(form)) return;
  watchedForms.add(form);
  const mark = () => markSubmitAttempt(form);
  form.addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest(SUBMITTERS)) mark();
    },
    { capture: true },
  );
  form.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter') mark();
    },
    { capture: true },
  );
}

/** Base for every control that has a value (spec §6.6). */
export abstract class FormControlElement extends NeuElement {
  static formAssociated = true;
  private interacted = false;

  constructor() {
    super();
    // A failed submit attempt fires `invalid`; so does form.checkValidity(), which must stay silent.
    this.addEventListener('invalid', () => {
      const form = this.internals.form;
      if (form && submitAttempts.has(form)) this.markInteracted();
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
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    const valid = this.internals.reportValidity();
    if (!valid) this.markInteracted();
    return valid;
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

  formAssociatedCallback(form: HTMLFormElement | null): void {
    if (form) watchSubmitAttempts(form);
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

/**
 * Enter in a text control submits like a native input: needs a submit button or a lone control.
 * It is a submit attempt in its own right, so invalid controls reveal user-invalid.
 */
export function implicitSubmit(form: HTMLFormElement | null): void {
  if (!form) return;
  if (form.querySelector(SUBMITTERS) === null && form.elements.length !== 1) return;
  markSubmitAttempt(form);
  form.requestSubmit();
}
