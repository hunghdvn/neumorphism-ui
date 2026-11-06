import { defineComponent, type OptionData } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { chevronDownBody, svgWrap } from '../icon/system-icons.js';
import { selectStyles } from './select.styles.js';

/** The option a select shows for `value`: the first one whose value matches, as in the client. */
export function pickOption<T extends OptionData>(
  options: readonly T[] | undefined,
  value: string,
): T | undefined {
  return options?.find((option) => option.value === value);
}

const chevron = unsafeHTML(svgWrap(chevronDownBody));

export const selectDef = defineComponent({
  tag: 'neu-select',
  props: {
    value: { type: 'string' },
    name: { type: 'string' },
    label: { type: 'string' },
    placeholder: { type: 'string' },
    helpText: { type: 'string' },
    errorText: { type: 'string' },
    required: { type: 'boolean' },
    disabled: { type: 'boolean' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'] },
  },
  delegatesFocus: true,
  form: { valueProp: 'value' },
  optionsFrom: 'neu-option',
  styles: selectStyles,
  // The client renders without ctx and update() fills the display, so both roots end up the same.
  template: (p, ctx) => {
    const picked = pickOption(ctx?.options, p.value);
    // Options the server could not read (e.g. a custom component's children) leave a set value's
    // display empty rather than showing the placeholder; update() fills it after hydration.
    const unread = !picked && p.value !== '' && ctx?.options?.length === 0;
    return html`<div part="base" class="base"><span part="label" class="label" id="label" data-ref="label"><slot name="label"><span class="label-text" data-ref="label-text">${p.label}</span></slot></span><div part="combobox" class="combobox" id="combobox" role="combobox"${p.disabled ? html` aria-disabled="true"` : html` tabindex="0"`} aria-haspopup="listbox" aria-expanded="false" aria-controls="listbox" aria-labelledby="label" aria-describedby="help"${p.required ? html` aria-required="true"` : ''} data-ref="combobox"><span part="display" class="display${picked || unread ? '' : ' placeholder'}" data-ref="display">${picked ? picked.label : unread ? '' : p.placeholder}</span><span part="chevron" class="chevron">${chevron}</span></div><div part="listbox" class="listbox" id="listbox" role="listbox" aria-labelledby="label" popover="auto" data-ref="listbox"></div><div part="help-text" class="help" id="help"><slot name="help-text"><span class="help-text" data-ref="help-text">${p.helpText}</span></slot><span class="error-text" data-ref="error-text">${p.errorText}</span></div></div>`;
  },
});
