import type { DocEntry } from './define.js';

/**
 * Re-declares the derived theme values on every host (spec §5.3). Fallbacks are the light
 * defaults from @neu-ui/tokens so components still look right without the tokens stylesheet;
 * styles.test.ts keeps the two in sync.
 */
export const hostTheme = `
:host {
  --_neu-bg: var(--neu-bg, #e0e5ec);
  --_neu-accent-c: var(--neu-accent, #6d5dfc);
  --_neu-d: var(--neu-distance, 6px);
  --_neu-k: var(--neu-intensity, 1);
  --_neu-r: var(--neu-radius, 12px);
  --_neu-danger: var(--neu-danger, #e5484d);
  --_neu-dur: var(--neu-duration, 150ms);
  --_neu-sd: var(--neu-shadow-dark, color-mix(in oklab, var(--_neu-bg), black min(100%, calc(var(--_neu-shade, 18%) * var(--_neu-k)))));
  --_neu-sl: var(--neu-shadow-light, color-mix(in oklab, var(--_neu-bg), white min(100%, calc(var(--_neu-light, 100%) * var(--_neu-k)))));
  --_neu-fg: var(--neu-fg, color-mix(in oklab, var(--_neu-bg), var(--_neu-ink, black) var(--_neu-fg-mix, 32%)));
  --_neu-fg-muted: var(--neu-fg-muted, color-mix(in oklab, var(--_neu-bg), var(--_neu-ink, black) var(--_neu-fg-muted-mix, 18%)));
  --_neu-accent-soft: color-mix(in oklab, var(--_neu-accent-c) 25%, var(--_neu-bg));
  --_neu-focus: 0 0 0 3px color-mix(in oklab, var(--_neu-accent-c) 45%, transparent);
  --_neu-raised: var(--_neu-d) var(--_neu-d) calc(var(--_neu-d) * 2) var(--_neu-sd), calc(var(--_neu-d) * -1) calc(var(--_neu-d) * -1) calc(var(--_neu-d) * 2) var(--_neu-sl);
  --_neu-raised-sm: calc(var(--_neu-d) * 0.5) calc(var(--_neu-d) * 0.5) var(--_neu-d) var(--_neu-sd), calc(var(--_neu-d) * -0.5) calc(var(--_neu-d) * -0.5) var(--_neu-d) var(--_neu-sl);
  --_neu-inset: inset var(--_neu-d) var(--_neu-d) calc(var(--_neu-d) * 2) var(--_neu-sd), inset calc(var(--_neu-d) * -1) calc(var(--_neu-d) * -1) calc(var(--_neu-d) * 2) var(--_neu-sl);
  --_neu-inset-sm: inset calc(var(--_neu-d) * 0.5) calc(var(--_neu-d) * 0.5) var(--_neu-d) var(--_neu-sd), inset calc(var(--_neu-d) * -0.5) calc(var(--_neu-d) * -0.5) var(--_neu-d) var(--_neu-sl);
  font-family: var(--neu-font);
  color: var(--_neu-fg);
  -webkit-tap-highlight-color: transparent;
}
:host(:not(:defined)) { visibility: inherit !important; min-block-size: auto !important; }
:host([hidden]) { display: none !important; }
:host(:focus) { outline: none; }
*, *::before, *::after { box-sizing: border-box; }
`;

export const themeCssProperties: readonly DocEntry[] = [
  { name: '--neu-bg', description: 'Surface colour; shadows and text are derived from it.' },
  { name: '--neu-accent', description: 'Accent colour.' },
  { name: '--neu-distance', description: 'Shadow distance for the md size.' },
  { name: '--neu-intensity', description: 'Shadow strength multiplier.' },
  { name: '--neu-radius', description: 'Corner radius for the md size.' },
];
