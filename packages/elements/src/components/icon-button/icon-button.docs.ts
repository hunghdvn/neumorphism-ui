import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const iconButtonDocs: ComponentDocs = {
  summary: 'A raised button that shows an icon instead of a label. Name it with label.',
  descriptions: {
    icon: 'TODO',
    library: 'TODO',
    label: 'TODO',
    shape: 'TODO',
    variant: 'TODO',
    size: 'TODO',
    disabled: 'TODO',
    type: 'TODO',
  },
  events: [{ name: 'click', description: 'Fired on activation; never while disabled.' }],
  slots: [],
  parts: [
    { name: 'base', description: 'The raised surface.' },
    { name: 'icon', description: 'Wrapper around the icon.' },
    { name: 'svg', description: 'The rendered SVG element.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
