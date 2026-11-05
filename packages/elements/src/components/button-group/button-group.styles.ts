import { hostTheme } from '../../core/styles.js';

/**
 * Merging is pure CSS: the group sets --_neu-grp-* on its slotted buttons, which read them. The
 * outer corners go to the first and last rendered children. Slotted buttons become flex boxes
 * whose base grows, so a stretched button is filled edge to edge (this outer ::slotted rule wins
 * over the button's own :host display). Both rules skip the same children that never render.
 */
export const buttonGroupStyles = `${hostTheme}
:host { display: inline-flex; vertical-align: middle; }
.base { display: inline-flex; border-radius: var(--_neu-r); box-shadow: var(--_neu-raised); }
:host([orientation='vertical']) .base { flex-direction: column; }
::slotted(*) { --_neu-grp-shadow: 0 0 transparent; --_neu-grp-ss: 0; --_neu-grp-se: 0; --_neu-grp-es: 0; --_neu-grp-ee: 0; }
::slotted(:not([hidden], template, script, style)) { display: flex; }
::slotted(:focus-visible) { position: relative; z-index: 1; }
:host(:not([orientation='vertical'])) ::slotted(:nth-child(1 of :not([hidden], template, script, style))) { --_neu-grp-ss: var(--_neu-r); --_neu-grp-es: var(--_neu-r); }
:host(:not([orientation='vertical'])) ::slotted(:nth-last-child(1 of :not([hidden], template, script, style))) { --_neu-grp-se: var(--_neu-r); --_neu-grp-ee: var(--_neu-r); }
:host([orientation='vertical']) ::slotted(:nth-child(1 of :not([hidden], template, script, style))) { --_neu-grp-ss: var(--_neu-r); --_neu-grp-se: var(--_neu-r); }
:host([orientation='vertical']) ::slotted(:nth-last-child(1 of :not([hidden], template, script, style))) { --_neu-grp-es: var(--_neu-r); --_neu-grp-ee: var(--_neu-r); }
`;
