import { defineConfig } from 'vitest/config';
import { browserTest } from '../../vitest.shared.ts';

export default defineConfig({ test: browserTest({ include: ['test/**/*.test.ts'] }) });
