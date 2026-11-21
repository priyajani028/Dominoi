import { usePlayground } from '../store/usePlayground.js';
import { Icons } from './icons.jsx';

const TOOLS = [
  { id: 'view', label: 'Orbit view', key: 'H' },
  { id: 'add', label: 'Add domino', key: 'A' },
  { id: 'select', label: 'Select', key: 'V' },
  { id: 'move', label: 'Move', key: 'M', className: 'hide-sm' }, // on phones, Select already drags pieces
  { id: 'rotate', label: 'Rotate', key: 'R' },
  { id: 'ball', label: 'Ball — place & aim', key: 'B' },
];

export function Btn({ icon, label, kbd, active, disabled, onClick, className = '', children }) {
  const Icon = Icons[icon];
  return (
    <button className={`tb-btn ${active ? 'is-active' : ''} ${className}`} disabled={disabled} onClick={onClick} aria-label={label}>
      {Icon && <Icon />}
      {children}
      <span className="tip">{label}{kbd && <kbd>{kbd}</kbd>}</span>
    </button>
  );
}

/** Floating editing toolbar (bottom centre). */
export default function Toolbar() {
  const tool = usePlayground((s) => s.tool);
  const phase = usePlayground((s) => s.phase);
  const nSel = usePlayground((s) => s.selected.size);
  const galleryOpen = usePlayground((s) => s.galleryOpen);
  const s = usePlayground.getState;
  const editing = phase === 'edit';

  return (
    <div className={`dock toolbar ${editing ? '' : 'is-hidden'}`}>
      <div className="group">
        {TOOLS.map((t) => (
          <Btn key={t.id} icon={t.id} label={t.label} kbd={t.key} className={t.className} active={tool === t.id} onClick={() => s().setTool(t.id)} />
        ))}
      </div>
      <span className="sep" />
      <div className="group">
        <Btn icon="duplicate" label="Duplicate" kbd="⌘D" disabled={!nSel} onClick={() => s().duplicateSelected()} />
        <Btn icon="trash" label="Delete" kbd="⌫" disabled={!nSel} onClick={() => s().deleteSelected()} />
      </div>
      <span className="sep" />
      <Btn icon="templates" label="Templates" kbd="T" active={galleryOpen} className="wide" onClick={() => s().toggleGallery()}>
        <span className="btn-text">Templates</span>
      </Btn>
    </div>
  );
}

const KINDS = [
  { id: 'single', label: 'Single', key: '1' },
  { id: 'aframe', label: 'A-frame', key: '2' },
  { id: 'flat', label: 'Flat', key: '3' },
];

/** Piece type for the Add tool: a standing domino, a leaning ^ pair, or one lying flat. */
export function KindPicker() {
  const tool = usePlayground((s) => s.tool);
  const phase = usePlayground((s) => s.phase);
  const kind = usePlayground((s) => s.pieceKind);
  const on = tool === 'add' && phase === 'edit';
  return (
    <div className={`kinds ${on ? 'is-on' : ''}`} role="radiogroup" aria-label="Piece type">
      {KINDS.map((k) => {
        const Icon = Icons[k.id];
        return (
          <button
            key={k.id}
            role="radio"
            aria-checked={kind === k.id}
            className={kind === k.id ? 'on' : ''}
            onClick={() => usePlayground.getState().setPieceKind(k.id)}
            title={`${k.label} (${k.key})`}
          >
            <Icon width={17} height={17} />
            <span>{k.label}</span>
          </button>
        );
      })}
      <span className="kinds-sep" />
      <button className="turn" onClick={() => usePlayground.getState().rotateGhost(Math.PI / 4)} title="Turn next piece 45° (Q / E)" aria-label="Turn next piece">
        <Icons.rotate width={17} height={17} />
      </button>
    </div>
  );
}
