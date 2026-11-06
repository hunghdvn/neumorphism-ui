import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const textareaDocs: ComponentDocs = {
  summary:
    'A multi-line text input with an inset field. The value attribute is the default value; resize="auto" grows the field with its content.',
  descriptions: {
    value: 'The current text as typed or set by script.',
    name: 'The name under which the text is submitted with a form.',
    label: 'Visible label text; the label slot replaces it.',
    placeholder: 'Hint shown while the field is empty.',
    helpText: 'Guidance shown below the field; the help-text slot replaces it.',
    errorText: 'Message shown below the field, marking it invalid while it is set.',
    required: 'Makes the form invalid while the field is empty.',
    disabled: 'Prevents interaction and leaves the field out of form submission.',
    readOnly: 'Keeps the text visible and submitted but not editable.',
    minLength: 'The fewest characters the text must have.',
    maxLength: 'The most characters the text may have.',
    autocomplete: "Hint for the browser's autofill, as for the native attribute.",
    enterKeyHint: "Hint for the label of the virtual keyboard's Enter key.",
    rows: 'The number of visible text lines; falls back to 3 for anything but a positive integer.',
    resize: "How the user or the content can change the field's height.",
    size: 'The field size.',
    defaultValue:
      'The text the field starts with, which a form reset restores; set by the value attribute.',
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
