import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { radioStyles } from './radio.styles.js';

export const radioDef = defineComponent({
  tag: 'neu-radio',
  props: {
    value: { type: 'string', default: 'on' },
    disabled: { type: 'boolean' },
  },
  styles: radioStyles,
  template: () =>
    html`<span part="base" class="base"><span part="control" class="control"><span part="indicator" class="indicator"></span></span><span part="label" class="label"><slot></slot></span></span>`,
  docs: {
    summary:
      'One choice inside a neu-radio-group, which owns the value, the keyboard and the form. On its own it does nothing.',
    events: [],
    slots: [{ name: '', description: 'Label; also the accessible name.' }],
    parts: [
      { name: 'base', description: 'Wrapper around control and label.' },
      { name: 'control', description: 'The inset ring.' },
      { name: 'indicator', description: 'The dot shown when selected.' },
      { name: 'label', description: 'Wrapper around the default slot.' },
    ],
    cssProperties: themeCssProperties,
  },
});
