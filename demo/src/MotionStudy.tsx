import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeContributions } from '../../src/core/data';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import type { ContributionLevel, SkylinePaletteName } from '../../src/core/types';
import { makeFixture } from './fixture';
import { BloomScene } from './motion/BloomScene';
import { durationFor, poseTimeFor, studyGeometry, type MotionProfile } from './motion/choreography';
import { MotionPlayer, type StudySettings } from './motion/MotionPlayer';
import './motion-study.css';

const profiles = [
  { id: 'vertical', tab: 'A · Vertical', title: 'A — Vertical compression', description: 'A quick collapse travels from the center to the edges. Every building stays upright.' },
  { id: 'elastic', tab: 'B · Outward squash', title: 'B — Anchored, outward squash', description: 'The same wave, with a brief outward lean and squash. Every building’s base stays planted.' },
  { id: 'baseline', tab: 'Baseline', title: 'Previous experiment', description: 'The earlier 600ms transition, preserved for comparison.' },
] as const;

function Keyframe({ settings, time }: { settings: StudySettings; time: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, 1118, 620);
    new BloomScene(settings.grid, studyGeometry(1118, 620, settings.grid.weeks, settings.heightScale), settings.palette, settings.heightScale, settings.buildingDetail).draw(context, poseTimeFor(time, settings.profile), settings.profile);
  }, [settings, time]);
  return <figure className="study-keyframe"><figcaption>{time}ms</figcaption><canvas ref={ref} width={1118} height={620} aria-label={`Transition at ${time} milliseconds`} /></figure>;
}

