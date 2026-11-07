import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { optionStyles } from './option.styles.js';

export const optionDef = defineComponent({
  tag: 'neu-option',
  props: {
    value: { type: 'string' },
    disabled: { type: 'boolean' },
  },
  styles: optionStyles,
  template: () => html`<slot></slot>`,
});
