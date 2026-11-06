import { fieldStyles } from '../shared/field.styles.js';

export const numberFieldStyles = `${fieldStyles}
.input { appearance: textfield; text-align: center; }
.input::-webkit-inner-spin-button, .input::-webkit-outer-spin-button { appearance: none; margin: 0; }
.step {
  display: inline-flex; flex: none; align-items: center; justify-content: center;
  inline-size: 1.75rem; block-size: 1.75rem; padding: 0; border: none; border-radius: 50%;
  background: var(--_neu-bg); color: var(--_neu-fg); box-shadow: var(--_neu-raised-sm);
  font: inherit; cursor: pointer;
  transition: box-shadow var(--_neu-dur) ease;
}
.step:active:not(:disabled) { box-shadow: var(--_neu-inset-sm); }
.step:disabled { box-shadow: none; color: var(--_neu-fg-muted); cursor: not-allowed; }
.step svg { inline-size: 1rem; block-size: 1rem; }
`;
