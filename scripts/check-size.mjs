// Spec §10 budgets, min+gzip, measured with esbuild + zlib.
import { readdirSync, readFileSync } from 'node:fs';
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
  "export { hostTheme } from './core/styles.js';",
].join('\n');

// Every non-test module in components/shared, read from the directory so a new one is counted automatically.
const shared = readdirSync(`${elements}/src/components/shared`)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .sort()
  .map((f) => `export * from './components/shared/${f.replace(/\.ts$/, '.js')}';`)
  .join('\n');

const components = [
  ['neu-avatar', './avatar.js', 'NeuAvatar'],
  ['neu-badge', './badge.js', 'NeuBadge'],
  ['neu-button', './button.js', 'NeuButton'],
  ['neu-button-group', './button-group.js', 'NeuButtonGroup'],
  ['neu-checkbox', './checkbox.js', 'NeuCheckbox'],
  ['neu-divider', './divider.js', 'NeuDivider'],
  ['neu-icon', './icon.js', 'NeuIcon'],
  ['neu-icon-button', './icon-button.js', 'NeuIconButton', { base: ['./button.js', 'NeuButton'] }],
  ['neu-number-field', './number-field.js', 'NeuNumberField'],
  ['neu-option', './option.js', 'NeuOption'],
  ['neu-radio', './radio.js', 'NeuRadio'],
  ['neu-radio-group', './radio-group.js', 'NeuRadioGroup'],
  ['neu-select', './select.js', 'NeuSelect', { limit: 5 }],
  ['neu-slider', './slider.js', 'NeuSlider'],
  ['neu-spinner', './spinner.js', 'NeuSpinner'],
  ['neu-surface', './surface.js', 'NeuSurface'],
  ['neu-switch', './switch.js', 'NeuSwitch'],
  ['neu-text-field', './text-field.js', 'NeuTextField'],
  ['neu-textarea', './textarea.js', 'NeuTextarea'],
];

const coreSize = gz(await bundled(core));
const coreShared = `${core}\n${shared}`;
const coreSharedSize = gz(await bundled(coreShared));
const rows = [
  ['cdn/neu.min.js (all components)', gz(readFileSync(`${elements}/cdn/neu.min.js`, 'utf8')), 25],
  ['@neumorphism-ui/tokens neu.css', gz(readFileSync(`${root}packages/tokens/neu.css`, 'utf8')), 4],
  ['core (base + form + html)', coreSize, 4],
  ['shared (without core)', coreSharedSize - coreSize, 3],
];
// Optional per entry: `base` is a parent class excluded from the measure (spec §10), `limit` is in KB.
// Every component is measured without the core and the shared modules.
for (const [tag, file, name, { base, limit = 3 } = {}] of components) {
  const exportOf = (from, cls) => `export { ${cls} } from '${from}';`;
  if (base) {
    const baseSize = gz(await bundled(`${coreShared}\n${exportOf(...base)}`));
    const both = gz(await bundled(`${coreShared}\n${exportOf(...base)}\n${exportOf(file, name)}`));
    rows.push([`${tag} (without core, shared, ${base[1]})`, both - baseSize, limit]);
  } else {
    const withShared = gz(await bundled(`${coreShared}\n${exportOf(file, name)}`));
    rows.push([`${tag} (without core, shared)`, withShared - coreSharedSize, limit]);
  }
}

// Docs strings live in dist/docs.js only; the CDN bundle must not carry them (spec §10).
const { componentDocs } = await import(`file:///${elements}/dist/docs.js`);
const cdnText = readFileSync(`${elements}/cdn/neu.min.js`, 'utf8');
const docsLeaks = (text) =>
  [...componentDocs].flatMap(([tag, docs]) =>
    [docs.summary, ...Object.values(docs.descriptions)]
      .filter((s) => text.includes(s))
      .map((s) => `${tag}: ${s}`),
  );

let failed = componentDocs.size === 0; // an empty map would make the guard vacuous
if (failed) console.log('FAIL  componentDocs is empty');
// SIZE_GUARD_PROBE appends a docs summary to the scanned text, to prove the guard can fail.
const scanned = process.env.SIZE_GUARD_PROBE
  ? `${cdnText}${[...componentDocs.values()][0].summary}`
  : cdnText;
for (const leak of docsLeaks(scanned)) {
  failed = true;
  console.log(`FAIL  docs string in cdn/neu.min.js (${leak})`);
}
for (const [label, bytes, limit] of rows) {
  const ok = bytes <= limit * KB;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(52)} ${(bytes / KB).toFixed(2).padStart(6)} KB / ${limit} KB`,
  );
}
process.exit(failed ? 1 : 0);
