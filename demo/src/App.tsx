import { useEffect, useMemo, useState } from 'react';

import { SKYLINE_PALETTES, type CustomSkylinePalette, type SkylinePaletteName } from '../../src';
import { GitHubSkyline } from '../../src/react';
import { createDemoContributions } from './data/synthetic';

type PanelName = 'install' | 'description' | 'code';

const SOURCE_URL = 'https://github.com/sunnynanavati/github-contribution-skyline';
const INSTALL_COMMAND = 'npm install github:sunnynanavati/github-contribution-skyline#main';
const USAGE_CODE = `import { GitHubSkyline } from "github-contribution-skyline/react";

<GitHubSkyline
  contributions={contributions}
  palette="red"
  buildingDetail
/>`;

export function App() {
  const contributions = useMemo(() => createDemoContributions(), []);
  const [palette, setPalette] = useState<SkylinePaletteName>('red');
  const displayPalette = useMemo<CustomSkylinePalette>(() => ({
    ...SKYLINE_PALETTES[palette],
    surface: '#111212',
    elevated: '#1a1c1b',
    ink: '#eef0ee',
    muted: '#9ba09d',
    border: '#3a3d3b',
    texture: 'none',
  }), [palette]);
  const [activePanel, setActivePanel] = useState<PanelName | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!activePanel) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePanel(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [activePanel]);

  const togglePanel = (panel: PanelName) => {
    setCopied(false);
    setCopyFailed(false);
    setActivePanel((current) => current === panel ? null : panel);
  };

  const copyInstallCommand = async () => {
    try { await navigator.clipboard.writeText(INSTALL_COMMAND); setCopied(true); }
    catch { setCopyFailed(true); }
  };

  return (
    <main className="demo-page">
      <section className="component-stage" aria-label="GitHub Contribution Skyline component demo">
        <div className="stage-actions" aria-label="Component actions">
          <button
            className="install-trigger"
            type="button"
            aria-expanded={activePanel === 'install'}
            aria-controls="stage-panel"
            onClick={() => togglePanel('install')}
          >
            Install
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
            palette={displayPalette}
            buildingDetail
            variant="card"
            showControls={false}
            ariaLabel="Illustrative contribution skyline — synthetic sample data"
          />
        </div>

        {activePanel && (
          <aside className="stage-panel" id="stage-panel" aria-live="polite">
            {activePanel === 'install' && (
              <>
                <span className="panel-label">Install</span>
                <h1>Add the component</h1>
                <p>Install the package, then pass it an array of contribution days.</p>
                <div className="command-row">
                  <code>{INSTALL_COMMAND}</code>
                  <button type="button" onClick={copyInstallCommand} aria-label="Copy install command">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                {copyFailed && <p role="status">Clipboard unavailable. Select and copy the command above.</p>}
              </>
            )}

            {activePanel === 'description' && (
              <>
                <span className="panel-label">Description</span>
                <h1>GitHub Contribution Skyline</h1>
                <p>One year of contribution data becomes a 3D city. Hover, press, or use the keyboard to return to the familiar graph.</p>
                <p>This preview uses synthetic sample data, not anyone's GitHub activity. Connect your own calendar using the static-data or server-side examples in the README. The installed component includes no sample data and fetches no account automatically.</p>
                <a href={SOURCE_URL} target="_blank" rel="noreferrer">View source on GitHub</a>
              </>
            )}

            {activePanel === 'code' && (
              <>
                <span className="panel-label">React</span>
                <h1>Basic usage</h1>
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
