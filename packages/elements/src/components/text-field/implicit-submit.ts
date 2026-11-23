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

/**
 * Static brand of the custom elements that block implicit submission like a text input. A
 * subclass inherits it, so it counts under any tag name.
 */
export const BLOCKS_IMPLICIT_SUBMIT = Symbol.for('neu-ui.blocks-implicit-submit');

const blocks = (el: Element) =>
  (el instanceof HTMLInputElement && BLOCKING_TYPES.has(el.type)) ||
  (el.constructor as { [BLOCKS_IMPLICIT_SUBMIT]?: unknown })[BLOCKS_IMPLICIT_SUBMIT] === true;

/**
 * Enter in a text control submits like a native input (HTML §4.10.21.2). With a default button
 * (the form's first submit button, form="id" ones and <input type="image"> included) it clicks
 * that button unless it is disabled, so the button's own guards and click listeners apply. Without
 * one, it submits only when a single field blocks implicit submission. Either way it is a submit
 * attempt in its own right, so invalid controls reveal user-invalid.
 */
export function implicitSubmit(form: HTMLFormElement | null): void {
  if (!form) return;
  const elements = [...form.elements];
  const button = defaultButton(form);
  if (button) {
    if (button.matches(':disabled') || button.hasAttribute('disabled')) return;
    markSubmitAttempt(form);
    button.click();
    return;
  }
  if (elements.filter(blocks).length !== 1) return;
  markSubmitAttempt(form);
  form.requestSubmit();
}

/**
 * The form's first submit button in tree order. form.elements never lists an <input type="image">
 * (HTML §4.10.3), so the first image input owned by the form, which may sit outside it with
 * form="id", competes with the first listed submit button.
 */
function defaultButton(form: HTMLFormElement): HTMLElement | undefined {
  const first = [...form.elements].find(isSubmitButton) as HTMLElement | undefined;
  const root = form.getRootNode() as Document | ShadowRoot;
  const image = [...root.querySelectorAll('input')].find(
    (input) => input.type === 'image' && input.form === form,
  );
  if (first && image) {
    return first.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING ? first : image;
  }
  return first ?? image;
}
