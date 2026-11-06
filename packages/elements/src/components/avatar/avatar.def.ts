import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { systemIconSvg } from '../icon/system-icons.js';
import { avatarStyles } from './avatar.styles.js';

export const avatarDef = defineComponent({
  tag: 'neu-avatar',
  props: {
    src: { type: 'string' },
    label: { type: 'string' },
    initials: { type: 'string' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
    shape: { type: 'string', default: 'circle', values: ['circle', 'rounded'] },
  },
  styles: avatarStyles,
  template: (p) => {
    const show = p.src ? 'image' : p.initials.trim() ? 'initials' : 'icon';
    return html`<span part="base" class="base" data-ref="base" data-show="${show}"><img part="image" class="image" data-ref="image" alt=""${p.src ? html` src="${p.src}"` : ''}><span part="initials" class="initials" data-ref="initials">${p.initials}</span><span part="icon" class="icon">${unsafeHTML(systemIconSvg('user') ?? '')}</span></span>`;
  },
});
