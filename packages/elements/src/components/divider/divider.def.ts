import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { dividerStyles } from './divider.styles.js';

export const dividerDef = defineComponent({
  tag: 'neu-divider',
  props: {
    orientation: {
      type: 'string',
      default: 'horizontal',
      values: ['horizontal', 'vertical'],
      reflect: true,
    },
  },
  styles: dividerStyles,
  template: () => html`<span part="base" class="base"></span>`,
  docs: {
    summary: 'A thin engraved line that separates content.',
    events: [],
    slots: [],
    parts: [{ name: 'base', description: 'The engraved line.' }],
    cssProperties: themeCssProperties,
  },
});
