import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const radioDocs: ComponentDocs = {
  summary:
    'One choice inside a neu-radio-group, which owns the value, the keyboard and the form. On its own it does nothing.',
  descriptions: {
    value: 'The value the group takes when this radio is selected; defaults to "on".',
    disabled: 'Prevents this radio from being selected or focused by arrow keys.',
  },
  events: [],
  slots: [{ name: '', description: 'Label; also the accessible name.' }],
  parts: [
    { name: 'base', description: 'Wrapper around control and label.' },
    { name: 'control', description: 'The inset ring.' },
    { name: 'indicator', description: 'The dot shown when selected.' },
    { name: 'label', description: 'Wrapper around the default slot.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
