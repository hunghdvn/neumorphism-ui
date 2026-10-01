import { expect, test } from 'vitest';
import tokens from '../../../tokens/src/neu.css?inline';
import { hostTheme } from './styles.js';

/** Standalone fallbacks in components must equal the light defaults shipped in tokens. */
test.each([
  '--neu-bg',
  '--neu-accent',
  '--neu-distance',
  '--neu-intensity',
  '--neu-radius',
  '--neu-danger',
  '--neu-duration',
  '--_neu-shade',
  '--_neu-light',
  '--_neu-ink',
])('hostTheme fallback for %s matches the tokens default', (name) => {
  const tokenValue = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim();
  const fallback = new RegExp(`var\\(${name},\\s*([^)]+)\\)`).exec(hostTheme)?.[1]?.trim();
  expect(tokenValue).toBeDefined();
  expect(fallback).toBe(tokenValue);
});
