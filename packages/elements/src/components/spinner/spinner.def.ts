import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { spinnerStyles } from './spinner.styles.js';

export const spinnerDef = defineComponent({
  tag: 'neu-spinner',
  props: {
    label: { type: 'string', default: 'Loading' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
  },
  styles: spinnerStyles,
  // The label is also visually hidden text: a live region announces content, not its name.
  template: (p) =>
    html`<span part="base" class="base"><span part="track" class="track"></span><span part="indicator" class="indicator"></span><span class="label" data-ref="label">${p.label}</span></span>`,
  docs: {
    summary: 'A rotating indicator for work in progress.',
    events: [],
    slots: [],
    parts: [
      { name: 'base', description: 'The sized wrapper.' },
      { name: 'track', description: 'The inset ring behind the indicator.' },
      { name: 'indicator', description: 'The rotating arc.' },
    ],
    cssProperties: themeCssProperties,
  },
});
