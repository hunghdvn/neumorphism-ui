import { defineConfig } from 'vitest/config';
import { browserTest } from '../../vitest.shared.ts';

export default defineConfig({
  optimizeDeps: { include: ['axe-core'] },
  test: browserTest(),
});
