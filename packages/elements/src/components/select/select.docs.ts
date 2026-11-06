import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const selectDocs: ComponentDocs = {
  summary:
    'A single-value select (the APG select-only combobox): a raised trigger and a popover listbox built from the neu-option children, which are data only. The value attribute is the default value.',
  descriptions: {
    value: 'TODO',
    name: 'TODO',
    label: 'TODO',
    placeholder: 'TODO',
    helpText: 'TODO',
    errorText: 'TODO',
    required: 'TODO',
    disabled: 'TODO',
    size: 'TODO',
    defaultValue: 'TODO',
  },
  events: [
    { name: 'input', description: 'Fired when the user chooses an option with a new value.' },
    { name: 'change', description: 'Fired after input when the user chooses a new value.' },
    { name: 'neu-open', description: 'Fired when the listbox opens.' },
    { name: 'neu-close', description: 'Fired when the listbox closes.' },
  ],
  slots: [{ name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' }],
  parts: [
    { name: 'base', description: 'Outer wrapper.' },
    { name: 'label', description: 'The label text.' },
    { name: 'combobox', description: 'The raised trigger that holds focus.' },
    { name: 'display', description: 'The selected label, or the placeholder.' },
    { name: 'chevron', description: 'The chevron icon.' },
    { name: 'listbox', description: 'The popover list of options.' },
    { name: 'option', description: 'One option in the listbox.' },
    { name: 'help-text', description: 'Help or error text area.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
