import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const sliderDocs: ComponentDocs = {
  summary:
    'A horizontal slider for a number. The value attribute is the default; the value property is the current value. The valueFormatter property turns the value into the text a screen reader announces.',
  descriptions: {
    value: 'TODO',
    min: 'TODO',
    max: 'TODO',
    step: 'TODO',
    name: 'TODO',
    label: 'TODO',
    disabled: 'TODO',
    defaultValue: 'TODO',
    valueFormatter: 'TODO',
  },
  events: [
    {
      name: 'input',
      description: 'Fired on every change while the user drags or presses a key.',
    },
    {
      name: 'change',
      description: 'Fired after the user commits a change: on release, or per key.',
    },
  ],
  slots: [],
  parts: [
    { name: 'base', description: 'Wrapper around the track.' },
    { name: 'track', description: 'The inset groove.' },
    { name: 'fill', description: 'The part of the track up to the thumb.' },
    { name: 'thumb', description: 'The raised handle.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [],
};
