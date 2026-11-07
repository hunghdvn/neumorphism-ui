import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
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
});
