import { fieldStyles } from '../shared/field.styles.js';

export const textareaStyles = `${fieldStyles}
.control { align-items: stretch; }
.input {
  display: block; box-sizing: border-box; padding-block: 0.625rem; line-height: 1.4; resize: vertical;
}
:host([resize='none']) .input { resize: none; }
:host([resize='auto']) .input { resize: none; overflow: hidden; }
`;
