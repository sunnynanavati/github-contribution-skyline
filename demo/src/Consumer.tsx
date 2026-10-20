import { createRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
// Self-referencing package exports deliberately exercise dist, not src.
import { GitHubSkyline, type GitHubSkylineHandle } from 'github-contribution-skyline/react';
import { SKYLINE_DEFAULTS } from 'github-contribution-skyline';
import { defineGitHubSkyline, type GitHubSkylineElement } from 'github-contribution-skyline/element';
import { createDemoContributions } from './data/synthetic';

const contributions = createDemoContributions();
const ref = createRef<GitHubSkylineHandle>();
defineGitHubSkyline();
export function Consumer() {
  const [view, setView] = useState('skyline');
  return <main style={{ maxWidth: 1100, margin: 'auto', padding: 16 }}>
    <h1>Packaged component</h1>
    <p>Default height: {SKYLINE_DEFAULTS.heightScale}×. Duration: {SKYLINE_DEFAULTS.forwardMs}ms.</p>
    <button onClick={() => ref.current?.setView('graph')}>Graph</button>
    <button onClick={() => ref.current?.setView('skyline')}>Skyline</button>
    <output aria-live="polite">{view}</output>
    <GitHubSkyline ref={ref} contributions={contributions} palette="red" ariaLabel="React contribution skyline" onViewChange={setView} />
    <h2>Custom element</h2>
    <github-contribution-skyline ref={(element: GitHubSkylineElement | null) => { if (element) element.contributions = contributions; }} palette="blue" aria-label="Web component contribution skyline" />
  </main>;
}
declare module 'react' {
  // React's custom-element JSX types require namespace augmentation.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'github-contribution-skyline': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        palette?: string; ref?: React.Ref<import('github-contribution-skyline/element').GitHubSkylineElement>;
      };
    }
  }
}
createRoot(document.getElementById('root')!).render(<Consumer />);
