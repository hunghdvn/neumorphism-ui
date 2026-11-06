import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const avatarDocs: ComponentDocs = {
  summary:
    'A user picture that falls back to initials, then to a generic user icon. With `label` it is an image named by it; without, it is decorative and hidden from assistive technology.',
  descriptions: {
    src: 'TODO',
    label: 'TODO',
    initials: 'TODO',
    size: 'TODO',
    shape: 'TODO',
  },
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
  keyboard: [],
};
