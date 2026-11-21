import { useEffect } from 'react';
import { usePlayground } from '../store/usePlayground.js';
import { unlockAudio } from '../lib/sound.js';

const TOOL_KEYS = { h: 'view', a: 'add', v: 'select', m: 'move', r: 'rotate', b: 'ball' };

export function useKeyboard({ onHelp }) {
  useEffect(() => {
    const S = usePlayground.getState;
    const down = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      unlockAudio();
      const s = S();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (e.code === 'Space') {
        e.preventDefault();
        if (!s.spaceHeld) s.setSpaceHeld(true);
        return;
      }
      if (k === 'escape') {
        if (s.galleryOpen) return s.toggleGallery(false);
        if (s.phase !== 'edit') return s.reset();
        return s.clearSelection();
      }
      if (mod && k === 'z') { e.preventDefault(); return e.shiftKey ? s.redo() : s.undo(); }
      if (mod && k === 'y') { e.preventDefault(); return s.redo(); }
      if (mod && k === 'd') { e.preventDefault(); return s.duplicateSelected(); }
      if (mod && k === 'a') { e.preventDefault(); return s.phase === 'edit' && s.selectAll(); }
      if (mod) return;

      if (k === 'enter') {
        if (s.phase === 'edit') return s.play();
        if (s.phase === 'ready') return s.launch();
        return s.replay();
      }
      if (k === 'f') return s.fitAll();
      if (k === '?') return onHelp();
      if (s.phase !== 'edit') return;
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); return s.deleteSelected(); }
      if (k === 't') return s.toggleGallery();
      if (k === 'q' || k === 'e') {
        const step = (e.shiftKey ? 5 : 15) * (Math.PI / 180) * (k === 'q' ? 1 : -1);
        if (!s.rotateSelected(step)) s.rotateGhost(step);
        return;
      }
      if (k === '1' || k === '2' || k === '3') return s.setPieceKind(['single', 'aframe', 'flat'][+k - 1]);
      if (TOOL_KEYS[k]) s.setTool(TOOL_KEYS[k]);
    };
    const up = (e) => {
      if (e.code === 'Space') S().setSpaceHeld(false);
    };
    const blur = () => S().setSpaceHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [onHelp]);
}
