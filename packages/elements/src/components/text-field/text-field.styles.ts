import { hostTheme } from '../../core/styles.js';

export const textFieldStyles = `${hostTheme}
:host { display: block; }
:host(:disabled), :host([disabled]) { cursor: not-allowed; }
.base { display: flex; flex-direction: column; }
.label-text, ::slotted([slot='label']) {
  display: block; margin-block-end: 0.375rem;
  font-size: 0.8125rem; font-weight: 600; color: var(--_neu-fg-muted);
}
.label-text:empty { display: none; }
.control {
  display: flex; align-items: center; min-block-size: 2.75rem; padding-inline: 0.875rem;
  border-radius: var(--_neu-r); background: var(--_neu-bg); box-shadow: var(--_neu-inset);
  transition: box-shadow var(--_neu-dur) ease;
}
:host([size='sm']) .control { min-block-size: 2.25rem; padding-inline: 0.75rem; box-shadow: var(--_neu-inset-sm); }
:host([size='lg']) .control { min-block-size: 3.25rem; padding-inline: 1rem; }
:host(:focus-within) .control { box-shadow: var(--_neu-inset), var(--_neu-focus); }
:host(:state(user-invalid)) .control {
  box-shadow:
    inset var(--_neu-d) var(--_neu-d) calc(var(--_neu-d) * 2) color-mix(in oklab, var(--_neu-danger) 35%, var(--_neu-sd)),
    inset calc(var(--_neu-d) * -1) calc(var(--_neu-d) * -1) calc(var(--_neu-d) * 2) var(--_neu-sl);
}
:host(:disabled) .control, :host([disabled]) .control { box-shadow: var(--_neu-inset-sm); opacity: 0.6; }
.input {
  flex: 1; min-inline-size: 0; align-self: stretch; padding: 0; border: none; outline: none;
  background: transparent; color: inherit; font: inherit; font-size: 0.9375rem;
}
.input::placeholder { color: var(--_neu-fg-muted); opacity: 1; }
.prefix, .suffix { display: inline-flex; }
::slotted([slot='prefix']) { margin-inline-end: 0.5rem; }
::slotted([slot='suffix']) { margin-inline-start: 0.5rem; }
.help { font-size: 0.75rem; color: var(--_neu-fg-muted); }
.help-text, ::slotted([slot='help-text']) { display: block; margin-block-start: 0.375rem; }
.help-text:empty { display: none; }
.error-text { display: none; margin-block-start: 0.375rem; color: var(--_neu-danger); }
:host(:state(user-invalid)) slot[name='help-text'] { display: none; }
:host(:state(user-invalid)) .error-text:not(:empty) { display: block; }
`;
