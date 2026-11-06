import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { switchStyles } from './switch.styles.js';

export const switchDef = defineComponent({
  tag: 'neu-switch',
  props: {
    checked: { type: 'boolean' },
    name: { type: 'string' },
    value: { type: 'string', default: 'on' },
    disabled: { type: 'boolean' },
    required: { type: 'boolean' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
  },
  form: { valueProp: 'checked' },
  styles: switchStyles,
  template: (p) =>
    html`<span part="base" class="base"><span part="track" class="track${p.checked ? ' on' : ''}" data-ref="track"><span part="thumb" class="thumb"></span></span><span part="label" class="label"><slot></slot></span></span>`,
  docs: {
    summary: 'An on/off switch. The checked attribute is the default state.',
    events: [
      { name: 'input', description: 'Fired when the user toggles the switch.' },
      { name: 'change', description: 'Fired after input when the user toggles the switch.' },
    ],
    slots: [{ name: '', description: 'Label; also the accessible name.' }],
    parts: [
      { name: 'base', description: 'Wrapper around track and label.' },
      { name: 'track', description: 'The inset track.' },
      { name: 'thumb', description: 'The raised thumb.' },
      { name: 'label', description: 'Wrapper around the default slot.' },
    ],
    cssProperties: themeCssProperties,
  },
});
