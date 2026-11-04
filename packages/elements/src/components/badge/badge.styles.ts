import { hostTheme } from '../../core/styles.js';

export const badgeStyles = `${hostTheme}
:host { display: inline-block; vertical-align: middle; --_neu-success: var(--neu-success, #3bb273); --_neu-warning: var(--neu-warning, #e6a23c); }
.base { display: inline-flex; align-items: center; min-block-size: 1.25rem; padding-inline: 0.5rem; font-size: 0.75rem; font-weight: 600; border-radius: calc(var(--_neu-r) * 0.5); box-shadow: var(--_neu-raised-sm); background: var(--_neu-bg); color: var(--_neu-fg-muted); }
:host([pill]) .base { border-radius: 999px; }
:host([variant='accent']) .base { color: var(--_neu-accent-c); }
:host([variant='success']) .base { color: var(--_neu-success); }
:host([variant='warning']) .base { color: var(--_neu-warning); }
:host([variant='danger']) .base { color: var(--_neu-danger); }
`;
