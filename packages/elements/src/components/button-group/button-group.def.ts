import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { buttonGroupStyles } from './button-group.styles.js';

export const buttonGroupDef = defineComponent({
  tag: 'neu-button-group',
  props: {
    label: { type: 'string', reflect: true },
    orientation: {
      type: 'string',
      default: 'horizontal',
      values: ['horizontal', 'vertical'],
      reflect: true,
    },
  },
  styles: buttonGroupStyles,
  template: () => html`<span part="base" class="base"><slot></slot></span>`,
  docs: {
    summary: 'Merges adjacent buttons into one raised block.',
    events: [],
    slots: [{ name: '', description: 'neu-button and neu-icon-button elements.' }],
    parts: [{ name: 'base', description: 'The raised wrapper around the buttons.' }],
    cssProperties: themeCssProperties,
  },
});
