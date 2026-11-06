import { defineComponent } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { checkBody, minusBody, svgWrap } from '../icon/system-icons.js';
import { checkboxStyles } from './checkbox.styles.js';

const checkSvg = unsafeHTML(svgWrap(checkBody));
const minusSvg = unsafeHTML(svgWrap(minusBody));

export const checkboxDef = defineComponent({
  tag: 'neu-checkbox',
  props: {
    checked: { type: 'boolean' },
    indeterminate: { type: 'boolean', reflect: false },
    name: { type: 'string' },
    value: { type: 'string', default: 'on' },
    disabled: { type: 'boolean' },
    required: { type: 'boolean' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
  },
  form: { valueProp: 'checked' },
  styles: checkboxStyles,
  template: (p) =>
    html`<span part="base" class="base"><span part="control" class="control${p.checked ? ' on' : ''}${p.indeterminate ? ' mixed' : ''}" data-ref="control"><span part="indicator" class="indicator">${checkSvg}${minusSvg}</span></span><span part="label" class="label"><slot></slot></span></span>`,
});
