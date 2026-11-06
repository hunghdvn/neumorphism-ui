import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const numberFieldDocs: ComponentDocs = {
  summary:
    'A numeric input with an inset field and stepper buttons. The value attribute is the default value.',
  descriptions: {
    value: 'TODO',
    min: 'TODO',
    max: 'TODO',
    step: 'TODO',
    name: 'TODO',
    label: 'TODO',
    placeholder: 'TODO',
    helpText: 'TODO',
    errorText: 'TODO',
    required: 'TODO',
    disabled: 'TODO',
    readOnly: 'TODO',
    size: 'TODO',
    incrementLabel: 'TODO',
    decrementLabel: 'TODO',
    defaultValue: 'TODO',
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
  keyboard: [],
};
