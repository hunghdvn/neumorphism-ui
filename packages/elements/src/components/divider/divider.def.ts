import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { dividerStyles } from './divider.styles.js';

export const dividerDef = defineComponent({
  tag: 'neu-divider',
  props: {
    orientation: {
      type: 'string',
      default: 'horizontal',
      values: ['horizontal', 'vertical'],
    },
  },
  styles: dividerStyles,
  template: () => html`<span part="base" class="base"></span>`,
});
