import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { surfaceStyles } from './surface.styles.js';

export const surfaceDef = defineComponent({
  tag: 'neu-surface',
  props: {
    shape: {
      type: 'string',
      default: 'raised',
      values: ['raised', 'inset', 'flat', 'convex', 'concave'],
    },
    elevation: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
    radius: { type: 'string', default: 'md', values: ['sm', 'md', 'lg', 'full'] },
    padding: { type: 'string', default: 'md', values: ['none', 'sm', 'md', 'lg'] },
  },
  styles: surfaceStyles,
  template: () => html`<div part="base" class="base"><slot></slot></div>`,
  docs: {
    summary: 'A neumorphic container with its own shape, elevation, radius and padding.',
    events: [],
    slots: [{ name: '', description: 'The content of the surface.' }],
    parts: [{ name: 'base', description: 'The surface itself.' }],
    cssProperties: themeCssProperties,
  },
});
