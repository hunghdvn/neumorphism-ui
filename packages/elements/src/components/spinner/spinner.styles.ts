import { hostTheme } from '../../core/styles.js';

export const spinnerStyles = `${hostTheme}
:host { display: inline-block; vertical-align: middle; inline-size: 1.5rem; block-size: 1.5rem; }
:host([size='sm']) { inline-size: 1rem; block-size: 1rem; }
:host([size='lg']) { inline-size: 2.25rem; block-size: 2.25rem; }
.base { position: relative; display: block; inline-size: 100%; block-size: 100%; }
.track, .indicator { position: absolute; inset: 0; border-radius: 50%; }
.label { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.track { box-shadow: var(--_neu-inset-sm); }
.indicator { border: 3px solid transparent; border-block-start-color: var(--_neu-accent-c); animation: neu-spinner-rotate 0.9s linear infinite; }
@keyframes neu-spinner-rotate { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .indicator { animation-duration: 2.7s; } }
`;
