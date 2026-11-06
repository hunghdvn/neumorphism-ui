import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const spinnerDocs: ComponentDocs = {
  summary: 'A rotating indicator for work in progress.',
  descriptions: {
    label: 'Accessible name announced for the spinner; defaults to "Loading".',
    size: 'The spinner size.',
  },
  events: [],
  slots: [],
  parts: [
    { name: 'base', description: 'The sized wrapper.' },
    { name: 'track', description: 'The inset ring behind the indicator.' },
    { name: 'indicator', description: 'The rotating arc.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
