import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { optionStyles } from './option.styles.js';

export const optionDef = defineComponent({
  tag: 'neu-option',
  props: {
    value: { type: 'string', reflect: true },
    disabled: { type: 'boolean', reflect: true },
  },
  styles: optionStyles,
  template: () => html`<slot></slot>`,
  docs: {
    summary:
      'One choice of a neu-select. It is data only and never rendered: the select reads its value (the value attribute, or the label when there is none), its text as the label, and disabled.',
    events: [],
    slots: [{ name: '', description: 'The label, as plain text.' }],
    parts: [],
    cssProperties: [],
  },
});
