import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const selectDocs: ComponentDocs = {
  summary:
    'A single-value select (the APG select-only combobox): a raised trigger and a popover listbox built from the neu-option children, which are data only. The value attribute is the default value.',
  descriptions: {
    value: 'The value of the currently chosen option.',
    name: 'The name under which the value is submitted with a form.',
    label: 'Visible label text that names the select.',
    placeholder: 'Text shown while no option is chosen.',
    helpText: 'Guidance shown below the select; the help-text slot replaces it.',
    errorText:
      "Shown in place of the browser's validation message once the select is invalid after user interaction; does not itself make the select invalid.",
    required: 'Makes the form invalid until an option is chosen.',
    disabled: 'Prevents interaction and leaves the select out of form submission.',
    size: 'The select size.',
    defaultValue:
      'The value chosen at the start, which a form reset restores; set by the value attribute.',
  },
  events: [
    { name: 'input', description: 'Fired when the user chooses an option with a new value.' },
    { name: 'change', description: 'Fired after input when the user chooses a new value.' },
    { name: 'neu-open', description: 'Fired when the listbox opens.' },
    { name: 'neu-close', description: 'Fired when the listbox closes.' },
  ],
  slots: [
    { name: 'label', description: 'Rich label; replaces the label attribute.' },
    { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
  ],
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
  keyboard: [
    { name: 'ArrowDown / ArrowUp / Enter / Space', description: 'When closed: opens the listbox.' },
    {
      name: 'Home / End',
      description: 'When closed: opens the listbox on the first or last option.',
    },
    {
      name: 'Printable characters',
      description: 'When closed: opens the listbox on the first matching option.',
    },
    {
      name: 'ArrowDown / ArrowUp',
      description: 'When open: moves to the next or previous option.',
    },
    { name: 'Home / End', description: 'When open: moves to the first or last option.' },
    { name: 'PageDown / PageUp', description: 'When open: moves ten options.' },
    { name: 'Enter / Space', description: 'When open: chooses the active option and closes.' },
    { name: 'Escape', description: 'When open: closes without changing the value.' },
    {
      name: 'Tab',
      description: 'When open: chooses the active option, closes and moves focus on.',
    },
    { name: 'Alt+ArrowUp', description: 'When open: chooses the active option and closes.' },
    {
      name: 'Printable characters',
      description:
        'When open: moves to the matching option; characters typed within 500 ms add up.',
    },
  ],
};
