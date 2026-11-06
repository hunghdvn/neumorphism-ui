import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const radioGroupDocs: ComponentDocs = {
  summary:
    'A group of neu-radio elements with one selected value, arrow-key navigation and form support. The value attribute is the default value.',
  descriptions: {
    label: 'TODO',
    name: 'TODO',
    value: 'TODO',
    required: 'TODO',
    disabled: 'TODO',
    orientation: 'TODO',
    defaultValue: 'TODO',
  },
  events: [
    { name: 'input', description: 'Fired when the user selects a radio.' },
    { name: 'change', description: 'Fired after input when the user selects a radio.' },
  ],
  slots: [{ name: '', description: 'neu-radio elements.' }],
  parts: [
    { name: 'base', description: 'Outer wrapper.' },
    { name: 'label', description: 'The group label.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
