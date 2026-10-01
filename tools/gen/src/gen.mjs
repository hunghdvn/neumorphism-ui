import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { definitions } from '@neu-ui/elements/ssr.js';
import { buildManifest, buildReactIndex, buildReactWrapper, tagToFileBase } from './lib.mjs';

const check = process.argv.includes('--check');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const defs = [...definitions.values()];

const outputs = new Map([
  ['packages/elements/custom-elements.json', `${JSON.stringify(buildManifest(defs), null, 2)}\n`],
  ['packages/react/src/generated/index.ts', buildReactIndex(defs)],
  ...defs.map((def) => [
    `packages/react/src/generated/${tagToFileBase(def.tag)}.ts`,
    buildReactWrapper(def),
  ]),
]);

const stale = [];
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

if (stale.length > 0) {
  console.error(`Generated files are out of date:\n  ${stale.join('\n  ')}\nRun: pnpm gen`);
  process.exit(1);
}
