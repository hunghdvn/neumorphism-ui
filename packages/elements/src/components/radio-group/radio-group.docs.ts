import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const radioGroupDocs: ComponentDocs = {
  summary:
    'A group of neu-radio elements with one selected value, arrow-key navigation and form support. The value attribute is the default value.',
  descriptions: {
    label: 'Visible label that names the group.',
    name: 'The name under which the selected value is submitted with a form.',
    value: 'The value of the currently selected radio.',
    required: 'Makes the form invalid until a radio is selected.',
    disabled: 'Prevents interaction with every radio in the group.',
    orientation: 'The direction the radios are laid out in.',
    defaultValue:
      'The value selected at the start, which a form reset restores; set by the value attribute.',
  },
  events: [
    { name: 'input', description: 'Fired when the user selects a radio.' },
    { name: 'change', description: 'Fired after input when the user selects a radio.' },
  ],
  slots: [
    { name: '', description: 'neu-radio elements.' },
    { name: 'label', description: 'Rich label; replaces the label attribute.' },
  ],
  parts: [
    { name: 'base', description: 'Outer wrapper.' },
    { name: 'label', description: 'The group label.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [
    {
      name: 'ArrowDown / ArrowRight',
      description: 'Moves to the next radio and selects it, wrapping and skipping disabled radios.',
    },
    {
      name: 'ArrowUp / ArrowLeft',
      description:
        'Moves to the previous radio and selects it, wrapping and skipping disabled radios.',
    },
    { name: 'Space', description: 'Selects the focused radio.' },
  ],
};
