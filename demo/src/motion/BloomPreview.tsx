import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { normalizeContributions } from '../../../src/core/data';
import type { ContributionDay, CustomSkylinePalette } from '../../../src/core/types';
import { MotionPlayer, type StudySettings } from './MotionPlayer';
import './bloom-preview.css';

/** Minimal demo presentation of B. The published component remains unchanged. */
export function BloomPreview({ contributions, palette }: {
  contributions: ContributionDay[];
  palette: CustomSkylinePalette;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const player = useRef<MotionPlayer | null>(null);
  const [error, setError] = useState('');
  const grid = useMemo(() => normalizeContributions(contributions), [contributions]);
  const settings = useMemo<StudySettings>(() => ({
    profile: 'elastic', grid, palette, buildingDetail: true, heightScale: 1, speed: 1,
  }), [grid, palette]);
  const initial = useRef(settings);
  const total = grid.days.reduce((sum, day) => sum + day.count, 0);

  useEffect(() => {
    if (!root.current || !canvas.current || !tooltip.current || !live.current) return;
    try {
      const instance = new MotionPlayer(root.current, canvas.current, tooltip.current, live.current, initial.current, sample => {
        if (hint.current) hint.current.textContent = sample.time === sample.duration ? 'MOVE OUT TO RAISE' : 'HOVER TO FLATTEN';
      });
      player.current = instance;
      return () => { instance.destroy(); player.current = null; };
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The skyline preview could not start.');
    }
  }, []);
  useEffect(() => { player.current?.configure(settings); }, [settings]);

  return <>
    <div className="bloom-preview" ref={root} tabIndex={0} role="button" aria-label="Sunny's GitHub contribution skyline" aria-describedby={`${id}-help`}>
      <canvas ref={canvas} aria-hidden="true" />
      <div className="bloom-topline" aria-hidden="true">
        <span className="bloom-identity">github.com/sunny / {total.toLocaleString()} contributions</span>
        <span className="bloom-hint" ref={hint}>HOVER TO FLATTEN</span>
      </div>
      {error && <p className="bloom-error" role="alert">{error}</p>}
      <div className="bloom-tooltip" ref={tooltip} role="tooltip" hidden />
      <div className="bloom-legend" aria-hidden="true">Less {palette.levels.map((color, index) => <i key={index} style={{ background: color }} />)} More</div>
    </div>
    <p className="bloom-sr" id={`${id}-help`}>Hover to flatten. On touch, tap to toggle. Enter or Space toggles views. In graph view, use the arrow keys to explore contribution days, Home and End to jump to the first and last day, and Escape to dismiss the tooltip.</p>
    <p className="bloom-sr" ref={live} aria-live="polite" aria-atomic="true" />
    <div className={error ? 'bloom-fallback' : 'bloom-sr'}>
      <table>
        <caption>Sunny's daily contributions</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Contributions</th></tr></thead>
        <tbody>{grid.days.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.count.toLocaleString()}</td></tr>)}</tbody>
      </table>
    </div>
  </>;
}
