import { hostTheme } from '../../core/styles.js';

export const surfaceStyles = `${hostTheme}
:host { display: block; --_neu-raised-lg: calc(var(--_neu-d) * 2) calc(var(--_neu-d) * 2) calc(var(--_neu-d) * 4) var(--_neu-sd), calc(var(--_neu-d) * -2) calc(var(--_neu-d) * -2) calc(var(--_neu-d) * 4) var(--_neu-sl); --_neu-inset-lg: inset calc(var(--_neu-d) * 2) calc(var(--_neu-d) * 2) calc(var(--_neu-d) * 4) var(--_neu-sd), inset calc(var(--_neu-d) * -2) calc(var(--_neu-d) * -2) calc(var(--_neu-d) * 4) var(--_neu-sl); --_neu-up: var(--_neu-raised); --_neu-down: var(--_neu-inset); --_neu-hi: color-mix(in oklab, var(--_neu-bg), white 8%); --_neu-lo: color-mix(in oklab, var(--_neu-bg), black 6%); }
:host([elevation='sm']) { --_neu-up: var(--_neu-raised-sm); --_neu-down: var(--_neu-inset-sm); }
:host([elevation='lg']) { --_neu-up: var(--_neu-raised-lg); --_neu-down: var(--_neu-inset-lg); }
.base { background: var(--_neu-bg); color: var(--_neu-fg); box-shadow: var(--_neu-up); border-radius: var(--_neu-r); padding: 1.25rem; }
:host([shape='inset']) .base { box-shadow: var(--_neu-down); }
:host([shape='flat']) .base { box-shadow: none; }
:host([shape='convex']) .base { background: linear-gradient(145deg, var(--_neu-hi), var(--_neu-lo)); }
:host([shape='concave']) .base { background: linear-gradient(145deg, var(--_neu-lo), var(--_neu-hi)); }
:host([radius='sm']) .base { border-radius: calc(var(--_neu-r) * 0.5); }
:host([radius='lg']) .base { border-radius: calc(var(--_neu-r) * 2); }
:host([radius='full']) .base { border-radius: 999px; }
:host([padding='none']) .base { padding: 0; }
:host([padding='sm']) .base { padding: 0.75rem; }
:host([padding='lg']) .base { padding: 2rem; }
`;
