import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { spinnerStyles } from './spinner.styles.js';

export const spinnerDef = defineComponent({
  tag: 'neu-spinner',
  props: {
    label: { type: 'string', default: 'Loading' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
  },
  styles: spinnerStyles,
  // The label is also visually hidden text: a live region announces content, not its name.
  template: (p) =>
    html`<span part="base" class="base"><span part="track" class="track"></span><span part="indicator" class="indicator"></span><span class="label" data-ref="label">${p.label}</span></span>`,
});
