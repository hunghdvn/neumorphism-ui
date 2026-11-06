import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDocs } from '@neumorphism-ui/elements/docs.js';
import { definitions } from '@neumorphism-ui/elements/ssr.js';
import {
  buildManifest,
  buildReactIndex,
  buildReactWrapper,
  findOrphans,
  tagToFileBase,
} from './lib.mjs';

const check = process.argv.includes('--check');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const defs = [...definitions.values()];

const outputs = new Map([
  [
    'packages/elements/custom-elements.json',
    `${JSON.stringify(buildManifest(defs, componentDocs), null, 2)}\n`,
  ],
  ['packages/react/src/generated/index.ts', buildReactIndex(defs)],
  ...defs.map((def) => [
    `packages/react/src/generated/${tagToFileBase(def.tag)}.ts`,
    buildReactWrapper(def, componentDocs.get(def.tag)),
  ]),
]);

const stale = [];
const orphanFiles = [];
for (const [relative, content] of outputs) {
  const file = join(root, relative);
  if (existsSync(file) && readFileSync(file, 'utf8') === content) continue;
  if (check) {
    stale.push(relative);
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(`wrote ${relative}`);
  }
}

const generatedDir = 'packages/react/src/generated';
if (check && existsSync(join(root, generatedDir))) {
  const known = new Set(outputs.keys());
  const orphans = findOrphans(readdirSync(join(root, generatedDir)), generatedDir, known);
  orphanFiles.push(...orphans);
  stale.push(...orphans.map((file) => `${file} (not a generated output)`));
}

if (stale.length > 0) {
  const hint =
    orphanFiles.length > 0
      ? 'Delete the orphaned file(s) by hand: pnpm gen does not remove them.'
      : 'Run: pnpm gen';
  console.error(`Generated files are out of date:\n  ${stale.join('\n  ')}\n${hint}`);
  process.exit(1);
}
