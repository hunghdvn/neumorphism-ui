import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { iconStyles } from './icon.styles.js';
import { systemIconSvg } from './system-icons.js';

export const iconDef = defineComponent({
  tag: 'neu-icon',
  props: {
    name: { type: 'string' },
    library: { type: 'string', default: 'system' },
    label: { type: 'string' },
  },
  styles: iconStyles,
  template: (p) => {
    const svg = p.library === 'system' ? systemIconSvg(p.name) : undefined;
    return html`<span class="box" data-ref="box">${svg === undefined ? '' : unsafeHTML(svg)}</span>`;
  },
  docs: {
    summary: 'A vector icon from the built-in set or a registered icon library.',
    events: [],
    slots: [],
    parts: [{ name: 'svg', description: 'The rendered SVG element.' }],
    cssProperties: [],
  },
});
