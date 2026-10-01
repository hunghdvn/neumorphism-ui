import { defineConfig } from 'vitest/config';
import { browserTest } from '../../vitest.shared.ts';

/** Runs the same tests against React 18.3 by aliasing react/react-dom to the npm: aliases. */
const react18 = [
  { find: /^react$/, replacement: 'react18' },
  { find: /^react\/(.*)$/, replacement: 'react18/$1' },
  { find: /^react-dom$/, replacement: 'react-dom18' },
  { find: /^react-dom\/(.*)$/, replacement: 'react-dom18/$1' },
];

// Pre-bundle the CommonJS React entries up front so Vite does not discover them mid-run on a cold
// cache and reload the page. The react18 project resolves the same specifiers through the alias.
const reactEntries = ['react', 'react-dom', 'react-dom/client'];

// A fresh object per project: Vitest names the browser instances in place, so sharing one would
// give both projects the same "(chromium)" instance names.
const browser = () => browserTest({ exclude: ['src/**/*.node.test.ts'] });

// React 18 server rendering is checked by scripts/ssr-react18.mjs (see the note at the top of this task).
export default defineConfig({
  test: {
    projects: [
      {
        optimizeDeps: { include: reactEntries },
        test: { ...browser(), name: 'browser-react19', provide: { reactMajor: 19 } },
      },
      {
        resolve: { alias: react18 },
        optimizeDeps: { include: reactEntries },
        test: { ...browser(), name: 'browser-react18', provide: { reactMajor: 18 } },
      },
      { test: { name: 'node-react19', include: ['src/**/*.node.test.ts'], environment: 'node' } },
    ],
  },
});
