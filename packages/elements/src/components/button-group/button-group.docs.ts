import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const buttonGroupDocs: ComponentDocs = {
  summary: 'Merges adjacent buttons into one raised block.',
  descriptions: {
    label: 'TODO',
    orientation: 'TODO',
  },
  events: [],
  slots: [{ name: '', description: 'neu-button and neu-icon-button elements.' }],
  parts: [{ name: 'base', description: 'The raised wrapper around the buttons.' }],
  cssProperties: themeCssProperties,
  keyboard: [],
};
