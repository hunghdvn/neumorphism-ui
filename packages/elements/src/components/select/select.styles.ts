import { fieldStyles } from '../shared/field.styles.js';

export const selectStyles = `${fieldStyles}
.label { display: block; }
.combobox {
  display: flex; align-items: center; gap: 0.5rem; min-block-size: 2.75rem; padding-inline: 0.875rem 0.75rem;
  border-radius: var(--_neu-r); background: var(--_neu-bg); box-shadow: var(--_neu-raised-sm);
  font-size: 0.9375rem; cursor: pointer; user-select: none; outline: none;
  transition: box-shadow var(--_neu-dur) ease;
}
:host([size='sm']) .combobox { min-block-size: 2.25rem; padding-inline: 0.75rem 0.625rem; font-size: 0.875rem; }
:host([size='lg']) .combobox { min-block-size: 3.25rem; padding-inline: 1rem 0.875rem; font-size: 1rem; }
.combobox[aria-expanded='true'] { box-shadow: var(--_neu-inset-sm); }
.combobox:focus-visible { box-shadow: var(--_neu-raised-sm), var(--_neu-focus); }
.combobox[aria-expanded='true']:focus-visible { box-shadow: var(--_neu-inset-sm), var(--_neu-focus); }
:host(:state(user-invalid)) .combobox {
  box-shadow:
    calc(var(--_neu-d) * 0.5) calc(var(--_neu-d) * 0.5) var(--_neu-d) color-mix(in oklab, var(--_neu-danger) 45%, var(--_neu-sd)),
    calc(var(--_neu-d) * -0.5) calc(var(--_neu-d) * -0.5) var(--_neu-d) var(--_neu-sl);
}
:host(:disabled) .combobox, :host([disabled]) .combobox { opacity: 0.6; cursor: not-allowed; }
.display { flex: 1; min-inline-size: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.placeholder { color: var(--_neu-fg-muted); }
.chevron { display: inline-flex; flex: none; color: var(--_neu-fg-muted); transition: transform var(--_neu-dur) ease; }
.chevron svg { inline-size: 1rem; block-size: 1rem; }
.combobox[aria-expanded='true'] .chevron { transform: rotate(180deg); }
.listbox {
  position: fixed; inset: auto; margin: 0; max-block-size: 16rem; overflow: auto;
  padding: 0.375rem; border: none; border-radius: var(--_neu-r);
  background: var(--_neu-bg); color: var(--_neu-fg); box-shadow: var(--_neu-raised); font-size: 0.9375rem;
}
.option { padding: 0.5rem 0.625rem; border-radius: calc(var(--_neu-r) * 0.75); cursor: pointer; user-select: none; }
.option.active { box-shadow: var(--_neu-inset-sm); }
.option[aria-selected='true'] { color: var(--_neu-accent-c); font-weight: 600; }
.option[aria-disabled='true'] { color: var(--_neu-fg-muted); cursor: not-allowed; }
`;
