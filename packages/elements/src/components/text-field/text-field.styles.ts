import { fieldStyles } from '../shared/field.styles.js';

export const textFieldStyles = `${fieldStyles}
.prefix, .suffix { display: inline-flex; }
::slotted([slot='prefix']) { margin-inline-end: 0.5rem; }
::slotted([slot='suffix']) { margin-inline-start: 0.5rem; }
`;
