import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { buttonGroupStyles } from './button-group.styles.js';

export const buttonGroupDef = defineComponent({
  tag: 'neu-button-group',
  props: {
    label: { type: 'string' },
    orientation: {
      type: 'string',
      default: 'horizontal',
      values: ['horizontal', 'vertical'],
    },
  },
  styles: buttonGroupStyles,
  template: () => html`<span part="base" class="base"><slot></slot></span>`,
});
