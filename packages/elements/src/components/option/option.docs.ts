import type { ComponentDocs } from '../../core/define.js';

export const optionDocs: ComponentDocs = {
  summary:
    'One choice of a neu-select. It is data only and never rendered: the select reads its value (the value attribute, or the label when there is none), its text as the label, and disabled.',
  descriptions: {
    value: 'TODO',
    disabled: 'TODO',
  },
  events: [],
  slots: [{ name: '', description: 'The label, as plain text.' }],
  parts: [],
  cssProperties: [],
  keyboard: [],
};
