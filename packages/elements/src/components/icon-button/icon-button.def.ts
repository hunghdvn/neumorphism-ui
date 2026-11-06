import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { systemIconSvg } from '../icon/system-icons.js';
import { iconButtonStyles } from './icon-button.styles.js';

export const iconButtonDef = defineComponent({
  tag: 'neu-icon-button',
  props: {
    icon: { type: 'string' },
    library: { type: 'string', default: 'system' },
    label: { type: 'string' },
    shape: { type: 'string', default: 'circle', values: ['circle', 'square'] },
    variant: {
      type: 'string',
      default: 'default',
      values: ['default', 'primary', 'flat'],
    },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
    disabled: { type: 'boolean' },
    type: {
      type: 'string',
      default: 'button',
      values: ['button', 'submit', 'reset'],
    },
  },
  styles: iconButtonStyles,
  template: (p) => {
    const svg = p.library === 'system' ? systemIconSvg(p.icon) : undefined;
    return html`<span part="base" class="base"><span part="icon" class="icon" data-ref="icon">${svg === undefined ? '' : unsafeHTML(svg)}</span></span>`;
  },
  docs: {
    summary: 'A raised button that shows an icon instead of a label. Name it with label.',
    events: [{ name: 'click', description: 'Fired on activation; never while disabled.' }],
    slots: [],
    parts: [
      { name: 'base', description: 'The raised surface.' },
      { name: 'icon', description: 'Wrapper around the icon.' },
      { name: 'svg', description: 'The rendered SVG element.' },
    ],
    cssProperties: themeCssProperties,
  },
});
