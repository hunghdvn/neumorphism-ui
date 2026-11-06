import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const surfaceDocs: ComponentDocs = {
  summary: 'A neumorphic container with its own shape, elevation, radius and padding.',
  descriptions: {
    shape: 'How the surface is lit, from raised to inset.',
    elevation: 'How far the surface appears to lift off its background.',
    radius: 'How rounded the corners are.',
    padding: 'The space between the edge and the content.',
  },
  events: [],
  slots: [{ name: '', description: 'The content of the surface.' }],
  parts: [{ name: 'base', description: 'The surface itself.' }],
  cssProperties: themeCssProperties,
  keyboard: [],
};
