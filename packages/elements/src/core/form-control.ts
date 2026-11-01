import { NeuElement } from './neu-element.js';

/** Forms the user is trying to submit during the current task (click on a submitter, or Enter). */
const submitAttempts = new WeakSet<HTMLFormElement>();
let watching = false;

/** Input types that block implicit submission when the form has no submit button (HTML §4.10.21.2). */
const BLOCKING_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
  'number',
]);

/** Records that the user is trying to submit `form` in this task, so validation errors may show. */
export function markSubmitAttempt(form: HTMLFormElement): void {
  submitAttempts.add(form);
  // Validation runs in the same task as the click/keydown/submit; forget the attempt afterwards.
  setTimeout(() => submitAttempts.delete(form), 0);
}

function isSubmitButton(el: Element): boolean {
  if (el instanceof HTMLButtonElement) return el.type === 'submit';
  if (el instanceof HTMLInputElement) return el.type === 'submit' || el.type === 'image';
  return el.localName === 'neu-button' && (el as Element & { type?: unknown }).type === 'submit';
}

/** The form owner of a control (its `form` property), which also covers form="id" association. */
function formOf(node: EventTarget): HTMLFormElement | null {
  const form = (node as { form?: unknown }).form;
  return form instanceof HTMLFormElement ? form : null;
}

/**
 * One capture listener pair on document sees every submit attempt: submitters outside their form
 * (form="id") and forms inside open shadow roots included. The composed path is walked rather than
 * the retargeted event.target, which would hide a control inside a shadow root from the document.
 */
function watchSubmitAttempts(): void {
  if (watching || typeof document === 'undefined') return;
  watching = true;
  document.addEventListener(
    'click',
    (event) => {
      for (const node of event.composedPath()) {
        if (!(node instanceof Element) || !isSubmitButton(node)) continue;
        const form = formOf(node);
        if (form) markSubmitAttempt(form);
        return;
      }
    },
    { capture: true },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter') return;
      for (const node of event.composedPath()) {
        const form = formOf(node);
        if (form) {
          markSubmitAttempt(form);
          return;
        }
      }
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
    watchSubmitAttempts();
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
 * Enter in a text control submits like a native input (HTML §4.10.21.2). With a default button
 * (the form's first submit button, form="id" ones included) it clicks that button unless it is
 * disabled, so the button's own guards and click listeners apply. Without one, it submits only
 * when a single field blocks implicit submission. Either way it is a submit attempt in its own
 * right, so invalid controls reveal user-invalid.
 */
export function implicitSubmit(form: HTMLFormElement | null): void {
  if (!form) return;
  const elements = [...form.elements];
  const defaultButton = elements.find(isSubmitButton) as HTMLElement | undefined;
  if (defaultButton) {
    if (defaultButton.matches(':disabled') || defaultButton.hasAttribute('disabled')) return;
    markSubmitAttempt(form);
    defaultButton.click();
    return;
  }
  const blocking = elements.filter(
    (el) =>
      (el instanceof HTMLInputElement && BLOCKING_TYPES.has(el.type)) ||
      el.localName === 'neu-text-field',
  );
  if (blocking.length !== 1) return;
  markSubmitAttempt(form);
  form.requestSubmit();
}
