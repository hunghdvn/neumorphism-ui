import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { badgeStyles } from './badge.styles.js';

export const badgeDef = defineComponent({
  tag: 'neu-badge',
  props: {
    variant: {
      type: 'string',
      default: 'neutral',
      values: ['neutral', 'accent', 'success', 'warning', 'danger'],
    },
    pill: { type: 'boolean' },
  },
  styles: badgeStyles,
  template: () => html`<span part="base" class="base"><slot></slot></span>`,
});
