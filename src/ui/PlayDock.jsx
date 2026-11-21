import { usePlayground } from '../store/usePlayground.js';
import { Icons } from './icons.jsx';

/** Play button while editing; simulation controls while the chain reaction runs. */
export default function PlayDock() {
  const phase = usePlayground((s) => s.phase);
  const stats = usePlayground((s) => s.stats);
  const count = usePlayground((s) => s.dominoes.length);
  const s = usePlayground.getState;

  if (phase === 'edit') {
    return (
      <button className="play-btn" onClick={() => s().play()} disabled={!count} aria-label="Play">
        <Icons.play width={22} height={22} />
        <span>Play</span>
      </button>
    );
  }

  const pct = stats.total ? Math.round((stats.fallen / stats.total) * 100) : 0;
  return (
    <div className="dock simbar">
      <div className="sim-status">
        {phase === 'ready' && (
          <>
            <span className="dot pulse" />
            <span className="lg">Drag from the ball to aim — release to launch</span>
            <span className="sm">Drag from the ball to aim</span>
          </>
        )}
        {phase !== 'ready' && (
          <>
            <div className="meter"><div style={{ width: `${pct}%` }} /></div>
            <span className="num">{stats.fallen}<i>/{stats.total}</i></span>
            <span className="muted hide-sm">{phase === 'done' ? (stats.fallen === stats.total ? 'Every piece fell' : 'Chain stopped') : 'toppling…'}</span>
          </>
        )}
      </div>
      <span className="sep" />
      {phase === 'ready' && (
        <button className="pill primary" onClick={() => s().launch()}>
          <Icons.play width={14} height={14} /> Launch
        </button>
      )}
      {phase !== 'ready' && (
        <button className="pill" onClick={() => s().replay()}>
          <Icons.replay width={16} height={16} /> <span>Replay</span>
        </button>
      )}
      <button className="pill ghost" onClick={() => s().reset()}>
        <Icons.reset width={16} height={16} /> <span>Rebuild</span>
      </button>
    </div>
  );
}
