import { build } from 'esbuild';

await build({
  entryPoints: ['src/neu.css'],
  outfile: 'neu.css',
  minify: true,
  logLevel: 'info',
});
