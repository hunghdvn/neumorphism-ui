import { defineComponent } from '../../core/define.js';
import { html, type RawHtml } from '../../core/html.js';
import type { InferProps } from '../../core/props.js';
import { textFieldStyles } from './text-field.styles.js';

const props = {
  type: {
    type: 'string',
    default: 'text',
    values: ['text', 'email', 'password', 'search', 'tel', 'url'],
  },
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
  pattern: { type: 'string' },
  autocomplete: { type: 'string' },
  inputMode: { type: 'string', attribute: 'inputmode' },
  enterKeyHint: { type: 'string', attribute: 'enterkeyhint' },
  size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
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
});
