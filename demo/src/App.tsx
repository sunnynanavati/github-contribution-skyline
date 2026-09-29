import { useEffect, useMemo, useState } from 'react';
import { CodeIcon, CopyIcon, CornersOutIcon } from '@phosphor-icons/react';

import { SKYLINE_PALETTES, type CustomSkylinePalette, type SkylinePaletteName } from '../../src';
import { GitHubSkyline } from '../../src/react';
import { makeFixture } from './fixture';

type PanelName = 'install' | 'description' | 'code';

const SOURCE_URL = 'https://github.com/sunnynanavati/github-contribution-skyline';
const INSTALL_COMMAND = 'npm install github-contribution-skyline';
const USAGE_CODE = `import { GitHubSkyline } from "github-contribution-skyline/react";

<GitHubSkyline
  contributions={contributions}
  palette="red"
  heightScale={1}
  buildingDetail
/>`;

export function App() {
  const contributions = useMemo(makeFixture, []);
  const total = useMemo(() => contributions.reduce((sum, day) => sum + day.count, 0), [contributions]);
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
    setActivePanel((current) => current === panel ? null : panel);
  };

  const copyInstallCommand = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
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
            <CornersOutIcon size={20} weight="bold" aria-hidden="true" />
          </button>
          <button
            className="icon-trigger"
            type="button"
            aria-label="Usage code"
            aria-expanded={activePanel === 'code'}
            aria-controls="stage-panel"
            onClick={() => togglePanel('code')}
          >
            <CodeIcon size={21} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="component-preview">
          <GitHubSkyline
            contributions={contributions}
            username="sunny"
            totalContributions={total}
            palette={displayPalette}
            heightScale={1}
            buildingDetail
            variant="card"
            showControls={false}
            ariaLabel="Sunny's GitHub contribution skyline"
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
                    <CopyIcon size={18} weight="bold" aria-hidden="true" />
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </>
            )}

            {activePanel === 'description' && (
              <>
                <span className="panel-label">Description</span>
                <h1>GitHub Contribution Skyline</h1>
                <p>One year of contribution data becomes a 3D city. Hover, press, or use the keyboard to return to the familiar graph.</p>
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
