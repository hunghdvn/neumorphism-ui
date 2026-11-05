import { hostTheme } from '../../core/styles.js';

export const checkboxStyles = `${hostTheme}
:host {
  display: inline-flex; vertical-align: middle; cursor: pointer; user-select: none;
  --_neu-box: 1.25rem;
}
:host([size='sm']) { --_neu-box: 1rem; }
:host([size='lg']) { --_neu-box: 1.5rem; }
:host(:disabled), :host([disabled]) { cursor: not-allowed; }
.base { display: inline-flex; align-items: center; gap: 0.625rem; }
.control {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  inline-size: var(--_neu-box); block-size: var(--_neu-box);
  border-radius: calc(var(--_neu-r) * 0.4); background: var(--_neu-bg); box-shadow: var(--_neu-inset-sm);
  color: var(--_neu-accent-c);
  transition: background-color var(--_neu-dur) ease, box-shadow var(--_neu-dur) ease;
}
.control.on, .control.mixed { background: var(--_neu-accent-soft); }
.indicator { display: inline-flex; inline-size: 80%; block-size: 80%; opacity: 0; }
.control.on .indicator, .control.mixed .indicator { opacity: 1; }
.indicator svg { inline-size: 100%; block-size: 100%; }
.indicator svg:last-child, .control.mixed .indicator svg:first-child { display: none; }
.control.mixed .indicator svg:last-child { display: block; }
:host(:focus-visible) .control { box-shadow: var(--_neu-inset-sm), var(--_neu-focus); }
:host(:disabled) .base, :host([disabled]) .base { opacity: 0.55; }
:host(:state(user-invalid)) .control { box-shadow: var(--_neu-inset-sm), 0 0 0 2px color-mix(in oklab, var(--_neu-danger) 55%, transparent); }
.label { color: var(--_neu-fg); }
`;
