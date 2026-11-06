import type { OptionData } from '../../core/define.js';

/** An option's label: its text with ASCII whitespace collapsed and trimmed, as a native option's. */
export function optionLabel(text: string): string {
  return text.replace(/[\t\n\f\r ]+/g, ' ').replace(/^ | $/g, '');
}

/**
 * What a neu-option holds, read from its attributes and text, so it works before the element is
 * upgraded (plan decision 11): the value attribute, or the label when there is none.
 */
export function readOption(el: Element): OptionData {
  const label = optionLabel(el.textContent ?? '');
  return { value: el.getAttribute('value') ?? label, label, disabled: el.hasAttribute('disabled') };
}
