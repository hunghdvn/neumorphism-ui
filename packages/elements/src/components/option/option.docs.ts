import type { ComponentDocs } from '../../core/define.js';

export const optionDocs: ComponentDocs = {
  summary:
    'One choice of a neu-select. It is data only and never rendered: the select reads its value (the value attribute, or the label when there is none), its text as the label, and disabled.',
  descriptions: {
    value:
      'The value the select takes when this option is chosen; the label is used when it is missing.',
    disabled: 'Keeps the option visible but not selectable.',
  },
  events: [],
  slots: [{ name: '', description: 'The label, as plain text.' }],
  parts: [],
  cssProperties: [],
  keyboard: [],
};
