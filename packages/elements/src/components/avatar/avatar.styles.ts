import { hostTheme } from '../../core/styles.js';

export const avatarStyles = `${hostTheme}
:host { display: inline-block; vertical-align: middle; --_neu-s: 2.5rem; inline-size: var(--_neu-s); block-size: var(--_neu-s); }
:host([size='sm']) { --_neu-s: 2rem; }
:host([size='lg']) { --_neu-s: 3.5rem; }
.base { display: flex; align-items: center; justify-content: center; box-sizing: border-box; inline-size: 100%; block-size: 100%; overflow: hidden; font-size: calc(var(--_neu-s) * 0.4); font-weight: 600; border-radius: 50%; box-shadow: var(--_neu-raised-sm); background: var(--_neu-bg); color: var(--_neu-fg-muted); }
:host([shape='rounded']) .base { border-radius: var(--_neu-r); }
.image, .initials, .icon { display: none; }
.image { inline-size: 100%; block-size: 100%; object-fit: cover; }
.base[data-show='image'] .image, .base[data-show='initials'] .initials { display: block; }
.base[data-show='icon'] .icon { display: flex; inline-size: 60%; block-size: 60%; }
.icon svg { inline-size: 100%; block-size: 100%; }
`;
