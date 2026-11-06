import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const badgeDocs: ComponentDocs = {
  summary: 'A small raised label for status or counts.',
  descriptions: {
    variant: 'TODO',
    pill: 'TODO',
  },
  events: [],
  slots: [{ name: '', description: 'The badge text.' }],
  parts: [{ name: 'base', description: 'The badge itself.' }],
  cssProperties: [
    ...themeCssProperties,
    { name: '--neu-success', description: 'Colour of the success variant.' },
    { name: '--neu-warning', description: 'Colour of the warning variant.' },
  ],
  keyboard: [],
};
