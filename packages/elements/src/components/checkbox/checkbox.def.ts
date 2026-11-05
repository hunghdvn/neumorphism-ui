import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { checkBody, minusBody, svgWrap } from '../icon/system-icons.js';
import { checkboxStyles } from './checkbox.styles.js';

const checkSvg = unsafeHTML(svgWrap(checkBody));
const minusSvg = unsafeHTML(svgWrap(minusBody));

export const checkboxDef = defineComponent({
  tag: 'neu-checkbox',
  props: {
    checked: { type: 'boolean' },
    indeterminate: { type: 'boolean' },
    name: { type: 'string', reflect: true },
    value: { type: 'string', default: 'on', reflect: true },
    disabled: { type: 'boolean', reflect: true },
    required: { type: 'boolean', reflect: true },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
  },
  form: { valueProp: 'checked' },
  styles: checkboxStyles,
  template: (p) =>
    html`<span part="base" class="base"><span part="control" class="control${p.checked ? ' on' : ''}${p.indeterminate ? ' mixed' : ''}" data-ref="control"><span part="indicator" class="indicator">${checkSvg}${minusSvg}</span></span><span part="label" class="label"><slot></slot></span></span>`,
  docs: {
    summary:
      'A checkbox. The checked attribute is the default state; indeterminate is a property whose attribute only sets the initial state.',
    events: [
      { name: 'input', description: 'Fired when the user toggles the checkbox.' },
      { name: 'change', description: 'Fired after input when the user toggles the checkbox.' },
    ],
    slots: [{ name: '', description: 'Label; also the accessible name.' }],
    parts: [
      { name: 'base', description: 'Wrapper around control and label.' },
      { name: 'control', description: 'The inset box.' },
      { name: 'indicator', description: 'The check or minus mark.' },
      { name: 'label', description: 'Wrapper around the default slot.' },
    ],
    cssProperties: themeCssProperties,
  },
});
