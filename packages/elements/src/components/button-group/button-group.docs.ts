import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const buttonGroupDocs: ComponentDocs = {
  summary: 'Merges adjacent buttons into one raised block.',
  descriptions: {
    label: 'Accessible name of the group, announced by assistive technology.',
    orientation: 'The direction the buttons are laid out in.',
  },
  events: [],
  slots: [{ name: '', description: 'neu-button and neu-icon-button elements.' }],
  parts: [{ name: 'base', description: 'The raised wrapper around the buttons.' }],
  cssProperties: themeCssProperties,
  keyboard: [],
};
