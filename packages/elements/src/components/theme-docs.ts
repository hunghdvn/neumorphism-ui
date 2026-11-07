import type { DocEntry } from '../core/define.js';

/** The theme tokens every component documents; docs only, so it stays out of the core bundle. */
export const themeCssProperties: readonly DocEntry[] = [
  { name: '--neu-bg', description: 'Surface colour; shadows and text are derived from it.' },
  { name: '--neu-accent', description: 'Accent colour.' },
  { name: '--neu-distance', description: 'Shadow distance for the md size.' },
  { name: '--neu-intensity', description: 'Shadow strength multiplier.' },
  { name: '--neu-radius', description: 'Corner radius for the md size.' },
];
