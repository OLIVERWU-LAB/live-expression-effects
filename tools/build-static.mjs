// Dependency-free static build for GitHub Pages. Source files stay untouched.
import { cpSync, mkdirSync, rmSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { liveFiles } from './live-files.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const at = args.indexOf('--out');
const out = resolve(root, at >= 0 ? args[at + 1] : '.pages');
const rel = relative(root, out);

// Restrict cleanup to generated child folders; never erase dist/ or a parent.
if (!/^\.pages(?:-[a-z0-9-]+)?$/.test(rel)) {
  throw Error('Output must be a generated child folder, not a source directory');
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let bytes = 0;
const files = liveFiles();
const version = createHash('sha256');
for (const name of files.filter(name => /\.(mjs|js|css|html)$/.test(name) && !name.startsWith('vendor/'))) {
  version.update(readFileSync(resolve(root, 'dist', name)));
}
const release = version.digest('hex').slice(0, 12);

for (const name of files) {
  cpSync(resolve(root, 'dist', name), resolve(out, name), { recursive: true });
  if (/\.(mjs|js|css|html)$/.test(name) && !name.startsWith('vendor/')) {
    const path = resolve(out, name);
    const source = readFileSync(path, 'utf8');
    writeFileSync(path, source.replace(
      /(['"])(\.\/[^'"]+\.(?:mjs|js|css))\1/g,
      (_, quote, path) => quote + path + '?v=' + release + quote,
    ));
  }
  bytes += statSync(resolve(out, name)).size;
}

writeFileSync(resolve(out, '.nojekyll'), '');
console.log(JSON.stringify({ files: files.length + 1, bytes, release, output: out }));
