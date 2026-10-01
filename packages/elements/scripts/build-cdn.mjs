import { build } from 'esbuild';

await build({
  entryPoints: ['src/cdn.ts'],
  outfile: 'cdn/neu.min.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['chrome125', 'firefox126', 'safari17.4'],
  legalComments: 'none',
  logLevel: 'info',
});
