import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { systemIconSvg } from '../icon/system-icons.js';
import { avatarStyles } from './avatar.styles.js';

export const avatarDef = defineComponent({
  tag: 'neu-avatar',
  props: {
    src: { type: 'string', reflect: true },
    label: { type: 'string' },
    initials: { type: 'string' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
    shape: { type: 'string', default: 'circle', values: ['circle', 'rounded'], reflect: true },
  },
  styles: avatarStyles,
  template: (p) => {
    const show = p.src ? 'image' : p.initials ? 'initials' : 'icon';
    return html`<span part="base" class="base" data-ref="base" data-show="${show}"><img part="image" class="image" data-ref="image" alt=""${p.src ? html` src="${p.src}"` : ''}><span part="initials" class="initials" data-ref="initials">${p.initials}</span><span part="icon" class="icon">${unsafeHTML(systemIconSvg('user') ?? '')}</span></span>`;
  },
  docs: {
    summary: 'A user picture that falls back to initials, then to a generic user icon.',
    events: [],
    slots: [],
    parts: [
      { name: 'base', description: 'The sized, raised wrapper.' },
      { name: 'image', description: 'The picture.' },
      { name: 'initials', description: 'The initials shown when there is no picture.' },
      { name: 'icon', description: 'Wrapper around the fallback user icon.' },
      { name: 'svg', description: 'The rendered fallback SVG element.' },
    ],
    cssProperties: themeCssProperties,
  },
});
