import { defineComponent } from '../../core/define.js';
import { html, type RawHtml } from '../../core/html.js';
import type { InferProps } from '../../core/props.js';
import { themeCssProperties } from '../../core/styles.js';
import { textFieldStyles } from './text-field.styles.js';

const props = {
  type: {
    type: 'string',
    default: 'text',
    values: ['text', 'email', 'password', 'search', 'tel', 'url'],
    reflect: true,
  },
  value: { type: 'string' },
  name: { type: 'string', reflect: true },
  label: { type: 'string' },
  placeholder: { type: 'string' },
  helpText: { type: 'string' },
  errorText: { type: 'string' },
  required: { type: 'boolean', reflect: true },
  disabled: { type: 'boolean', reflect: true },
  readOnly: { type: 'boolean', reflect: true, attribute: 'readonly' },
  minLength: { type: 'number', default: -1, attribute: 'minlength' },
  maxLength: { type: 'number', default: -1, attribute: 'maxlength' },
  pattern: { type: 'string' },
  autocomplete: { type: 'string' },
  inputMode: { type: 'string', attribute: 'inputmode' },
  enterKeyHint: { type: 'string', attribute: 'enterkeyhint' },
  size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
} as const;

export type TextFieldProps = InferProps<typeof props>;

/** Attributes of the inner <input> that only appear when set. */
function inputAttributes(p: TextFieldProps): RawHtml {
  return html`${p.placeholder ? html` placeholder="${p.placeholder}"` : ''}${p.required ? html` required` : ''}${p.disabled ? html` disabled` : ''}${p.readOnly ? html` readonly` : ''}${p.minLength >= 0 ? html` minlength="${p.minLength}"` : ''}${p.maxLength >= 0 ? html` maxlength="${p.maxLength}"` : ''}${p.pattern ? html` pattern="${p.pattern}"` : ''}${p.autocomplete ? html` autocomplete="${p.autocomplete}"` : ''}${p.inputMode ? html` inputmode="${p.inputMode}"` : ''}${p.enterKeyHint ? html` enterkeyhint="${p.enterKeyHint}"` : ''}`;
}

export const textFieldDef = defineComponent({
  tag: 'neu-text-field',
  props,
  delegatesFocus: true,
  form: { valueProp: 'value' },
  styles: textFieldStyles,
  template: (p) =>
    html`<div part="base" class="base"><label part="label" class="label" for="input"><slot name="label"><span class="label-text" data-ref="label-text">${p.label}</span></slot></label><div part="control" class="control"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><input part="input" class="input" id="input" data-ref="input" type="${p.type}" value="${p.value}" aria-describedby="help"${inputAttributes(p)}><span part="suffix" class="suffix"><slot name="suffix"></slot></span></div><div part="help-text" class="help" id="help"><slot name="help-text"><span class="help-text" data-ref="help-text">${p.helpText}</span></slot><span class="error-text" data-ref="error-text">${p.errorText}</span></div></div>`,
  docs: {
    summary:
      'A single-line text input with an inset field. The value attribute is the default value.',
    events: [
      { name: 'input', description: 'Fired on every edit (the native input event, composed).' },
      { name: 'change', description: 'Fired when an edit is committed, usually on blur.' },
    ],
    slots: [
      { name: 'label', description: 'Rich label; replaces the label attribute.' },
      { name: 'prefix', description: 'Content before the input, such as an icon.' },
      { name: 'suffix', description: 'Content after the input.' },
      { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
    ],
    parts: [
      { name: 'base', description: 'Outer wrapper.' },
      { name: 'label', description: 'The <label> element.' },
      { name: 'control', description: 'The inset field around the input.' },
      { name: 'input', description: 'The native <input>.' },
      { name: 'prefix', description: 'Wrapper around the prefix slot.' },
      { name: 'suffix', description: 'Wrapper around the suffix slot.' },
      { name: 'help-text', description: 'Help or error text area.' },
    ],
    cssProperties: themeCssProperties,
  },
});
