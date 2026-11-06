import { defineComponent } from '../../core/define.js';
import { html, type RawHtml } from '../../core/html.js';
import type { InferProps } from '../../core/props.js';
import { themeCssProperties } from '../../core/styles.js';
import { textareaStyles } from './textarea.styles.js';

const props = {
  value: { type: 'string' },
  name: { type: 'string' },
  label: { type: 'string' },
  placeholder: { type: 'string' },
  helpText: { type: 'string' },
  errorText: { type: 'string' },
  required: { type: 'boolean' },
  disabled: { type: 'boolean' },
  readOnly: { type: 'boolean', attribute: 'readonly' },
  minLength: { type: 'number', default: -1, attribute: 'minlength' },
  maxLength: { type: 'number', default: -1, attribute: 'maxlength' },
  autocomplete: { type: 'string' },
  enterKeyHint: { type: 'string', attribute: 'enterkeyhint' },
  rows: { type: 'number', default: 3 },
  resize: {
    type: 'string',
    default: 'vertical',
    values: ['none', 'vertical', 'auto'],
  },
  size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
} as const;

export type TextareaProps = InferProps<typeof props>;

/** A row count the native textarea would also accept; anything else means the default of 3. */
export function rowsOf(rows: number): number {
  return Number.isInteger(rows) && rows >= 1 ? rows : 3;
}

/** Attributes of the inner <textarea> that only appear when set. */
function areaAttributes(p: TextareaProps): RawHtml {
  return html`${p.placeholder ? html` placeholder="${p.placeholder}"` : ''}${p.required ? html` required` : ''}${p.disabled ? html` disabled` : ''}${p.readOnly ? html` readonly` : ''}${p.minLength >= 0 ? html` minlength="${p.minLength}"` : ''}${p.maxLength >= 0 ? html` maxlength="${p.maxLength}"` : ''}${p.autocomplete ? html` autocomplete="${p.autocomplete}"` : ''}${p.enterKeyHint ? html` enterkeyhint="${p.enterKeyHint}"` : ''}`;
}

export const textareaDef = defineComponent({
  tag: 'neu-textarea',
  props,
  delegatesFocus: true,
  form: { valueProp: 'value' },
  styles: textareaStyles,
  // The newline after the opening tag is dropped by the HTML parser, so a value that itself starts
  // with a newline keeps it.
  template: (p) =>
    html`<div part="base" class="base"><label part="label" class="label" for="input"><slot name="label"><span class="label-text" data-ref="label-text">${p.label}</span></slot></label><div part="control" class="control"><textarea part="textarea" class="input" id="input" data-ref="input" rows="${rowsOf(p.rows)}" aria-describedby="help"${areaAttributes(p)}>
${p.value}</textarea></div><div part="help-text" class="help" id="help"><slot name="help-text"><span class="help-text" data-ref="help-text">${p.helpText}</span></slot><span class="error-text" data-ref="error-text">${p.errorText}</span></div></div>`,
  docs: {
    summary:
      'A multi-line text input with an inset field. The value attribute is the default value; resize="auto" grows the field with its content.',
    events: [
      { name: 'input', description: 'Fired on every edit (the native input event, composed).' },
      { name: 'change', description: 'Fired when an edit is committed, usually on blur.' },
    ],
    slots: [
      { name: 'label', description: 'Rich label; replaces the label attribute.' },
      { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
    ],
    parts: [
      { name: 'base', description: 'Outer wrapper.' },
      { name: 'label', description: 'The <label> element.' },
      { name: 'control', description: 'The inset field around the textarea.' },
      { name: 'textarea', description: 'The native <textarea>.' },
      { name: 'help-text', description: 'Help or error text area.' },
    ],
    cssProperties: themeCssProperties,
  },
});
