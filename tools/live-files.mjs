import { LIVE_AUDIO_FILES } from '../dist/sound-assets.mjs';
import { GIFT_BANKS } from '../dist/gift-banks.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));

// Follow the live entry's module graph. Worker entry points and media are listed
// explicitly because the browser loads them outside static import statements.
export function liveFiles() {
  const files = new Set([
    'index.html',
    'style.css',
    'assets/favicon.svg',
    'vision.worker.js',
    'vision-config.js',
    'vision-pack.js',
    'vision-download.js',
  ]);

  function visit(rel) {
    if (files.has(rel)) return;
    files.add(rel);
    const source = readFileSync(resolve(root, rel), 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
      visit(relative(root, resolve(root, dirname(rel), match[1])));
    }
  }

  function walk(rel) {
    for (const entry of readdirSync(resolve(root, rel), { withFileTypes: true })) {
      const path = rel + '/' + entry.name;
      if (entry.isDirectory()) walk(path);
      else files.add(path);
    }
  }

  visit('app.mjs');
  walk('vendor/compressed');
  files.add('vendor/LICENSE-APACHE-2.0.txt');
  files.add('vendor/THIRD_PARTY_NOTICES.txt');

  for (const path of Object.values(LIVE_AUDIO_FILES)) files.add(path);
  for (const bank of Object.values(GIFT_BANKS)) files.add(bank.url.replace(/^\.\//, ''));

  return [...files].sort().map(path => {
    statSync(resolve(root, path));
    return path;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(liveFiles()));
}
