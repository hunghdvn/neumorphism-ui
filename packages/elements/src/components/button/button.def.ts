import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { buttonStyles } from './button.styles.js';

export const buttonDef = defineComponent({
  tag: 'neu-button',
  props: {
    variant: {
      type: 'string',
      default: 'default',
      values: ['default', 'primary', 'flat'],
      reflect: true,
    },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
    disabled: { type: 'boolean', reflect: true },
    loading: { type: 'boolean', reflect: true },
    type: {
      type: 'string',
      default: 'button',
      values: ['button', 'submit', 'reset'],
      reflect: true,
    },
  },
  styles: buttonStyles,
  template: () =>
    html`<span part="base" class="base"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span><span part="spinner" class="spinner" aria-hidden="true"></span></span>`,
  docs: {
    summary: 'A raised button. Use variant="primary" for the main action of a view.',
    events: [
      { name: 'click', description: 'Fired on activation; never while disabled or loading.' },
    ],
    slots: [
      { name: '', description: 'Button label.' },
      { name: 'prefix', description: 'Content before the label, such as an icon.' },
      { name: 'suffix', description: 'Content after the label.' },
    ],
    parts: [
      { name: 'base', description: 'The raised surface.' },
      { name: 'label', description: 'Wrapper around the default slot.' },
      { name: 'prefix', description: 'Wrapper around the prefix slot.' },
      { name: 'suffix', description: 'Wrapper around the suffix slot.' },
      { name: 'spinner', description: 'Spinner shown while loading.' },
    ],
    cssProperties: themeCssProperties,
  },
});
