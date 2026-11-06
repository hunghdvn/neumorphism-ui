import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML, type RawHtml } from '../../core/html.js';
import type { InferProps } from '../../core/props.js';
import { themeCssProperties } from '../../core/styles.js';
import { minusBody, plusBody, svgWrap } from '../icon/system-icons.js';
import { stepUnit } from '../shared/step.js';
import { numberFieldStyles } from './number-field.styles.js';

const props = {
  value: { type: 'string' },
  min: { type: 'number', default: Number.NaN },
  max: { type: 'number', default: Number.NaN },
  step: { type: 'number', default: 1 },
  name: { type: 'string', reflect: true },
  label: { type: 'string' },
  placeholder: { type: 'string' },
  helpText: { type: 'string' },
  errorText: { type: 'string' },
  required: { type: 'boolean', reflect: true },
  disabled: { type: 'boolean', reflect: true },
  readOnly: { type: 'boolean', reflect: true, attribute: 'readonly' },
  size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
  incrementLabel: { type: 'string', default: 'Increase' },
  decrementLabel: { type: 'string', default: 'Decrease' },
} as const;

export type NumberFieldProps = InferProps<typeof props>;

/** iOS has no minus key on the decimal keypad: ask for it only when negatives are out of range. */
export const decimalPad = (min: number): boolean => Number.isFinite(min) && min >= 0;

/** Attributes of the inner <input> that only appear when set. */
function inputAttributes(p: NumberFieldProps): RawHtml {
  return html`${decimalPad(p.min) ? html` inputmode="decimal"` : ''}${Number.isFinite(p.min) ? html` min="${p.min}"` : ''}${Number.isFinite(p.max) ? html` max="${p.max}"` : ''}${p.placeholder ? html` placeholder="${p.placeholder}"` : ''}${p.required ? html` required` : ''}${p.disabled ? html` disabled` : ''}${p.readOnly ? html` readonly` : ''}`;
}

const icon = (body: string) => unsafeHTML(svgWrap(body));

export const numberFieldDef = defineComponent({
  tag: 'neu-number-field',
  props,
  delegatesFocus: true,
  form: { valueProp: 'value' },
  styles: numberFieldStyles,
  template: (p) => {
    const off = p.disabled || p.readOnly ? html` disabled` : '';
    return html`<div part="base" class="base"><label part="label" class="label" for="input"><slot name="label"><span class="label-text" data-ref="label-text">${p.label}</span></slot></label><div part="control" class="control"><button part="decrement" class="step" type="button" tabindex="-1" aria-label="${p.decrementLabel}" data-ref="decrement"${off}>${icon(minusBody)}</button><input part="input" class="input" id="input" data-ref="input" type="number" value="${p.value}" step="${stepUnit(p.step)}" aria-describedby="help"${inputAttributes(p)}><button part="increment" class="step" type="button" tabindex="-1" aria-label="${p.incrementLabel}" data-ref="increment"${off}>${icon(plusBody)}</button></div><div part="help-text" class="help" id="help"><slot name="help-text"><span class="help-text" data-ref="help-text">${p.helpText}</span></slot><span class="error-text" data-ref="error-text">${p.errorText}</span></div></div>`;
  },
  docs: {
    summary:
      'A numeric input with an inset field and stepper buttons. The value attribute is the default value.',
    events: [
      { name: 'input', description: 'Fired on every edit and every step (composed).' },
      { name: 'change', description: 'Fired when an edit is committed, or after each step.' },
    ],
    slots: [
      { name: 'label', description: 'Rich label; replaces the label attribute.' },
      { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
    ],
    parts: [
      { name: 'base', description: 'Outer wrapper.' },
      { name: 'label', description: 'The <label> element.' },
      { name: 'control', description: 'The inset field around the input and buttons.' },
      { name: 'input', description: 'The native <input type="number">.' },
      { name: 'decrement', description: 'The button that lowers the value.' },
      { name: 'increment', description: 'The button that raises the value.' },
      { name: 'help-text', description: 'Help or error text area.' },
    ],
    cssProperties: themeCssProperties,
  },
});
