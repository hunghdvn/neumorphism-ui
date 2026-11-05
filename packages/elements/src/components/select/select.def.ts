import { defineComponent, type OptionData } from '../../core/define.js';
import { html, unsafeHTML } from '../../core/html.js';
import { themeCssProperties } from '../../core/styles.js';
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
    name: { type: 'string', reflect: true },
    label: { type: 'string' },
    placeholder: { type: 'string' },
    helpText: { type: 'string' },
    errorText: { type: 'string' },
    required: { type: 'boolean', reflect: true },
    disabled: { type: 'boolean', reflect: true },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
  },
  delegatesFocus: true,
  form: { valueProp: 'value' },
  optionsFrom: 'neu-option',
  styles: selectStyles,
  // The client renders without ctx and update() fills the display, so both roots end up the same.
  template: (p, ctx) => {
    const picked = pickOption(ctx?.options, p.value);
    return html`<div part="base" class="base"><span part="label" class="label" id="label" data-ref="label">${p.label}</span><div part="combobox" class="combobox" id="combobox" role="combobox"${p.disabled ? html` aria-disabled="true"` : html` tabindex="0"`} aria-haspopup="listbox" aria-expanded="false" aria-controls="listbox" aria-labelledby="label" aria-describedby="help"${p.required ? html` aria-required="true"` : ''} data-ref="combobox"><span part="display" class="display${picked ? '' : ' placeholder'}" data-ref="display">${picked ? picked.label : p.placeholder}</span><span part="chevron" class="chevron">${chevron}</span></div><div part="listbox" class="listbox" id="listbox" role="listbox" aria-labelledby="label" popover="auto" data-ref="listbox"></div><div part="help-text" class="help" id="help"><slot name="help-text"><span class="help-text" data-ref="help-text">${p.helpText}</span></slot><span class="error-text" data-ref="error-text">${p.errorText}</span></div></div>`;
  },
  docs: {
    summary:
      'A single-value select (the APG select-only combobox): a raised trigger and a popover listbox built from the neu-option children, which are data only. The value attribute is the default value.',
    events: [
      { name: 'input', description: 'Fired when the user chooses an option with a new value.' },
      { name: 'change', description: 'Fired after input when the user chooses a new value.' },
      { name: 'neu-open', description: 'Fired when the listbox opens.' },
      { name: 'neu-close', description: 'Fired when the listbox closes.' },
    ],
    slots: [
      { name: 'help-text', description: 'Rich help text; replaces the help-text attribute.' },
    ],
    parts: [
      { name: 'base', description: 'Outer wrapper.' },
      { name: 'label', description: 'The label text.' },
      { name: 'combobox', description: 'The raised trigger that holds focus.' },
      { name: 'display', description: 'The selected label, or the placeholder.' },
      { name: 'chevron', description: 'The chevron icon.' },
      { name: 'listbox', description: 'The popover list of options.' },
      { name: 'option', description: 'One option in the listbox.' },
      { name: 'help-text', description: 'Help or error text area.' },
    ],
    cssProperties: themeCssProperties,
  },
});
