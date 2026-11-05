import { isSubmitButton, markSubmitAttempt } from '../../core/form-control.js';

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

/** Custom elements that block implicit submission like a text input. */
const BLOCKING_TAGS = new Set(['neu-text-field', 'neu-number-field']);

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
      BLOCKING_TAGS.has(el.localName),
  );
  if (blocking.length !== 1) return;
  markSubmitAttempt(form);
  form.requestSubmit();
}
