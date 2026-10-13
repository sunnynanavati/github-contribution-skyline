import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, cpSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Verify the actual tarball, not a workspace link. No source is uploaded.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(join(tmpdir(), 'skyline-package-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const packed = run(npm, ['pack', '--ignore-scripts', '--json', '--pack-destination', temp]);
// Some npm versions still print prepare-script output before the JSON payload.
const [pack] = JSON.parse(packed.slice(packed.lastIndexOf('\n[') + 1));
const metadata = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(pack.name, metadata.name);
assert.equal(pack.version, metadata.version);
assert.deepEqual(Object.keys(metadata.dependencies ?? {}), [], 'No runtime dependencies expected');
assert.ok(pack.size < 100_000, 'Investigate unexpected package growth above 100kB');
for (const { path } of pack.files) {
  assert.match(path, /^(dist\/.*\.(?:js(?:\.map)?|d\.ts)|README\.md|LICENSE|CHANGELOG\.md|package\.json)$/);
  assert.doesNotMatch(path, /(?:prototype|experiment|fixture|consumer|demo|node_modules)/i);
}
for (const path of ['index.js', 'react.js', 'element.js']) {
  const map = JSON.parse(readFileSync(join(root, 'dist', `${path}.map`), 'utf8'));
  for (const source of map.sources) assert.doesNotMatch(source, /^(?:\/|[A-Z]:)|(?:prototype|experiment|demo)/i);
}
const consumer = join(temp, 'consumer');
mkdirSync(consumer);
run(npm, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false',
  join(temp, pack.filename), join(root, 'node_modules/react'), join(root, 'node_modules/react-dom')], consumer);
symlinkSync(join(root, 'node_modules/@types'), join(consumer, 'node_modules/@types'), 'junction');
cpSync(join(root, 'tests/package/consumer.mts'), join(consumer, 'consumer.mts'));
cpSync(join(root, 'tests/package/ssr.mjs'), join(consumer, 'ssr.mjs'));
run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.mts'], consumer);
run(process.execPath, ['ssr.mjs'], consumer);
console.log(JSON.stringify({ name: pack.name, version: pack.version, files: pack.files.length, bytes: pack.size,
  packedInstall: 'passed', nodeNextTypes: 'passed', ssr: 'passed', temporaryArtifacts: temp }, null, 2));
