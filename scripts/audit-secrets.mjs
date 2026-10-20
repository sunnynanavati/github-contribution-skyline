import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';

// Heuristic local checks, not a credential validity probe. Never print matched values.
const patterns = [
  'gh[pousr]_[A-Za-z0-9]{30,}', 'github_pat_[A-Za-z0-9_]{40,}',
  'npm_[A-Za-z0-9]{30,}',
  '(AKIA|ASIA)[A-Z0-9]{16}', '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
  'sk-(proj-|svcacct-)?[A-Za-z0-9_-]{40,}', '(sk|rk)_live_[A-Za-z0-9]{20,}',
  'AIza[A-Za-z0-9_-]{30,}', 'xox[baprs]-[A-Za-z0-9-]{20,}',
  'https?://[^ /:@]+:[^ /@]{8,}@',
];
const expression = patterns.join('|');
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
function artifacts(directory) {
  try { return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? artifacts(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
const files = [...new Set([...git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean), ...artifacts('dist'), ...artifacts('demo-dist')])];
const found = new Set();
const regex = new RegExp(expression);
for (const file of files) {
  let data;
  try { data = readFileSync(file); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (!data.includes(0) && regex.test(data.toString('utf8'))) found.add(`working tree: ${file}`);
}
const commits = git(['rev-list', '--all']).trim().split('\n').filter(Boolean);
for (const commit of commits) {
  try {
    const matches = git(['grep', '-I', '-l', '-E', expression, commit, '--', '.']).trim();
    if (matches) for (const path of matches.split('\n')) found.add(path);
  } catch (error) { if (error.status !== 1) throw error; }
}
console.log(JSON.stringify({ filesChecked: files.length, commitsChecked: commits.length, findings: [...found],
  scope: 'Non-ignored working files and reachable Git history; common credential patterns only. No matched values or source are uploaded.' }, null, 2));
if (found.size) process.exitCode = 1;
