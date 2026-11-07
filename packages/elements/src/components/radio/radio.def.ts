import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
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
});
