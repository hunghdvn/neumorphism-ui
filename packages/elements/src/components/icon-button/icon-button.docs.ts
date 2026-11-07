import { themeCssProperties } from '../theme-docs.js';
import type { ComponentDocs } from '../../core/define.js';

export const iconButtonDocs: ComponentDocs = {
  summary: 'A raised button that shows an icon instead of a label. Name it with label.',
  descriptions: {
    icon: 'The name of the icon to show.',
    library: 'The icon library to take the icon from; defaults to the built-in system set.',
    label: 'Accessible name of the button, since it has no visible text.',
    shape: 'The outline of the button.',
    variant: 'The visual emphasis of the button.',
    size: 'The button size.',
    disabled: 'Prevents interaction and dims the button.',
    type: 'What the button does inside a form; defaults to "button", which does nothing.',
  },
  events: [{ name: 'click', description: 'Fired on activation; never while disabled.' }],
  slots: [],
  parts: [
    { name: 'base', description: 'The raised surface.' },
    { name: 'icon', description: 'Wrapper around the icon.' },
    { name: 'svg', description: 'The rendered SVG element.' },
  ],
  cssProperties: themeCssProperties,
  keyboard: [
    { name: 'Enter', description: 'Activates the button on keydown.' },
    { name: 'Space', description: 'Activates the button on keyup, like a native button.' },
  ],
};
