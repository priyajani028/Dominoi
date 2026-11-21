import { usePlayground } from '../store/usePlayground.js';
import { Icons } from './icons.jsx';

export function Marquee() {
  const m = usePlayground((s) => s.marquee);
  if (!m) return null;
  return (
    <div
      className="marquee"
      style={{ left: Math.min(m.x0, m.x1), top: Math.min(m.y0, m.y1), width: Math.abs(m.x1 - m.x0), height: Math.abs(m.y1 - m.y0) }}
    />
  );
}

export function Toast() {
  const t = usePlayground((s) => s.toast);
  return <div className={`toast ${t ? 'is-on' : ''}`}>{t?.text}</div>;
}

const TOOL_HINTS = {
  view: 'Drag to orbit · two fingers or right-drag to pan',
  add: 'Click to place · drag to draw a chain · click a piece to stack on it · Q / E turn',
  select: 'Click or box-drag to select · drag pieces to move · Shift adds',
  move: 'Drag any piece to move the selection',
  rotate: 'Drag a piece sideways to rotate the selection · Q / E steps',
  ball: 'Click to place the ball · drag from it to aim & set power',
};

export function ToolHint() {
  const tool = usePlayground((s) => s.tool);
  const phase = usePlayground((s) => s.phase);
  const count = usePlayground((s) => s.dominoes.length);
  const dismissed = usePlayground((s) => s.hintDismissed);
  const galleryOpen = usePlayground((s) => s.galleryOpen);
  const showOnboarding = phase === 'edit' && !count && !dismissed && !galleryOpen;
  return (
    <>
      <div className={`onboard ${showOnboarding ? 'is-on' : ''}`}>
        <h1>A table, a box of dominoes,<br /><em>and one red ball.</em></h1>
        <ol>
          <li><span><b>Click</b> anywhere to stand a domino, <b>drag</b> to draw a chain, or click a domino to <b>stack</b> on it.</span></li>
          <li><span>Place the <b>ball</b> and drag from it to aim.</span></li>
          <li><span>Press <b>Play</b> and watch it all fall.</span></li>
        </ol>
        <div className="row">
          <button className="pill primary" onClick={() => usePlayground.getState().toggleGallery(true)}>
            <Icons.templates width={16} height={16} /> Browse templates
          </button>
          <button className="pill ghost" onClick={() => usePlayground.getState().dismissHint()}>Start empty</button>
        </div>
      </div>
      <div className={`toolhint ${phase === 'edit' && (count || dismissed) ? 'is-on' : ''}`}>{TOOL_HINTS[tool]}</div>
    </>
  );
}

const TOUCH_ROWS = [
  ['Orbit camera', 'Orbit tool (hand), then drag with one finger'],
  ['Pan · Zoom', 'Two fingers drag · pinch'],
  ['Place / draw', 'Add tool: tap, or drag to draw a chain'],
  ['Stack', 'Add tool: tap an existing piece'],
  ['Turn next piece', '↻ button next to the piece types'],
  ['Select · Move', 'Select tool: tap or box-drag, then drag a piece'],
  ['Aim & launch', 'Drag from the ball, release to launch'],
];

export function HelpSheet({ open, onClose }) {
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const rows = touch ? TOUCH_ROWS : [
    ['Orbit camera', 'Right-drag · Space + drag · Orbit tool'],
    ['Pan', 'Shift + right-drag · middle-drag · two fingers'],
    ['Zoom', 'Scroll · pinch'],
    ['Tools', 'H orbit · A add · V select · M move · R rotate · B ball'],
    ['Piece type (Add tool)', '1 single · 2 A-frame · 3 flat'],
    ['Stack', 'Add tool: click an existing piece to build on top of it'],
    ['Turn piece / selection', 'Q / E (hold Shift for fine steps)'],
    ['Duplicate · Delete', '⌘/Ctrl D · Delete / Backspace'],
    ['Select all · Deselect', '⌘/Ctrl A · Esc'],
    ['Undo · Redo', '⌘/Ctrl Z · ⇧⌘Z / Ctrl Y'],
    ['Play · Templates · Frame', 'Enter · T · F'],
    ['Turn next piece', 'Q / E or the ↻ button next to the piece types'],
  ];
  return (
    <div className={`help ${open ? 'is-on' : ''}`} onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2>Controls</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icons.close /></button>
        </div>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}
