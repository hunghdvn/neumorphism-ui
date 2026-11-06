import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const textareaDocs: ComponentDocs = {
  summary:
    'A multi-line text input with an inset field. The value attribute is the default value; resize="auto" grows the field with its content.',
  descriptions: {
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
    autocomplete: 'TODO',
    enterKeyHint: 'TODO',
    rows: 'TODO',
    resize: 'TODO',
    size: 'TODO',
    defaultValue: 'TODO',
  },
  events: [
    { name: 'input', description: 'Fired on every edit (the native input event, composed).' },
    { name: 'change', description: 'Fired when an edit is committed, usually on blur.' },
  ],
  slots: [
    { name: 'label', description: 'Rich label; replaces the label attribute.' },
    { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
  ],
  parts: [
    { name: 'base', description: 'Outer wrapper.' },
    { name: 'label', description: 'The <label> element.' },
    { name: 'control', description: 'The inset field around the textarea.' },
    { name: 'textarea', description: 'The native <textarea>.' },
    { name: 'help-text', description: 'Help or error text area.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
