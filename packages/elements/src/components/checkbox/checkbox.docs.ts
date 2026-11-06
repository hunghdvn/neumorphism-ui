import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const checkboxDocs: ComponentDocs = {
  summary:
    'A checkbox. The checked attribute is the default state; indeterminate is a property that the attribute also sets.',
  descriptions: {
    checked: 'Whether the checkbox is currently checked.',
    indeterminate:
      'Shows the mixed state; the attribute is observed, so changing it later also sets the property.',
    name: 'The name under which the value is submitted with a form.',
    value: 'The value submitted with the form while the checkbox is checked; defaults to "on".',
    disabled: 'Prevents interaction and leaves the checkbox out of form submission.',
    required: 'Makes the form invalid until the checkbox is checked.',
    size: 'The checkbox size.',
    defaultChecked:
      'Whether the checkbox starts checked, which a form reset restores; set by the checked attribute.',
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
  keyboard: [{ name: 'Space', description: 'Toggles the checkbox.' }],
};
