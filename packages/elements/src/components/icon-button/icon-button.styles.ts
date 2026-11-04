import { buttonBaseStyles } from '../button/button.styles.js';

export const iconButtonStyles = `${buttonBaseStyles}
:host { inline-size: 2.5rem; block-size: 2.5rem; }
:host([size='sm']) { inline-size: 2rem; block-size: 2rem; }
:host([size='lg']) { inline-size: 3rem; block-size: 3rem; }
.base { inline-size: 100%; block-size: 100%; border-radius: 50%; }
:host([shape='square']) .base { border-radius: var(--_neu-r); }
.icon { display: block; inline-size: 1.125rem; block-size: 1.125rem; }
:host([size='sm']) .icon { inline-size: 1rem; block-size: 1rem; }
:host([size='lg']) .icon { inline-size: 1.375rem; block-size: 1.375rem; }
.icon svg { display: block; inline-size: 100%; block-size: 100%; }
`;
