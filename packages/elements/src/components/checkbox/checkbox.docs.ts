import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const checkboxDocs: ComponentDocs = {
  summary:
    'A checkbox. The checked attribute is the default state; indeterminate is a property whose attribute only sets the initial state.',
  descriptions: {
    checked: 'TODO',
    indeterminate: 'TODO',
    name: 'TODO',
    value: 'TODO',
    disabled: 'TODO',
    required: 'TODO',
    size: 'TODO',
    defaultChecked: 'TODO',
  },
  events: [
    { name: 'input', description: 'Fired when the user toggles the checkbox.' },
    { name: 'change', description: 'Fired after input when the user toggles the checkbox.' },
  ],
  slots: [{ name: '', description: 'Label; also the accessible name.' }],
  parts: [
    { name: 'base', description: 'Wrapper around control and label.' },
    { name: 'control', description: 'The inset box.' },
    { name: 'indicator', description: 'The check or minus mark.' },
    { name: 'label', description: 'Wrapper around the default slot.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