export function MotionStudy() {
  const [profile, setProfile] = useState<MotionProfile>(() => {
    const value = new URLSearchParams(location.search).get('prototype');
    return value === 'vertical' || value === 'baseline' ? value : 'elastic';
  });
  const [palette, setPalette] = useState<SkylinePaletteName>('red');
  const [data, setData] = useState('original');
  const [detail, setDetail] = useState(true);
  const [height, setHeight] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [frames, setFrames] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const timeline = useRef<HTMLInputElement>(null);
  const readout = useRef<HTMLOutputElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const player = useRef<MotionPlayer | null>(null);
  const grid = useMemo(() => normalizeContributions(makeFixture().map((day, index) => {
    if (data === 'dense') return { ...day, count: 40, level: 4 as ContributionLevel };
    if (data === 'sparse') return { ...day, count: index % 11 === 0 ? day.count : 0 };
    return day;
  })), [data]);
  const settings = useMemo<StudySettings>(() => ({ profile, grid, palette: SKYLINE_PALETTES[palette], buildingDetail: detail, heightScale: height, speed }), [profile, grid, palette, detail, height, speed]);
  const initial = useRef(settings);
  useEffect(() => {
    if (!root.current || !canvas.current || !tooltip.current || !live.current) return;
    try {
      const instance = new MotionPlayer(root.current, canvas.current, tooltip.current, live.current, initial.current, sample => {
        if (timeline.current) { timeline.current.max = String(sample.duration); timeline.current.value = String(Math.round(sample.time)); }
        if (readout.current) readout.current.value = `${Math.round(sample.time)} / ${sample.duration}ms`;
        if (status.current) status.current.textContent = sample.reducedMotion ? 'Reduced motion · instant changes' : sample.running ? 'Playing' : sample.time === sample.duration ? 'Graph · move out to raise' : sample.time === 0 ? 'Hover or tap to flatten' : 'Paused · Replay to continue';
      });
      player.current = instance;
      return () => { instance.destroy(); player.current = null; };
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The motion preview could not start.'); }
  }, []);
  useEffect(() => { player.current?.configure(settings); }, [settings]);
  useEffect(() => {
    const url = new URL(location.href); url.searchParams.set('prototype', profile);
    history.replaceState(null, '', url);
  }, [profile]);
  const active = profiles.find(item => item.id === profile)!;
  const duration = durationFor(profile);

  return <main className="motion-study">
    <header className="study-header">
      <div><p className="study-eyebrow">LOCAL EXPERIMENT / 02</p><h1>A city, pressed into a graph.</h1><p>Two takes on the <a href="https://www.bubbbly.com/bloom" target="_blank" rel="noreferrer">Bloom transition</a>. Same camera. Same timing. Different compression.</p></div>
      <a className="study-back" href="/">Back to preview ↗</a>
    </header>
    <div className="study-tabs" role="tablist" aria-label="Motion prototype">
      {profiles.map((item, index) => <button key={item.id} id={`tab-${item.id}`} type="button" role="tab" aria-selected={profile === item.id} aria-controls="motion-panel" tabIndex={profile === item.id ? 0 : -1} onClick={() => setProfile(item.id)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? profiles.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + profiles.length) % profiles.length;
        setProfile(profiles[next]!.id); document.getElementById(`tab-${profiles[next]!.id}`)?.focus();
      }}>{item.tab}</button>)}
    </div>
    <section id="motion-panel" role="tabpanel" aria-labelledby={`tab-${profile}`}>
      <div className="study-caption"><h2>{active.title}</h2><p>{active.description}</p></div>
      <div className="study-card" ref={root} tabIndex={0} role="button" aria-label="Contribution skyline preview" aria-describedby="study-instructions">
        <div className="study-card-header" aria-hidden="true"><span>github.com/sunny <span className="study-total">/ {grid.days.reduce((sum, day) => sum + day.count, 0).toLocaleString()} contributions</span></span><span ref={status}>Hover or tap to flatten</span></div>
        <canvas ref={canvas} aria-hidden="true" />
        {error && <p className="study-error" role="alert">{error}</p>}
        <div className="study-tooltip" ref={tooltip} role="tooltip" hidden />
        <div className="study-legend" aria-hidden="true">Less {SKYLINE_PALETTES[palette].levels.map((color, index) => <i key={index} style={{ background: color }} />)} More</div>
      </div>
    </section>
    <div className="study-deck">
      <div className="study-playback">
        <button type="button" className="study-replay" onClick={() => player.current?.replay()}>↻ Replay</button>
        <label className="study-speed">Speed <select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={0.5}>½×</option><option value={0.25}>¼×</option></select></label>
        <label className="study-scrubber">Timeline<input ref={timeline} type="range" aria-label="Animation timeline" min={0} max={duration} defaultValue={0} step={1} onChange={event => player.current?.seek(Number(event.target.value))} /></label>
        <output ref={readout} className="study-time" aria-live="off">0 / {duration}ms</output>
      </div>
      <div className="study-options">
        <div className="study-palettes" role="group" aria-label="Color palette">{Object.entries(SKYLINE_PALETTES).map(([name, value]) => <button key={name} type="button" title={value.label} aria-label={value.label} aria-pressed={palette === name} onClick={() => setPalette(name as SkylinePaletteName)}><i style={{ background: value.levels[4] }} /></button>)}</div>
        <label><input type="checkbox" checked={detail} onChange={event => setDetail(event.target.checked)} /> Building detail</label>
        <label>Height <input className="study-height" type="range" min={0.4} max={2} step={0.1} value={height} onChange={event => setHeight(Number(event.target.value))} /></label>
        <label>Data <select value={data} onChange={event => setData(event.target.value)}><option value="original">Original</option><option value="dense">Dense / equal heights</option><option value="sparse">Sparse</option></select></label>
      </div>
    </div>
    <p className="study-help" id="study-instructions">Hover to flatten, move out to raise. Tap or press Enter / Space to toggle. Arrow keys inspect days in the graph. Scrub to hold a frame and switch tabs to compare; Replay resumes motion.</p>
    <p className="study-sr" ref={live} aria-live="polite" />
    <details className="study-frames" onToggle={event => setFrames(event.currentTarget.open)}><summary>Inspect keyframes</summary>{frames && <div className="study-frame-grid">{(profile === 'baseline' ? [0, 90, 180, 270, 420, 600] : [0, 150, 225, 300, 405, 600]).map(time => <Keyframe key={time} time={time} settings={settings} />)}</div>}</details>
    <details className="study-table"><summary>Contribution data table</summary><div><table><caption>Exact contribution counts for the selected fixture</caption><thead><tr><th scope="col">Date</th><th scope="col">Contributions</th></tr></thead><tbody>{grid.days.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.count}</td></tr>)}</tbody></table></div></details>
    <footer className="study-footer">Experimental Canvas 2D studies. The published component is unchanged.</footer>
  </main>;
}
