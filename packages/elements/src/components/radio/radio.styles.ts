import { hostTheme } from '../../core/styles.js';

export const radioStyles = `${hostTheme}
:host { display: inline-flex; vertical-align: middle; cursor: pointer; user-select: none; }
:host(:disabled), :host([disabled]) { cursor: not-allowed; }
:host(:state(checked)) { --_neu-radio-on: 1; }
.base { display: inline-flex; align-items: center; gap: 0.625rem; }
.control {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  inline-size: 1.25rem; block-size: 1.25rem; border-radius: 50%;
  background: var(--_neu-bg); box-shadow: var(--_neu-inset-sm);
  transition: box-shadow var(--_neu-dur) ease;
}
.indicator {
  display: block; inline-size: 50%; block-size: 50%; border-radius: 50%;
  background: var(--_neu-accent-c); transform: scale(var(--_neu-radio-on, 0));
  transition: transform var(--_neu-dur) ease;
}
:host(:focus-visible) .control { box-shadow: var(--_neu-inset-sm), var(--_neu-focus); }
:host([disabled]) .base { opacity: 0.55; }
.label { color: var(--_neu-fg); }
`;
