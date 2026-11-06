import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const textFieldDocs: ComponentDocs = {
  summary:
    'A single-line text input with an inset field. The value attribute is the default value.',
  descriptions: {
    type: 'TODO',
    value: 'TODO',
    name: 'TODO',
    label: 'TODO',
    placeholder: 'TODO',
    helpText: 'TODO',
    errorText: 'TODO',
    required: 'TODO',
    disabled: 'TODO',
    readOnly: 'TODO',
    minLength: 'TODO',
    maxLength: 'TODO',
    pattern: 'TODO',
    autocomplete: 'TODO',
    inputMode: 'TODO',
    enterKeyHint: 'TODO',
    size: 'TODO',
    defaultValue: 'TODO',
  },
  events: [
    { name: 'input', description: 'Fired on every edit (the native input event, composed).' },
    { name: 'change', description: 'Fired when an edit is committed, usually on blur.' },
  ],
  slots: [
    { name: 'label', description: 'Rich label; replaces the label attribute.' },
    { name: 'prefix', description: 'Content before the input, such as an icon.' },
    { name: 'suffix', description: 'Content after the input.' },
    { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
  ],
  parts: [
    { name: 'base', description: 'Outer wrapper.' },
    { name: 'label', description: 'The <label> element.' },
    { name: 'control', description: 'The inset field around the input.' },
    { name: 'input', description: 'The native <input>.' },
    { name: 'prefix', description: 'Wrapper around the prefix slot.' },
    { name: 'suffix', description: 'Wrapper around the suffix slot.' },
    { name: 'help-text', description: 'Help or error text area.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
