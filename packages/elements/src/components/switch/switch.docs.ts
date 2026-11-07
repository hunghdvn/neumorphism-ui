import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const switchDocs: ComponentDocs = {
  summary: 'An on/off switch. The checked attribute is the default state.',
  descriptions: {
    checked: 'Whether the switch is currently on.',
    name: 'The name under which the value is submitted with a form.',
    value: 'The value submitted with the form while the switch is on; defaults to "on".',
    disabled: 'Prevents interaction and leaves the switch out of form submission.',
    required: 'Makes the form invalid until the switch is on.',
    size: 'The switch size.',
    defaultChecked:
      'Whether the switch starts on, which a form reset restores; set by the checked attribute.',
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
  keyboard: [{ name: 'Space / Enter', description: 'Toggles the switch.' }],
};
