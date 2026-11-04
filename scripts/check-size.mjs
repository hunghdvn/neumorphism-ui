// Spec §10 budgets, min+gzip, measured with esbuild + zlib.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const elements = `${root}packages/elements`;
const KB = 1024;
const gz = (text) => gzipSync(text, { level: 9 }).length;

async function bundled(contents) {
  const out = await build({
    stdin: { contents, resolveDir: `${elements}/dist`, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['chrome125', 'firefox126', 'safari17.4'],
    write: false,
    logLevel: 'silent',
  });
  return out.outputFiles[0].text;
}

const core = [
  "export { NeuElement } from './core/neu-element.js';",
  "export { FormControlElement } from './core/form-control.js';",
  "export { html, unsafeHTML } from './core/html.js';",
  "export * from './core/dom.js';",
  "export * from './core/validation.js';",
  "export { hostTheme, themeCssProperties } from './core/styles.js';",
].join('\n');

const components = [
  ['neu-badge', './badge.js', 'NeuBadge'],
  ['neu-button', './button.js', 'NeuButton'],
  ['neu-button-group', './button-group.js', 'NeuButtonGroup'],
  ['neu-divider', './divider.js', 'NeuDivider'],
  ['neu-icon', './icon.js', 'NeuIcon'],
  ['neu-icon-button', './icon-button.js', 'NeuIconButton'],
  ['neu-spinner', './spinner.js', 'NeuSpinner'],
  ['neu-surface', './surface.js', 'NeuSurface'],
  ['neu-switch', './switch.js', 'NeuSwitch'],
  ['neu-text-field', './text-field.js', 'NeuTextField'],
];

const coreSize = gz(await bundled(core));
const rows = [
  ['cdn/neu.min.js (all components)', gz(readFileSync(`${elements}/cdn/neu.min.js`, 'utf8')), 25],
  ['@neu-ui/tokens neu.css', gz(readFileSync(`${root}packages/tokens/neu.css`, 'utf8')), 4],
  ['core (base + form + html)', coreSize, 4],
];
for (const [tag, file, name] of components) {
  const withCore = gz(await bundled(`${core}\nexport { ${name} } from '${file}';`));
  rows.push([`${tag} (without core)`, withCore - coreSize, 3]);
}

let failed = false;
for (const [label, bytes, limit] of rows) {
  const ok = bytes <= limit * KB;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(34)} ${(bytes / KB).toFixed(2).padStart(6)} KB / ${limit} KB`,
  );
}
process.exit(failed ? 1 : 0);
