import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const avatarDocs: ComponentDocs = {
  summary:
    'A user picture that falls back to initials, then to a generic user icon. With `label` it is an image named by it; without, it is decorative and hidden from assistive technology.',
  descriptions: {
    src: 'URL of the picture; when it is missing or empty the initials or the icon show instead.',
    label:
      'Accessible name that turns the avatar into an image; without it the avatar is decorative.',
    initials: "Text shown when there is no picture, such as a person's initials.",
    size: 'The avatar size.',
    shape: 'The outline of the avatar.',
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
