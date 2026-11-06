import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const switchDocs: ComponentDocs = {
  summary: 'An on/off switch. The checked attribute is the default state.',
  descriptions: {
    checked: 'TODO',
    name: 'TODO',
    value: 'TODO',
    disabled: 'TODO',
    required: 'TODO',
    size: 'TODO',
    defaultChecked: 'TODO',
  },
  events: [
    { name: 'input', description: 'Fired when the user toggles the switch.' },
    { name: 'change', description: 'Fired after input when the user toggles the switch.' },
  ],
  slots: [{ name: '', description: 'Label; also the accessible name.' }],
  parts: [
    { name: 'base', description: 'Wrapper around track and label.' },
    { name: 'track', description: 'The inset track.' },
    { name: 'thumb', description: 'The raised thumb.' },
    { name: 'label', description: 'Wrapper around the default slot.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
