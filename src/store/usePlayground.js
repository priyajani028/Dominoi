import { create } from 'zustand';
import { getTemplate } from '../lib/templates.js';
import { bounds } from '../lib/paths.js';
import { sfx } from '../lib/sound.js';

let nextId = 1;
let nextGroup = 1;
export const newGroup = () => nextGroup++;

/**
 * Pieces: { id, x, z, r, y?, tilt?, g? }
 *  y/tilt are only set for stacked, leaning (A-frame) or flat pieces; g links pieces that move,
 *  select and delete together (an A-frame pair, a stack and whatever sits on it).
 * Group numbers coming from templates/copies are remapped to fresh ones.
 */
const withIds = (list, keepGroups = false) => {
  const remap = new Map();
  return list.map((d) => {
    const out = { id: nextId++, x: d.x, z: d.z, r: d.r };
    if (d.y != null) out.y = d.y;
    if (d.tilt) out.tilt = d.tilt;
    if (d.g != null) {
      if (keepGroups) out.g = d.g;
      else {
        if (!remap.has(d.g)) remap.set(d.g, newGroup());
        out.g = remap.get(d.g);
      }
    }
    return out;
  });
};

/** Expand a set of ids so every group is selected whole. */
const expandGroups = (ids, dominoes) => {
  const groups = new Set();
  const byId = new Map(dominoes.map((d) => [d.id, d]));
  ids.forEach((id) => { const g = byId.get(id)?.g; if (g != null) groups.add(g); });
  const out = new Set(ids);
  if (groups.size) dominoes.forEach((d) => { if (d.g != null && groups.has(d.g)) out.add(d.id); });
  return out;
};
const HISTORY_LIMIT = 150;

const defaultBallFor = (dominoes) => {
  const f = dominoes[0];
  if (!f) return null;
  return { x: f.x - Math.sin(f.r) * 2.6, z: f.z - Math.cos(f.r) * 2.6, angle: f.r, power: 0.2 };
};

