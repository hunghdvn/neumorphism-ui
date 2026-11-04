import { hostTheme } from '../../core/styles.js';

export const dividerStyles = `${hostTheme}
:host { display: block; margin-block: 0.75rem; }
.base { display: block; border-block-start: 1px solid var(--_neu-sd); border-block-end: 1px solid var(--_neu-sl); }
:host([orientation='vertical']) { display: inline-block; align-self: stretch; min-block-size: 1em; margin-block: 0; margin-inline: 0.75rem; }
:host([orientation='vertical']) .base { block-size: 100%; border-block: 0; border-inline-start: 1px solid var(--_neu-sd); border-inline-end: 1px solid var(--_neu-sl); }
`;
