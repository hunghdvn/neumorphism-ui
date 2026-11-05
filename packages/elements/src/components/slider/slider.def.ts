import { defineComponent } from '../../core/define.js';
import { html } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
import { sliderStyles } from './slider.styles.js';

/** The step a slider really uses: a step of 0 or less is 1. */
export const sliderUnit = (step: number): number => (step > 0 ? step : 1);

/** Decimal places of a number as written, exponent notation included. */
function decimals(n: number): number {
  const [, fraction = '', exponent = '0'] = /(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(n)) ?? [];
  return Math.min(100, Math.max(0, fraction.length - Number(exponent)));
}

/**
 * The value `raw` becomes on a slider: the nearest step counted from min, inside [min, max]
 * (plan decision 9). max < min counts as max = min, a step of 0 or less as 1, NaN as the midpoint.
 * Rounded to the decimals of step and min, so 0.1 + 0.2 on a 0.1 step is 0.3.
 */
export function sliderValue(raw: number, min: number, max: number, step: number): number {
  const hi = Math.max(min, max);
  const unit = sliderUnit(step);
  const wanted = Number.isNaN(raw) ? min + (hi - min) / 2 : raw;
  let steps = Math.round((wanted - min) / unit);
  // Rounding up may pass max: the largest step that fits is the answer. The epsilon absorbs
  // float noise such as (0.3 - 0) / 0.1 = 2.9999999999999996.
  if (min + steps * unit > hi) steps = Math.floor((hi - min) / unit + 1e-9);
  const value = min + Math.max(0, steps) * unit;
  return Number(Math.min(value, hi).toFixed(Math.max(decimals(unit), decimals(min))));
}

/** What PageUp and PageDown move by: a tenth of the range in whole steps, at least one step. */
export function sliderBigStep(min: number, max: number, step: number): number {
  const unit = sliderUnit(step);
  const tenth = Math.round((Math.max(min, max) - min) / 10 / unit) * unit;
  return Number(Math.max(unit, tenth).toFixed(decimals(unit)));
}

/** The `style` of `.base`: where the thumb sits, 0 to 1. Template and update() write the same bytes. */
export function sliderStyle(value: number, min: number, max: number): string {
  const range = Math.max(min, max) - min;
  const pos = range > 0 ? Math.round(((value - min) / range) * 1e4) / 1e4 : 0;
  return `--_neu-pos:${pos}`;
}

export const sliderDef = defineComponent({
  tag: 'neu-slider',
  props: {
    value: { type: 'number', default: Number.NaN },
    min: { type: 'number', default: 0 },
    max: { type: 'number', default: 100 },
    step: { type: 'number', default: 1 },
    name: { type: 'string', reflect: true },
    label: { type: 'string' },
    disabled: { type: 'boolean', reflect: true },
  },
  form: { valueProp: 'value' },
  properties: { valueFormatter: '(value: number) => string' },
  styles: sliderStyles,
  template: (p) =>
    html`<span part="base" class="base" data-ref="base" style="${sliderStyle(sliderValue(p.value, p.min, p.max, p.step), p.min, p.max)}"><span part="track" class="track" data-ref="track"><span part="fill" class="fill"></span><span part="thumb" class="thumb"></span></span></span>`,
  docs: {
    summary:
      'A horizontal slider for a number. The value attribute is the default; the value property is the current value. The valueFormatter property turns the value into the text a screen reader announces.',
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
  },
});
