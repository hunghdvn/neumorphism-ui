import { hostTheme } from '../../core/styles.js';

/** Merging is pure CSS: the group sets --_neu-grp-* on its slotted buttons, which read them. */
export const buttonGroupStyles = `${hostTheme}
:host { display: inline-flex; vertical-align: middle; }
.base { display: inline-flex; border-radius: var(--_neu-r); box-shadow: var(--_neu-raised); }
:host([orientation='vertical']) .base { flex-direction: column; }
::slotted(*) { --_neu-grp-shadow: 0 0 transparent; --_neu-grp-ss: 0; --_neu-grp-se: 0; --_neu-grp-es: 0; --_neu-grp-ee: 0; }
:host(:not([orientation='vertical'])) ::slotted(:first-child) { --_neu-grp-ss: var(--_neu-r); --_neu-grp-es: var(--_neu-r); }
:host(:not([orientation='vertical'])) ::slotted(:last-child) { --_neu-grp-se: var(--_neu-r); --_neu-grp-ee: var(--_neu-r); }
:host([orientation='vertical']) ::slotted(:first-child) { --_neu-grp-ss: var(--_neu-r); --_neu-grp-se: var(--_neu-r); }
:host([orientation='vertical']) ::slotted(:last-child) { --_neu-grp-es: var(--_neu-r); --_neu-grp-ee: var(--_neu-r); }
`;
