export const SKYLINE_STYLES: string = `
  :host {
    --gcs-surface: #fbfcfb;
    --gcs-elevated: #f5f7f5;
    --gcs-ink: #172019;
    --gcs-muted: #667069;
    --gcs-border: #d5ddd7;
    --gcs-focus: #268342;
    --gcs-radius: 18px;
    --gcs-min-height: clamp(400px, 55vw, 650px);
    --gcs-shadow: 0 22px 64px rgb(28 34 30 / .12);
    --gcs-font-family: Arial, Helvetica, sans-serif;
    display: block;
    min-width: 0;
    color: var(--gcs-ink);
    font-family: var(--gcs-font-family);
  }
  * { box-sizing: border-box; }
  button, input { font: inherit; }
  .shell {
    position: relative;
    min-height: var(--gcs-min-height);
    overflow: hidden;
    border: 1px solid var(--gcs-border);
    border-radius: var(--gcs-radius);
    background: var(--gcs-surface);
    box-shadow: var(--gcs-shadow);
    outline: none;
  }
  .shell:focus-visible { box-shadow: 0 0 0 3px var(--gcs-focus), 0 22px 64px rgb(28 34 30 / .12); }
  canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: manipulation; }
  .topline {
    position: absolute; z-index: 2; inset: 18px 20px auto;
    display: flex; justify-content: space-between; gap: 18px;
    min-width: 0; pointer-events: none;
    font: 650 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .identity { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hint { flex: 0 0 auto; margin-right: 94px; color: var(--gcs-muted); font-weight: 500; }
  .details-toggle {
    position: absolute; z-index: 6; top: 12px; right: 14px;
    min-width: 84px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 0 12px; border: 1px solid var(--gcs-border); border-radius: 999px;
    background: color-mix(in srgb, var(--gcs-elevated) 94%, transparent); color: var(--gcs-ink);
    cursor: pointer; font: 650 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
    transition: transform 160ms ease-out, background-color 160ms ease-out;
  }
  .details-toggle:hover { background: var(--gcs-elevated); }
  .details-toggle[hidden] { display: none; }
  .details-toggle:active { transform: scale(.97); }
  .details-toggle:focus-visible, .palette-button:focus-visible, .reset:focus-visible { outline: 2px solid var(--gcs-focus); outline-offset: 2px; }
  .sliders-icon { width: 13px; display: grid; gap: 2px; }
  .sliders-icon i { display: block; height: 1px; background: currentColor; }
  .sliders-icon i:nth-child(2) { width: 8px; margin-left: 4px; }
  .settings-panel {
    position: absolute; z-index: 5; top: 54px; right: 14px;
    width: min(330px, calc(100% - 28px)); padding: 14px;
    border: 1px solid var(--gcs-border); border-radius: 14px;
    background: color-mix(in srgb, var(--gcs-elevated) 96%, transparent); color: var(--gcs-ink);
    box-shadow: 0 16px 46px rgb(0 0 0 / .22);
    -webkit-backdrop-filter: blur(18px) saturate(1.12); backdrop-filter: blur(18px) saturate(1.12);
    opacity: 0; transform: translateY(-7px) scale(.98); transform-origin: top right; pointer-events: none;
    transition: opacity 180ms ease-out, transform 180ms cubic-bezier(.2,.8,.2,1);
    font: 500 11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .settings-panel[data-open] { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .settings-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .settings-head strong { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
  .reset { min-height: 28px; padding: 0 3px; border: 0; background: transparent; color: var(--gcs-muted); cursor: pointer; }
  .reset:hover { color: var(--gcs-ink); }
  .palette-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 2px 0 10px; }
  .palette-button {
    display: grid; gap: 8px; min-height: 48px; padding: 9px; text-align: left; cursor: pointer;
    color: var(--gcs-ink); background: color-mix(in srgb, var(--gcs-surface) 70%, transparent);
    border: 1px solid var(--gcs-border); border-radius: 10px;
    transition: transform 160ms ease-out, border-color 160ms ease-out, background-color 160ms ease-out;
  }
  .palette-button:hover { transform: translateY(-1px); background: var(--gcs-surface); }
  .palette-button[aria-checked='true'] { border-color: var(--gcs-focus); box-shadow: inset 0 0 0 1px var(--gcs-focus); }
  .ramp { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; }
  .ramp i { height: 12px; border-radius: 2px; }
  .palette-name { overflow: hidden; color: var(--gcs-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .palette-button[aria-checked='true'] .palette-name { color: var(--gcs-ink); }
  .setting-row { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--gcs-border); }
  .switch { position: relative; width: 34px; height: 22px; flex: 0 0 auto; }
  .switch input { position: absolute; opacity: 0; pointer-events: none; }
  .track { position: absolute; inset: 0; border-radius: 999px; background: var(--gcs-border); cursor: pointer; transition: background-color 160ms ease-out; }
  .track::after {
    content: ''; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px;
    border-radius: 50%; background: var(--gcs-ink); box-shadow: 0 1px 3px rgb(0 0 0 / .25);
    transition: transform 180ms cubic-bezier(.2,.8,.2,1);
  }
  .switch input:checked + .track { background: var(--gcs-focus); }
  .switch input:checked + .track::after { transform: translateX(12px); }
  .switch input:focus-visible + .track { outline: 2px solid var(--gcs-focus); outline-offset: 2px; }
  .range-row { display: grid; gap: 8px; padding-top: 10px; border-top: 1px solid var(--gcs-border); }
  .range-meta { display: flex; justify-content: space-between; color: var(--gcs-muted); }
  input[type='range'] { min-height: 30px; width: 100%; accent-color: var(--gcs-focus); cursor: pointer; }
  .legend {
    position: absolute; z-index: 2; left: 20px; bottom: 18px;
    display: flex; align-items: center; gap: 5px; color: var(--gcs-muted); pointer-events: none;
    font: 500 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .legend-colors { display: contents; }
  .swatch { width: 10px; height: 10px; border-radius: 2px; }
  .tooltip {
    position: absolute; z-index: 4; opacity: 0; pointer-events: none;
    max-width: calc(100% - 20px); padding: 8px 10px; border: 1px solid var(--gcs-border); border-radius: 8px;
    background: var(--gcs-elevated); color: var(--gcs-ink); box-shadow: 0 8px 28px rgb(0 0 0 / .22);
    transform: translate(-50%, -115%); font: 600 11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
    transition: opacity 120ms ease-out; white-space: nowrap;
  }
  .state {
    position: absolute; z-index: 3; inset: 0; display: grid; place-content: center; gap: 8px;
    padding: 28px; background: var(--gcs-surface); text-align: center;
  }
  .state[hidden] { display: none; }
  .state strong { font-size: 15px; }
  .state span { max-width: 360px; color: var(--gcs-muted); font-size: 13px; line-height: 1.45; }
  .sr-only {
    position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important;
    margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important; border: 0 !important;
  }
  @media (max-width: 640px) {
    .shell { min-height: 450px; border-radius: 14px; }
    .topline { inset: 14px 14px auto; }
    .hint { display: none; }
    .identity { max-width: calc(100% - 100px); }
    .details-toggle { top: 10px; right: 10px; min-height: 40px; }
    .settings-panel { top: 54px; right: 10px; width: calc(100% - 20px); max-height: calc(100% - 66px); overflow-y: auto; }
    .legend { left: 14px; bottom: 14px; }
  }
  @supports not (background: color-mix(in srgb, white, black)) {
    .details-toggle, .settings-panel { background: var(--gcs-elevated); }
    .palette-button { background: var(--gcs-surface); }
  }
  @media (prefers-reduced-motion: reduce) {
    .settings-panel, .details-toggle, .palette-button, .track, .track::after, .tooltip { transition: none; }
  }
`;
