import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const numberFieldDocs: ComponentDocs = {
  summary:
    'A numeric input with an inset field and stepper buttons. The value attribute is the default value.',
  descriptions: {
    value: 'The current number as typed or set by script, as a string.',
    min: 'The lowest accepted value, also the target of the Home key.',
    max: 'The highest accepted value, also the target of the End key.',
    step: 'The amount one step changes the value by, and the granularity values must match.',
    name: 'The name under which the value is submitted with a form.',
    label: 'Visible label text; the label slot replaces it.',
    placeholder: 'Hint shown while the field is empty.',
    helpText: 'Guidance shown below the field; the help-text slot replaces it.',
    errorText: 'Message shown below the field, marking it invalid while it is set.',
    required: 'Makes the form invalid while the field is empty.',
    disabled: 'Prevents interaction and leaves the field out of form submission.',
    readOnly: 'Keeps the value visible and submitted but not editable.',
    size: 'The field size.',
    incrementLabel: 'Accessible name of the button that raises the value; defaults to "Increase".',
    decrementLabel: 'Accessible name of the button that lowers the value; defaults to "Decrease".',
    defaultValue:
      'The value the field starts with, which a form reset restores; set by the value attribute.',
  },
  events: [
    { name: 'input', description: 'Fired on every edit and every step (composed).' },
    { name: 'change', description: 'Fired when an edit is committed, or after each step.' },
  ],
  slots: [
    { name: 'label', description: 'Rich label; replaces the label attribute.' },
    { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
  ],
  parts: [
    { name: 'base', description: 'Outer wrapper.' },
    { name: 'label', description: 'The <label> element.' },
    { name: 'control', description: 'The inset field around the input and buttons.' },
    { name: 'input', description: 'The native <input type="number">.' },
    { name: 'decrement', description: 'The button that lowers the value.' },
    { name: 'increment', description: 'The button that raises the value.' },
    { name: 'help-text', description: 'Help or error text area.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [
    { name: 'ArrowUp / ArrowDown', description: 'Steps the value up or down by step.' },
    { name: 'PageUp / PageDown', description: 'Steps the value up or down by ten times step.' },
    { name: 'Home / End', description: 'Sets the value to min or max, when set.' },
  ],
};