export const usePlayground = create((set, get) => ({
  // ── arrangement ─────────────────────────────────────────────
  dominoes: [],
  ball: null, // { x, z, angle, power }

  // ── editing ─────────────────────────────────────────────────
  tool: 'add', // view | add | select | move | rotate | ball
  selected: new Set(),
  hovered: null,
  ghost: null, // floor point under cursor for the add tool
  ghostRot: 0,
  pieceKind: 'single', // single | aframe | flat  (Add tool)
  marquee: null, // screen-space rect while box-selecting
  spaceHeld: false,

  // ── history ─────────────────────────────────────────────────
  past: [],
  future: [],

  // ── simulation ──────────────────────────────────────────────
  phase: 'edit', // edit | ready | running | done
  runId: 0,
  autoLaunch: false,
  stats: { fallen: 0, total: 0 },

  // ── ui ──────────────────────────────────────────────────────
  ready: false, // first frame rendered (hides the splash)
  galleryOpen: false,
  hintDismissed: false,
  toast: null,
  fit: null, // { id, minX, maxX, minZ, maxZ } – camera framing request

  // ────────────────────────────────────────────────────────────
  commit: () => {
    const { dominoes, ball, past } = get();
    set({ past: [...past, { dominoes, ball }].slice(-HISTORY_LIMIT), future: [] });
  },
  undo: () => {
    const { past, future, dominoes, ball, phase } = get();
    if (phase !== 'edit' || !past.length) return;
    const prev = past[past.length - 1];
    set({ past: past.slice(0, -1), future: [{ dominoes, ball }, ...future], ...prev, selected: new Set() });
    sfx.tick(0.8, 0.09);
  },
  redo: () => {
    const { past, future, dominoes, ball, phase } = get();
    if (phase !== 'edit' || !future.length) return;
    const [next, ...rest] = future;
    set({ future: rest, past: [...past, { dominoes, ball }], ...next, selected: new Set() });
    sfx.tick(1.1, 0.09);
  },

  setTool: (tool) => {
    if (get().phase !== 'edit') return;
    if (get().tool !== tool) sfx.ui();
    set({ tool, ghost: null, hovered: null });
  },
  setHovered: (hovered) => get().hovered !== hovered && set({ hovered }),
  setGhost: (ghost) => set({ ghost }),
  rotateGhost: (d) => { set({ ghostRot: get().ghostRot + d }); sfx.tick(1, 0.05); },
  setPieceKind: (pieceKind) => {
    if (get().pieceKind !== pieceKind) sfx.ui();
    set({ pieceKind, tool: 'add' });
  },
  setMarquee: (marquee) => set({ marquee }),
  setSpaceHeld: (spaceHeld) => set({ spaceHeld }),
  showToast: (text) => {
    const id = Math.random();
    set({ toast: { id, text } });
    setTimeout(() => get().toast?.id === id && set({ toast: null }), 2200);
  },

  addDominoes: (list, keepGroups = false) => {
    const added = withIds(list, keepGroups);
    set({ dominoes: [...get().dominoes, ...added], hintDismissed: true });
    return added.map((d) => d.id);
  },
  patchDominoes: (patch) => {
    // patch: Map<id, {x,z,r}>
    set({ dominoes: get().dominoes.map((d) => (patch.has(d.id) ? { ...d, ...patch.get(d.id) } : d)) });
  },

  select: (ids, additive = false) => {
    const next = additive ? new Set(get().selected) : new Set();
    expandGroups(ids, get().dominoes).forEach((id) => next.add(id));
    if (next.size) sfx.select();
    set({ selected: next });
  },
  toggleSelect: (id) => {
    const next = new Set(get().selected);
    const group = expandGroups([id], get().dominoes);
    const on = !next.has(id);
    group.forEach((gid) => (on ? next.add(gid) : next.delete(gid)));
    sfx.select();
    set({ selected: next });
  },
  selectAll: () => set({ selected: new Set(get().dominoes.map((d) => d.id)) }),
  clearSelection: () => get().selected.size && set({ selected: new Set() }),

  deleteSelected: () => {
    const { selected, dominoes, phase } = get();
    if (phase !== 'edit') return;
    if (!selected.size) return get().showToast('Select dominoes to delete');
    get().commit();
    set({ dominoes: dominoes.filter((d) => !selected.has(d.id)), selected: new Set(), hovered: null });
    sfx.remove();
  },
  duplicateSelected: () => {
    const { selected, dominoes, phase } = get();
    if (phase !== 'edit') return;
    if (!selected.size) return get().showToast('Select dominoes to duplicate');
    get().commit();
    const src = dominoes.filter((d) => selected.has(d.id));
    const b = bounds(src);
    const dx = src.length === 1 ? 0.9 : 0;
    const dz = src.length === 1 ? 0 : b.maxZ - b.minZ + 2;
    const ids = get().addDominoes(src.map((d) => ({ ...d, x: d.x + dx, z: d.z + dz })));
    set({ selected: new Set(ids) });
    sfx.cascade(src.length);
  },
  rotateSelected: (delta) => {
    const { selected, dominoes, phase } = get();
    if (phase !== 'edit' || !selected.size) return false;
    get().commit();
    const src = dominoes.filter((d) => selected.has(d.id));
    const cx = src.reduce((s, d) => s + d.x, 0) / src.length;
    const cz = src.reduce((s, d) => s + d.z, 0) / src.length;
    const c = Math.cos(delta), s = Math.sin(delta);
    const patch = new Map();
    for (const d of src) {
      const ox = d.x - cx, oz = d.z - cz;
      // rotation about +Y: x' = x cos + z sin, z' = -x sin + z cos
      patch.set(d.id, { x: cx + ox * c + oz * s, z: cz - ox * s + oz * c, r: d.r + delta });
    }
    get().patchDominoes(patch);
    sfx.tick(1, 0.06);
    return true;
  },

  clearCanvas: () => {
    const { dominoes, ball } = get();
    if (!dominoes.length && !ball) return;
    get().commit();
    set({ dominoes: [], ball: null, selected: new Set(), hovered: null });
    sfx.sweep();
  },

  setBall: (ball) => set({ ball }),

  loadTemplate: (id, mode = 'replace') => {
    const t = getTemplate(id);
    if (!t || get().phase !== 'edit') return;
    const { dominoes: list, ball } = t.build();
    get().commit();
    const existing = get().dominoes;
    if (mode === 'replace' || !existing.length) {
      set({ dominoes: [], selected: new Set() });
      get().addDominoes(list);
      set({ ball, galleryOpen: false, tool: 'select', fit: { id: Math.random(), ...bounds([...list, ball]) } });
      sfx.cascade(list.length);
      return;
    }
    // Add beside the current creation, then select it so it can be dragged into place.
    const eb = bounds(existing), tb = bounds(list);
    const ox = eb.maxX + 3 - tb.minX;
    const oz = (eb.minZ + eb.maxZ) / 2 - (tb.minZ + tb.maxZ) / 2;
    const moved = list.map((d) => ({ ...d, x: d.x + ox, z: d.z + oz }));
    const ids = get().addDominoes(moved);
    const nextBall = get().ball ?? { ...ball, x: ball.x + ox, z: ball.z + oz };
    const all = bounds([...existing, ...moved, nextBall]);
    set({ ball: nextBall, selected: new Set(ids), galleryOpen: false, tool: 'move', fit: { id: Math.random(), ...all } });
    get().showToast('Template added — drag it into place');
    sfx.cascade(list.length);
  },

  fitAll: () => {
    const { dominoes, ball } = get();
    if (dominoes.length) set({ fit: { id: Math.random(), ...bounds(ball ? [...dominoes, ball] : dominoes) } });
  },

  // ── simulation flow ─────────────────────────────────────────
  play: () => {
    const { dominoes, ball, phase, runId } = get();
    if (phase !== 'edit') return;
    if (!dominoes.length) return get().showToast('Place some dominoes first');
    if (!ball) set({ ball: defaultBallFor(dominoes) });
    set({
      phase: 'ready', runId: runId + 1, autoLaunch: false, selected: new Set(), hovered: null,
      ghost: null, galleryOpen: false, stats: { fallen: 0, total: dominoes.length },
    });
  },
  launch: () => {
    if (get().phase !== 'ready') return;
    sfx.launch(get().ball?.power ?? 0.3);
    set({ phase: 'running' });
  },
  replay: () => {
    sfx.stopRoll();
    const { runId, dominoes } = get();
    set({ phase: 'ready', runId: runId + 1, autoLaunch: true, stats: { fallen: 0, total: dominoes.length } });
  },
  finish: () => {
    if (get().phase !== 'running') return;
    const { fallen, total } = get().stats;
    sfx.stopRoll();
    sfx.done(fallen === total);
    set({ phase: 'done' });
  },
  setStats: (stats) => set({ stats }),
  reset: () => {
    sfx.stopRoll();
    sfx.ui();
    set({ phase: 'edit', autoLaunch: false });
  },

  setReady: () => !get().ready && set({ ready: true }),

  /** Restore a saved arrangement (fresh ids; groups stay together). */
  hydrate: (data) => {
    if (!data || !Array.isArray(data.dominoes)) return;
    const valid = data.dominoes.filter((d) => [d.x, d.z, d.r].every(Number.isFinite));
    if (!valid.length) return;
    set({ dominoes: [] });
    get().addDominoes(valid);
    const b = data.ball;
    const ball = b && [b.x, b.z, b.angle, b.power].every(Number.isFinite) ? b : null;
    set({ ball, past: [], future: [], hintDismissed: true, tool: 'select', fit: { id: Math.random(), ...bounds(ball ? [...valid, ball] : valid) } });
  },

  toggleGallery: (open) => {
    const next = open ?? !get().galleryOpen;
    if (next !== get().galleryOpen) sfx.ui();
    set({ galleryOpen: next });
  },
  dismissHint: () => set({ hintDismissed: true }),
}));

// Non-reactive handles to scene objects for picking.
export const sceneRefs = { dominoMesh: null, dominoIds: [] };
