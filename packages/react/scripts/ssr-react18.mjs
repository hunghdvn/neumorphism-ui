// React 18 SSR check. Vitest's node runner cannot alias `react` inside react-dom's CommonJS
// requires, so this bundles the wrappers with esbuild aliases and runs the bundle in Node.
import assert from 'node:assert/strict';
import { rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const pkg = fileURLToPath(new URL('..', import.meta.url));
const entry = `
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { NeuSwitch, NeuTextField } from './src/index.ts';
const h = React.createElement;
export const version = React.version;
export const switchHtml = renderToString(h(NeuSwitch, { name: 'notify', defaultChecked: true, className: 'x' }, 'Notify'));
export const fieldHtml = renderToString(h(NeuTextField, { label: 'Email', defaultValue: 'a@b.co' }));
`;

const out = await build({
  stdin: { contents: entry, resolveDir: pkg, loader: 'ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
  alias: { react: 'react18', 'react-dom': 'react-dom18' },
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

const file = `${pkg}ssr-react18.tmp.mjs`;
writeFileSync(file, out.outputFiles[0].text);
try {
  const result = await import(pathToFileURL(file).href);
  assert.match(result.version, /^18\.3\./);
  assert.match(result.switchHtml, /^<neu-switch /);
  assert.match(result.switchHtml, / class="x"/);
  assert.match(result.switchHtml, /<template shadowrootmode="open"><style data-neu-ssr>/);
  assert.match(result.switchHtml, /class="track on"/);
  assert.match(result.fieldHtml, /shadowrootdelegatesfocus/);
  assert.match(result.fieldHtml, /value="a@b\.co"/);
  console.log(`React ${result.version} SSR ok`);
} finally {
  rmSync(file, { force: true });
}
