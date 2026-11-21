import { useMemo, useState } from 'react';
import { usePlayground } from '../store/usePlayground.js';
import { TEMPLATES } from '../lib/templates.js';
import { bounds } from '../lib/paths.js';
import { Icons } from './icons.jsx';

function Thumb({ build }) {
  const { dominoes, ball } = useMemo(build, [build]);
  const b = bounds([...dominoes, { x: ball.x, z: ball.z }]);
  const pad = 1.2;
  const w = b.maxX - b.minX + pad * 2, h = b.maxZ - b.minZ + pad * 2;
  const size = Math.max(w, h);
  const vx = b.minX - pad - (size - w) / 2, vz = b.minZ - pad - (size - h) / 2;
  const sw = Math.max(0.1, size / 70);
  return (
    <svg viewBox={`${vx} ${vz} ${size} ${size}`} className="thumb">
      {dominoes.map((d, i) => {
        const c = Math.cos(d.r) * 0.27, s = Math.sin(d.r) * 0.27;
        const flat = Math.abs(d.tilt ?? 0) > 1;
        return <line key={i} x1={d.x - c} y1={d.z + s} x2={d.x + c} y2={d.z - s} strokeWidth={sw * (flat ? 5 : 1.6)} />;
      })}
      <circle cx={ball.x} cy={ball.z} r={Math.max(0.42, size / 34)} className="thumb-ball" />
    </svg>
  );
}

export default function Gallery() {
  const open = usePlayground((s) => s.galleryOpen);
  const count = usePlayground((s) => s.dominoes.length);
  const [mode, setMode] = useState('replace');
  const s = usePlayground.getState;
  const effective = count ? mode : 'replace';

  return (
    <div className={`gallery ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="gallery-head">
        <div>
          <h2>Templates</h2>
          <p>Start from a pattern — every piece stays editable.</p>
        </div>
        <div className="seg" role="tablist">
          <button className={effective === 'replace' ? 'on' : ''} onClick={() => setMode('replace')}>Replace</button>
          <button className={effective === 'add' ? 'on' : ''} disabled={!count} onClick={() => setMode('add')}>Add to scene</button>
        </div>
        <button className="icon-btn" onClick={() => s().toggleGallery(false)} aria-label="Close"><Icons.close /></button>
      </div>
      <div className="gallery-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="card" onClick={() => s().loadTemplate(t.id, effective)}>
            <Thumb build={t.build} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
