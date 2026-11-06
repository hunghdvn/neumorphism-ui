import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const badgeDocs: ComponentDocs = {
  summary: 'A small raised label for status or counts.',
  descriptions: {
    variant: "The colour that conveys the badge's meaning.",
    pill: 'Rounds the badge into a capsule shape.',
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
