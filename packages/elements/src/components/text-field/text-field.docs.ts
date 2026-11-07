import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const textFieldDocs: ComponentDocs = {
  summary:
    'A single-line text input with an inset field. The value attribute is the default value.',
  descriptions: {
    type: 'The kind of text the field accepts, which sets its keyboard and masking and drives email and url validation.',
    value: 'The current text as typed or set by script.',
    name: 'The name under which the text is submitted with a form.',
    label: 'Visible label text; the label slot replaces it.',
    placeholder: 'Hint shown while the field is empty.',
    helpText: 'Guidance shown below the field; the help-text slot replaces it.',
    errorText:
      "Shown in place of the browser's validation message once the field is invalid after user interaction; does not itself make the field invalid.",
    required: 'Makes the form invalid while the field is empty.',
    disabled: 'Prevents interaction and leaves the field out of form submission.',
    readOnly: 'Keeps the text visible and submitted but not editable.',
    minLength:
      'The fewest characters the text must have; checked after user edits, like native, not on script-set values.',
    maxLength:
      'The most characters the text may have; checked after user edits, like native, not a hard limit on script-set values.',
    pattern: 'A regular expression the whole text must match.',
    autocomplete: "Hint for the browser's autofill, as for the native attribute.",
    inputMode: 'Hint for which virtual keyboard to show.',
    enterKeyHint: "Hint for the label of the virtual keyboard's Enter key.",
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
