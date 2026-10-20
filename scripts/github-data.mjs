import { execFileSync } from 'node:child_process';
import { fetchGitHubContributions } from '../dist/server.js';

// Safe stdout JSON makes this usable in any static site or build pipeline.
// Authentication stays in this local process; do not pass tokens as CLI arguments.
const [username, requestedYear, ...extra] = process.argv.slice(2);
try {
  if (!username || extra.length) throw new Error('Usage: npm run data:github -- <username> [year]. Build the library first with npm run build:lib.');
  let token = process.env.GITHUB_TOKEN;
  if (!token) {
    try { token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { throw new Error('Run gh auth login, or set GITHUB_TOKEN in your local/server environment.'); }
  }
  const result = await fetchGitHubContributions({ username, token, year: requestedYear === undefined ? undefined : Number(requestedYear) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to load GitHub contributions.');
  process.exitCode = 1;
}
