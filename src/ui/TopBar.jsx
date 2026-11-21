import { useState } from 'react';
import { usePlayground } from '../store/usePlayground.js';
import { Btn } from './Toolbar.jsx';
import { isMuted, setMuted, unlockAudio } from '../lib/sound.js';
import Logo from './Logo.jsx';

export default function TopBar({ onHelp }) {
  const count = usePlayground((s) => s.dominoes.length);
  const nSel = usePlayground((s) => s.selected.size);
  const canUndo = usePlayground((s) => s.past.length > 0);
  const canRedo = usePlayground((s) => s.future.length > 0);
  const phase = usePlayground((s) => s.phase);
  const [confirm, setConfirm] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const toggleSound = () => {
    unlockAudio();
    setMuted(!muted);
    setMutedState(!muted);
  };
  const s = usePlayground.getState;
  const editing = phase === 'edit';

  return (
    <>
      <div className="brand">
        <Logo className="brand-mark" />
        <div>
          <div className="brand-name">Dominoi</div>
          <div className="brand-sub">
            {count} {count === 1 ? 'piece' : 'pieces'}
            {nSel > 0 && editing && <> · <b>{nSel} selected</b></>}
          </div>
        </div>
      </div>

      <div className={`dock topright ${editing ? '' : 'is-dim'}`}>
        <Btn className="edit-only" icon="undo" label="Undo" kbd="⌘Z" disabled={!editing || !canUndo} onClick={() => s().undo()} />
        <Btn className="edit-only" icon="redo" label="Redo" kbd="⇧⌘Z" disabled={!editing || !canRedo} onClick={() => s().redo()} />
        <span className="sep" />
        <Btn className="hide-xs" icon="focus" label="Frame all" kbd="F" disabled={!count} onClick={() => s().fitAll()} />
        <div className="pop-anchor">
          <Btn className="edit-only" icon="clear" label="Clear canvas" disabled={!editing || !count} onClick={() => setConfirm((v) => !v)} />
          {confirm && editing && (
            <div className="popover">
              <p>Clear all {count} pieces?</p>
              <div className="row">
                <button className="pill ghost" onClick={() => setConfirm(false)}>Cancel</button>
                <button className="pill danger" onClick={() => { s().clearCanvas(); setConfirm(false); }}>Clear</button>
              </div>
            </div>
          )}
        </div>
        <Btn icon={muted ? 'soundOff' : 'soundOn'} label={muted ? 'Sound off' : 'Sound on'} onClick={toggleSound} />
        <Btn icon="help" label="Controls" kbd="?" onClick={onHelp} />
      </div>
    </>
  );
}
