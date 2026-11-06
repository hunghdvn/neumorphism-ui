import { themeCssProperties } from '../../core/styles.js';
import type { ComponentDocs } from '../../core/define.js';

export const sliderDocs: ComponentDocs = {
  summary:
    'A horizontal slider for a number. The value attribute is the default; the value property is the current value. The valueFormatter property turns the value into the text a screen reader announces.',
  descriptions: {
    value: 'The current number, snapped to the nearest step within the range.',
    min: 'The lowest value of the range.',
    max: 'The highest value of the range.',
    step: 'The distance between allowed values.',
    name: 'The name under which the value is submitted with a form.',
    label: 'Accessible name of the slider.',
    disabled: 'Prevents interaction and leaves the slider out of form submission.',
    defaultValue:
      'The value the slider starts with, which a form reset restores; set by the value attribute.',
    valueFormatter: 'Function that turns the value into the text a screen reader announces.',
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
  keyboard: [
    {
      name: 'ArrowRight / ArrowUp',
      description: 'Increases the value by step; left and right swap in right-to-left text.',
    },
    { name: 'ArrowLeft / ArrowDown', description: 'Decreases the value by step.' },
    {
      name: 'PageUp / PageDown',
      description:
        'Changes the value by a large step: the larger of step and a tenth of the range.',
    },
    { name: 'Home / End', description: 'Sets the value to min or max.' },
  ],
};
