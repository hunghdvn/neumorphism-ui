import type { ComponentDocs } from '../../core/define.js';

export const iconDocs: ComponentDocs = {
  summary: 'A vector icon from the built-in set or a registered icon library.',
  descriptions: {
    name: 'The name of the icon to show.',
    library: 'The icon library to take the icon from; defaults to the built-in system set.',
    label: 'Accessible name that turns the icon into an image; without it the icon is decorative.',
  },
  events: [],
  slots: [],
  parts: [{ name: 'svg', description: 'The rendered SVG element.' }],
  cssProperties: [],
  keyboard: [],
};
