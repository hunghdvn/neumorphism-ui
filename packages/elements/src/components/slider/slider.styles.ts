import { hostTheme } from '../../core/styles.js';

export const sliderStyles = `${hostTheme}
:host { display: block; min-block-size: 1.25rem; touch-action: none; cursor: pointer; user-select: none; }
:host(:disabled), :host([disabled]) { cursor: not-allowed; }
.base { position: relative; display: flex; align-items: center; block-size: 1.25rem; padding-inline: 0.625rem; }
.track { position: relative; flex: 1; block-size: 0.5rem; border-radius: 999px; background: var(--_neu-bg); box-shadow: var(--_neu-inset-sm); }
.fill { position: absolute; inset-block: 0; inset-inline-start: 0; inline-size: calc(var(--_neu-pos) * 100%); border-radius: inherit; background: var(--_neu-accent-soft); }
.thumb {
  position: absolute; inset-block-start: 50%; inset-inline-start: calc(var(--_neu-pos) * 100%);
  inline-size: 1.25rem; block-size: 1.25rem; margin-block-start: -0.625rem; margin-inline-start: -0.625rem;
  border-radius: 50%; background: var(--_neu-bg); box-shadow: var(--_neu-raised-sm);
  transition: box-shadow var(--_neu-dur) ease;
}
:host(:focus-visible) .thumb { box-shadow: var(--_neu-raised-sm), var(--_neu-focus); }
:host(:disabled) .base, :host([disabled]) .base { opacity: 0.55; }
`;
