import { hostTheme } from '../../core/styles.js';

export const switchStyles = `${hostTheme}
:host {
  display: inline-flex; vertical-align: middle; cursor: pointer; user-select: none;
  --_track-w: 2.875rem; --_track-h: 1.625rem; --_thumb: 1.25rem;
}
:host([size='sm']) { --_track-w: 2.25rem; --_track-h: 1.25rem; --_thumb: 0.9375rem; }
:host([size='lg']) { --_track-w: 3.5rem; --_track-h: 2rem; --_thumb: 1.5rem; }
:host([disabled]) { cursor: not-allowed; }
.base { display: inline-flex; align-items: center; gap: 0.625rem; }
.track {
  position: relative; flex: none; inline-size: var(--_track-w); block-size: var(--_track-h);
  border-radius: 999px; background: var(--_neu-bg); box-shadow: var(--_neu-inset-sm);
  transition: background-color var(--_neu-dur) ease, box-shadow var(--_neu-dur) ease;
}
.track.on { background: var(--_neu-accent-soft); }
.thumb {
  position: absolute; inset-block-start: 50%;
  inset-inline-start: calc((var(--_track-h) - var(--_thumb)) / 2);
  inline-size: var(--_thumb); block-size: var(--_thumb); border-radius: 50%;
  background: var(--_neu-bg); box-shadow: var(--_neu-raised-sm); transform: translateY(-50%);
  transition: inset-inline-start var(--_neu-dur) ease;
}
.track.on .thumb { inset-inline-start: calc(var(--_track-w) - var(--_thumb) - (var(--_track-h) - var(--_thumb)) / 2); }
:host(:focus-visible) .track { box-shadow: var(--_neu-inset-sm), var(--_neu-focus); }
:host([disabled]) .base { opacity: 0.55; }
:host(:state(user-invalid)) .track { box-shadow: var(--_neu-inset-sm), 0 0 0 2px color-mix(in oklab, var(--_neu-danger) 55%, transparent); }
.label { color: var(--_neu-fg); }
`;
