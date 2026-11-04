import { hostTheme } from '../../core/styles.js';

/** Look and states shared by every button-like component; sizing is each component's own. */
export const buttonBaseStyles = `${hostTheme}
:host { display: inline-block; vertical-align: middle; cursor: pointer; user-select: none; }
:host(:disabled), :host([disabled]), :host([loading]) { cursor: not-allowed; }
.base {
  display: inline-flex; align-items: center; justify-content: center;
  border-start-start-radius: var(--_neu-grp-ss, var(--_neu-rr, var(--_neu-r))); border-start-end-radius: var(--_neu-grp-se, var(--_neu-rr, var(--_neu-r)));
  border-end-start-radius: var(--_neu-grp-es, var(--_neu-rr, var(--_neu-r))); border-end-end-radius: var(--_neu-grp-ee, var(--_neu-rr, var(--_neu-r)));
  background: var(--_neu-bg);
  color: var(--_neu-fg);
  box-shadow: var(--_neu-grp-shadow, var(--_neu-raised));
  transition: box-shadow var(--_neu-dur) ease, color var(--_neu-dur) ease;
}
:host([size='sm']) .base { box-shadow: var(--_neu-grp-shadow, var(--_neu-raised-sm)); }
:host([variant='primary']) .base { color: var(--_neu-accent-c); }
:host([variant='flat']) .base { box-shadow: none; }
:host([variant='flat']:hover:not(:disabled):not([disabled])) .base { box-shadow: var(--_neu-raised-sm); }
:host(:active:not(:disabled):not([disabled]):not([loading])) .base, :host(:state(pressed)) .base { box-shadow: var(--_neu-inset-sm); }
:host(:focus-visible) .base { box-shadow: var(--_neu-grp-shadow, var(--_neu-raised)), var(--_neu-focus); }
:host(:disabled) .base, :host([disabled]) .base { box-shadow: none; color: var(--_neu-fg-muted); }
`;

export const buttonStyles = `${buttonBaseStyles}
.base { min-block-size: 2.5rem; padding-inline: 1.125rem; font: inherit; font-weight: 600; font-size: 0.9375rem; line-height: 1; }
:host([size='sm']) .base { min-block-size: 2rem; padding-inline: 0.875rem; font-size: 0.8125rem; }
:host([size='lg']) .base { min-block-size: 3rem; padding-inline: 1.5rem; font-size: 1.0625rem; }
.prefix, .suffix { display: inline-flex; }
::slotted([slot='prefix']) { margin-inline-end: 0.5em; }
::slotted([slot='suffix']) { margin-inline-start: 0.5em; }
.spinner {
  display: none; inline-size: 1em; block-size: 1em; margin-inline-start: 0.5em; border-radius: 50%;
  border: 2px solid var(--_neu-accent-soft); border-block-start-color: var(--_neu-accent-c);
  animation: neu-spin 0.8s linear infinite;
}
:host([loading]) .spinner { display: inline-block; }
@keyframes neu-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
`;
