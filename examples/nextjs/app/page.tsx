import 'server-only';
import { unstable_cache } from 'next/cache';
import { GitHubSkyline } from 'github-contribution-skyline/react';
import { fetchGitHubContributions } from 'github-contribution-skyline/server';

const username = process.env.GITHUB_USERNAME ?? 'YOUR_USERNAME';
const getActivity = unstable_cache(async () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GITHUB_TOKEN on the server');
  return fetchGitHubContributions({ username, token });
}, ['github-skyline', username], { revalidate: 3600 });

export default async function ActivityPage() {
  const activity = await getActivity().catch(() => null);
  if (!activity) {
    return <main><GitHubSkyline contributions={[]} status="error"
      errorMessage="GitHub activity is temporarily unavailable. Please try again later." /></main>;
  }
  return <main><GitHubSkyline {...activity} palette="green" variant="card" /></main>;
}
