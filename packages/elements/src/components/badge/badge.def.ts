import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { badgeStyles } from './badge.styles.js';

export const badgeDef = defineComponent({
  tag: 'neu-badge',
  props: {
    variant: {
      type: 'string',
      default: 'neutral',
      values: ['neutral', 'accent', 'success', 'warning', 'danger'],
      reflect: true,
    },
    pill: { type: 'boolean', reflect: true },
  },
  styles: badgeStyles,
  template: () => html`<span part="base" class="base"><slot></slot></span>`,
  docs: {
    summary: 'A small raised label for status or counts.',
    events: [],
    slots: [{ name: '', description: 'The badge text.' }],
    parts: [{ name: 'base', description: 'The badge itself.' }],
    cssProperties: [
      ...themeCssProperties,
      { name: '--neu-success', description: 'Colour of the success variant.' },
      { name: '--neu-warning', description: 'Colour of the warning variant.' },
    ],
  },
});
