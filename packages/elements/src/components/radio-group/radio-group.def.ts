import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { radioGroupStyles } from './radio-group.styles.js';

/**
 * Escapes a value for a double-quoted CSS string. Besides the characters that end the string,
 * `&`, `<`, `>` and `'` are hex-escaped too, so `html` leaves the text alone: it is raw text in a
 * <style>, where an HTML entity would never be decoded.
 */
export function cssString(value: string): string {
  return value.replace(/[\\"'&<>\r\n\f]/g, (char) => `\\${char.charCodeAt(0).toString(16)} `);
}

/**
 * The rule that shows the selected radio before any script ran (plan decision 7). It is raw style
 * text, already safe (see cssString): `html` would turn its quotes into entities that stay literal.
 */
export function markRule(value: string): string {
  return value === '' ? '' : `::slotted(neu-radio[value="${cssString(value)}"]){--_neu-radio-on:1}`;
}

export const radioGroupDef = defineComponent({
  tag: 'neu-radio-group',
  props: {
    label: { type: 'string' },
    name: { type: 'string', reflect: true },
    value: { type: 'string' },
    required: { type: 'boolean', reflect: true },
    disabled: { type: 'boolean', reflect: true },
    orientation: {
      type: 'string',
      default: 'vertical',
      values: ['vertical', 'horizontal'],
      reflect: true,
    },
  },
  form: { valueProp: 'value' },
  styles: radioGroupStyles,
  template: (p) =>
    html`<div part="base" class="base"><span part="label" class="label" data-ref="label">${p.label}</span><span class="items"><slot></slot></span><style data-ref="mark">${unsafeHTML(markRule(p.value))}</style></div>`,
  docs: {
    summary:
      'A group of neu-radio elements with one selected value, arrow-key navigation and form support. The value attribute is the default value.',
    events: [
      { name: 'input', description: 'Fired when the user selects a radio.' },
      { name: 'change', description: 'Fired after input when the user selects a radio.' },
    ],
    slots: [{ name: '', description: 'neu-radio elements.' }],
    parts: [
      { name: 'base', description: 'Outer wrapper.' },
      { name: 'label', description: 'The group label.' },
    ],
    cssProperties: themeCssProperties,
  },
});
