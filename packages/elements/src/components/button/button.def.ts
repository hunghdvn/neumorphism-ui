import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { buttonStyles } from './button.styles.js';

export const buttonDef = defineComponent({
  tag: 'neu-button',
  props: {
    variant: {
      type: 'string',
      default: 'default',
      values: ['default', 'primary', 'flat'],
    },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
    disabled: { type: 'boolean' },
    loading: { type: 'boolean' },
    type: {
      type: 'string',
      default: 'button',
      values: ['button', 'submit', 'reset'],
    },
  },
  styles: buttonStyles,
  template: () =>
    html`<span part="base" class="base"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span><span part="spinner" class="spinner" aria-hidden="true"></span></span>`,
});
