import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const surfaceDocs: ComponentDocs = {
  summary: 'A neumorphic container with its own shape, elevation, radius and padding.',
  descriptions: {
    shape: 'TODO',
    elevation: 'TODO',
    radius: 'TODO',
    padding: 'TODO',
  },
  events: [],
  slots: [{ name: '', description: 'The content of the surface.' }],
  parts: [{ name: 'base', description: 'The surface itself.' }],
  cssProperties: themeCssProperties,
  keyboard: [],
};
