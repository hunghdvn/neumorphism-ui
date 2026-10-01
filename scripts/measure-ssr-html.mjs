// Spec §8.1: how much the inline declarative shadow roots add to the server HTML.
import { gzipSync } from 'node:zlib';

const DSD = /<template shadowrootmode="open"[^>]*>[\s\S]*?<\/template>/g;
const gz = (text) => gzipSync(text).length;

for (const url of process.argv.slice(2)) {
  const html = await (await fetch(url)).text();
  const stripped = html.replace(DSD, '');
  const instances = html.match(DSD)?.length ?? 0;
  console.log(url);
  console.log(`  instances: ${instances}`);
  console.log(
    `  raw : ${html.length} B (without DSD ${stripped.length} B, +${html.length - stripped.length} B)`,
  );
  console.log(
    `  gzip: ${gz(html)} B (without DSD ${gz(stripped)} B, +${gz(html) - gz(stripped)} B)`,
  );
}
