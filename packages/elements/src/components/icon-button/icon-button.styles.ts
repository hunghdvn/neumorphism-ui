import { buttonBaseStyles } from '../button/button.styles.js';

/** --_neu-ib-size is the square box; neu-button-group reads it as the minimum when it stretches one. */
export const iconButtonStyles = `${buttonBaseStyles}
:host { --_neu-ib-size: 2.5rem; inline-size: var(--_neu-ib-size); block-size: var(--_neu-ib-size); }
:host([size='sm']) { --_neu-ib-size: 2rem; }
:host([size='lg']) { --_neu-ib-size: 3rem; }
.base { inline-size: 100%; block-size: 100%; --_neu-rr: 50%; }
:host([shape='square']) .base { --_neu-rr: var(--_neu-r); }
.icon { display: block; inline-size: 1.125rem; block-size: 1.125rem; contain: paint; }
:host([size='sm']) .icon { inline-size: 1rem; block-size: 1rem; }
:host([size='lg']) .icon { inline-size: 1.375rem; block-size: 1.375rem; }
.icon svg { display: block; inline-size: 100%; block-size: 100%; }
`;
