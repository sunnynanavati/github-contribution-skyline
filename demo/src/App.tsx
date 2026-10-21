import { useEffect, useMemo, useState } from 'react';

import { SKYLINE_PALETTES, type CustomSkylinePalette, type SkylinePaletteName } from '../../src';
import { GitHubSkyline } from '../../src/react';
import { createDemoContributions } from './data/synthetic';
import personalPreview from 'virtual:skyline-preview';
import { BACKGROUND_STORAGE_KEY, DEMO_BACKGROUNDS, backgroundProperties, readDemoBackground } from './backgrounds';

type PanelName = 'description' | 'code';

const SOURCE_URL = 'https://github.com/sunnynanavati/github-contribution-skyline';
const USAGE_CODE = `import { GitHubSkyline } from "github-contribution-skyline/react";

<GitHubSkyline
  contributions={contributions}
  palette="red"
  buildingDetail
/>`;

export function App() {
  const contributions = useMemo(() => personalPreview?.contributions ?? createDemoContributions(), []);
  const [palette, setPalette] = useState<SkylinePaletteName>('red');
  const [background, setBackground] = useState(readDemoBackground);
  const neutrals = DEMO_BACKGROUNDS[background];
  const displayPalette = useMemo<CustomSkylinePalette>(() => ({
    ...SKYLINE_PALETTES[palette],
    surface: neutrals.surface,
    elevated: neutrals.elevated,
    ink: neutrals.ink,
    muted: neutrals.muted,
    // Blend the card edge into the demo stage while retaining stable dimensions.
    border: neutrals.surface,
    focus: neutrals.focus,
    texture: 'none',
  }), [palette, neutrals]);
  const [activePanel, setActivePanel] = useState<PanelName | null>(null);

  useEffect(() => {
    // Match overscroll/native controls too; nothing leaks into the library.
    const root = document.documentElement;
    const previousBackground = root.style.backgroundColor;
    const previousScheme = root.style.colorScheme;
    root.style.backgroundColor = neutrals.page;
    root.style.colorScheme = background;
    try { localStorage.setItem(BACKGROUND_STORAGE_KEY, background); } catch { /* Storage may be disabled. */ }
    return () => {
      root.style.backgroundColor = previousBackground;
      root.style.colorScheme = previousScheme;
    };
  }, [background, neutrals]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePanel(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [activePanel]);

  const togglePanel = (panel: PanelName) => {
    setActivePanel((current) => current === panel ? null : panel);
  };

  return (
    <main className="demo-page" data-background={background} style={backgroundProperties(background)}>
      <h1 className="demo-page-title">GitHub Contribution Skyline</h1>
      <section className="component-stage" aria-label="GitHub Contribution Skyline component demo">
        <div className="stage-actions" aria-label="Component actions">
          <button
            className="icon-trigger"
            type="button"
            aria-label="Light background"
            aria-pressed={background === 'light'}
            title={background === 'dark' ? 'Switch to light background' : 'Switch to dark background'}
            onClick={() => setBackground(current => current === 'dark' ? 'light' : 'dark')}
          >
            {background === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.7 13.2A9 9 0 0 1 10.8 3.3a9 9 0 1 0 9.9 9.9Z" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
            )}
          </button>
          <button
            className="icon-trigger"
            type="button"
            aria-label="Component description"
            aria-expanded={activePanel === 'description'}
            aria-controls="stage-panel"
            onClick={() => togglePanel('description')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" /></svg>
          </button>
          <button
            className="icon-trigger"
            type="button"
            aria-label="Usage code"
            aria-expanded={activePanel === 'code'}
            aria-controls="stage-panel"
            onClick={() => togglePanel('code')}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" /></svg>
          </button>
        </div>

        <div className="component-preview">
          <GitHubSkyline
            contributions={contributions}
            username={personalPreview?.username}
            totalContributions={personalPreview?.totalContributions}
            palette={displayPalette}
            buildingDetail
            variant="card"
            showControls={false}
            ariaLabel={personalPreview ? `${personalPreview.username}'s GitHub contribution skyline` : 'Illustrative contribution skyline — synthetic sample data'}
          />
        </div>

        {activePanel && (
          <aside className="stage-panel" id="stage-panel" aria-live="polite">
            {activePanel === 'description' && (
              <>
                <span className="panel-label">Description</span>
                <h2>GitHub Contribution Skyline</h2>
                <p>One year of contribution data becomes a 3D city. Hover, press, or use the keyboard to return to the familiar graph.</p>
                <p>{personalPreview ? `A contribution snapshot for ${personalPreview.username}, loaded explicitly for this demo. This is not a live data feed.` : "This preview uses synthetic sample data, not anyone's GitHub activity."} Connect your own calendar using the static-data or server-side examples in the README. The installed component includes no sample data and fetches no account automatically.</p>
                <a href={SOURCE_URL} target="_blank" rel="noreferrer">View source on GitHub</a>
              </>
            )}

            {activePanel === 'code' && (
              <>
                <span className="panel-label">React</span>
                <h2>Basic usage</h2>
                <pre tabIndex={0}><code>{USAGE_CODE}</code></pre>
              </>
            )}
          </aside>
        )}

        <div className="palette-tray" role="group" aria-label="Color palette">
          {Object.entries(SKYLINE_PALETTES).map(([name, value]) => (
            <button
              key={name}
              type="button"
              data-palette={name}
              aria-label={value.label}
              aria-pressed={palette === name}
              style={{ '--swatch-color': value.levels[4] } as React.CSSProperties}
              onClick={() => setPalette(name as SkylinePaletteName)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
