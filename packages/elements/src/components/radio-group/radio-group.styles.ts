import { hostTheme } from '../../core/styles.js';

export const radioGroupStyles = `${hostTheme}
:host { display: block; }
:host(:disabled), :host([disabled]) { cursor: not-allowed; }
.base { display: flex; flex-direction: column; }
.label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--_neu-fg-muted); }
.label-text, ::slotted([slot='label']) { display: block; margin-block-end: 0.5rem; }
.label-text:empty { display: none; }
.items { display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem; }
:host([orientation='horizontal']) .items { flex-direction: row; flex-wrap: wrap; align-items: center; }
:host(:disabled) .items, :host([disabled]) .items { opacity: 0.55; cursor: not-allowed; }
:host(:state(user-invalid)) .label { color: var(--_neu-danger); }
`;
