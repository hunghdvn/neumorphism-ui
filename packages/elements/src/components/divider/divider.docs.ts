import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const dividerDocs: ComponentDocs = {
  summary: 'A thin engraved line that separates content.',
  descriptions: {
    orientation: 'The direction the line runs in.',
  },
  events: [],
  slots: [],
  parts: [{ name: 'base', description: 'The engraved line.' }],
  cssProperties: themeCssProperties,
  keyboard: [],
};
