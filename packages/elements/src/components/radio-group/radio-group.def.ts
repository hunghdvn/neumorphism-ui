import { defineComponent } from '../../core/define.js';
import { html, type RawHtml } from '../../core/html.js';
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
 * The rule that shows the selected radio before any script ran (plan decision 7). Only radios that
 * are not defined yet: once upgraded, :state(checked) is the one source, so a duplicate value
 * marks the first match only. cssString leaves nothing for `html` to escape, and the quotes are
 * static text, so the style holds the same bytes on the server and in the client.
 */
export function markRule(value: string): RawHtml | '' {
  return value === ''
    ? ''
    : html`::slotted(neu-radio:not(:defined)[value="${cssString(value)}"]){--_neu-radio-on:1}`;
}

export const radioGroupDef = defineComponent({
  tag: 'neu-radio-group',
  props: {
    label: { type: 'string' },
    name: { type: 'string' },
    value: { type: 'string' },
    required: { type: 'boolean' },
    disabled: { type: 'boolean' },
    orientation: {
      type: 'string',
      default: 'vertical',
      values: ['vertical', 'horizontal'],
    },
  },
  form: { valueProp: 'value' },
  styles: radioGroupStyles,
  template: (p) =>
    html`<div part="base" class="base"><span part="label" class="label"><slot name="label"><span class="label-text" data-ref="label-text">${p.label}</span></slot></span><span class="items"><slot></slot></span><style data-ref="mark">${markRule(p.value)}</style></div>`,
});
