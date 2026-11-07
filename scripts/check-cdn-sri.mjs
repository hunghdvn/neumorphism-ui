// Checks the README's "From a CDN" snippet against the files published on npm: the snippet must pin
// <version> (default: the version it already pins) for both packages, and its two integrity values
// must be the sha384 of neu.css and cdn/neu.min.js in that version's npm tarballs.
// Usage: node scripts/check-cdn-sri.mjs [version]. Exits 1 on any mismatch.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const sri = (bytes) => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

function readmePins() {
  const readme = readFileSync(`${root}README.md`, 'utf8');
  const snippet = readme.split(/^### From a CDN\s*$/m)[1]?.match(/```html\n([\s\S]*?)```/)?.[1];
  if (!snippet) throw new Error('README.md: no html snippet under "### From a CDN".');
  const tag = (pattern) => {
    const match = snippet.match(pattern);
    if (!match) throw new Error(`README.md: the CDN snippet has no tag matching ${pattern}.`);
    return { version: match[1], integrity: match[2] };
  };
  return {
    tokens: tag(/tokens@([^/"]+)\/neu\.css"\s+integrity="(sha384-[A-Za-z0-9+/=]+)"/),
    elements: tag(/elements@([^/"]+)\/cdn\/neu\.min\.js"\s+integrity="(sha384-[A-Za-z0-9+/=]+)"/),
  };
}

/** The files of a package version's npm tarball, by path inside the package. */
async function tarball(name, version) {
  const metaResponse = await fetch(
    `https://registry.npmjs.org/${name.replace('/', '%2F')}/${version}`,
  );
  if (!metaResponse.ok)
    throw new Error(`${name}@${version} is not on npm (${metaResponse.status}).`);
  const meta = await metaResponse.json();
  const tar = gunzipSync(Buffer.from(await (await fetch(meta.dist.tarball)).arrayBuffer()));
  const files = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    const path = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
    if (!path) break;
    const size = parseInt(
      header.subarray(124, 136).toString('utf8').replace(/\0.*$/s, '').trim(),
      8,
    );
    files.set(path.replace(/^package\//, ''), tar.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

const pins = readmePins();
const version = process.argv[2] ?? pins.elements.version;
const checks = [
  ['@neumorphism-ui/tokens', 'neu.css', pins.tokens],
  ['@neumorphism-ui/elements', 'cdn/neu.min.js', pins.elements],
];
let failed = false;
for (const [name, path, pin] of checks) {
  const files = await tarball(name, version);
  const file = files.get(path);
  const actual = file ? sri(file) : '(file missing from the tarball)';
  const ok = pin.version === version && pin.integrity === actual;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}@${version}/${path}`);
  if (pin.version !== version) console.log(`     README pins ${pin.version}`);
  if (pin.integrity !== actual) console.log(`     README ${pin.integrity}\n     npm    ${actual}`);
}
process.exit(failed ? 1 : 0);
