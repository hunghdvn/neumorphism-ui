import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const buttonDocs: ComponentDocs = {
  summary: 'A raised button. Use variant="primary" for the main action of a view.',
  descriptions: {
    variant: 'TODO',
    size: 'TODO',
    disabled: 'TODO',
    loading: 'TODO',
    type: 'TODO',
  },
  events: [{ name: 'click', description: 'Fired on activation; never while disabled or loading.' }],
  slots: [
    { name: '', description: 'Button label.' },
    { name: 'prefix', description: 'Content before the label, such as an icon.' },
    { name: 'suffix', description: 'Content after the label.' },
  ],
  parts: [
    { name: 'base', description: 'The raised surface.' },
    { name: 'label', description: 'Wrapper around the default slot.' },
    { name: 'prefix', description: 'Wrapper around the prefix slot.' },
    { name: 'suffix', description: 'Wrapper around the suffix slot.' },
    { name: 'spinner', description: 'Spinner shown while loading.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
