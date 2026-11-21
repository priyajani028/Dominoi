import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { usePlayground, sceneRefs, newGroup } from '../store/usePlayground.js';
import { SPACING, BALL_R } from '../lib/constants.js';
import { buildKind, topOf, poseOf, kindTurn } from '../lib/pieces.js';
import { sfx, unlockAudio } from '../lib/sound.js';

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tmp = new THREE.Vector3();

/**
 * All pointer interaction with the playground lives here: placing/painting dominoes,
 * picking, moving, rotating, box-selecting, and placing/aiming the ball.
 * Listeners run in the capture phase so a tool drag can switch off the orbit controls first.
 */
export default function Controller() {
  const { camera, gl, controls } = useThree();
  const drag = useRef(null);
  const pointers = useRef(new Set());

  useEffect(() => {
    const el = gl.domElement;
    const S = usePlayground.getState;

    const setRay = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };
    const floorAt = (e) => {
      setRay(e);
      return raycaster.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
    };
    const pickDomino = () => {
      const mesh = sceneRefs.dominoMesh;
      if (!mesh || mesh.count === 0) return null;
      const res = raycaster.intersectObject(mesh, false)[0];
      return res && res.instanceId != null ? sceneRefs.dominoIds[res.instanceId] ?? null : null;
    };
    const onBall = (p) => {
      const b = S().ball;
      if (!b) return false;
      // Ray vs sphere first (accurate from any angle), then a generous floor-distance fallback.
      tmp.set(b.x, BALL_R, b.z);
      if (raycaster.ray.distanceToPoint(tmp) < BALL_R * 1.25) return true;
      return p && Math.hypot(p.x - b.x, p.z - b.z) < BALL_R * 1.6;
    };
    // Where a new placement would sit if dropped on piece `id`: centred on its stack, above its top.
    const stackTarget = (id) => {
      const ds = S().dominoes;
      const hitD = ds.find((d) => d.id === id);
      if (!hitD) return null;
      const near = ds.filter((d) => (hitD.g != null ? d.g === hitD.g : d.id === id) && Math.hypot(d.x - hitD.x, d.z - hitD.z) < 1);
      const x = near.reduce((a, d) => a + d.x, 0) / near.length;
      const z = near.reduce((a, d) => a + d.z, 0) / near.length;
      return { x, z, r: hitD.r, top: Math.max(...near.map(topOf)), g: hitD.g, baseIds: near.map((d) => d.id) };
    };
    // Anchor for the placement preview; the Ghost component builds the pieces from it.
    const ghostFor = (p, id) => {
      if (id != null) {
        const t = stackTarget(id);
        return t ? { x: t.x, z: t.z, r: t.r, top: t.top } : null;
      }
      return p ? { x: p.x, z: p.z, r: null, top: 0 } : null; // r: null → follow ghostRot
    };
    let lastAim = null;
    const aimSound = (b) => {
      const k = Math.round(b.power * 20);
      const a = Math.round(b.angle / 0.09);
      if (!lastAim || lastAim.k !== k || lastAim.a !== a) { sfx.aim(b.power); lastAim = { k, a }; }
    };
    const setControls = (on) => { if (controls) controls.enabled = on; };
    const begin = (e, d) => {
      drag.current = d;
      // On touch while editing, the camera's one-finger action is off anyway; leaving controls enabled
      // lets them track this finger so a second finger turns into a clean pinch / pan.
      if (!(e.pointerType === 'touch' && S().phase === 'edit')) setControls(false);
      try { el.setPointerCapture?.(e.pointerId); } catch { /* pointer already lifted (quick tap) */ }
    };

    const aimTo = (p) => {
      const b = S().ball;
      if (!b || !p) return;
      const dx = p.x - b.x, dz = p.z - b.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.15) return;
      const next = { ...b, angle: Math.atan2(dx, dz), power: Math.min(1, Math.max(0.05, (len - 0.6) / 4.5)) };
      S().setBall(next);
      aimSound(next);
    };

    // Touch: hold the tool action back for a moment so a two-finger pinch/pan doesn't first drop a piece.
    let pending = null;
    const clearPending = () => { if (pending) { clearTimeout(pending.timer); pending = null; } };
    const firePending = () => {
      if (!pending) return;
      const ev = pending.ev;
      clearPending();
      startDown(ev);
    };

    const onDown = (e) => {
      unlockAudio();
      pointers.current.add(e.pointerId);
      if (pointers.current.size > 1) {
        // second finger: hand over to camera gestures
        clearPending();
        endDrag(e, true);
        return;
      }
      if (e.pointerType === 'touch' && S().phase === 'edit' && S().tool !== 'view') {
        const ev = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: 'touch', button: 0, shiftKey: false, metaKey: false, ctrlKey: false };
        pending = { ev, timer: setTimeout(firePending, 90) };
        return;
      }
      startDown(e);
    };

    const startDown = (e) => {
      const s = S();
      if (e.button !== 0 || s.spaceHeld) return;
      const p = floorAt(e);
      if (!p) return;

      if (s.phase === 'ready') {
        if (s.ball && Math.hypot(p.x - s.ball.x, p.z - s.ball.z) < 2.2) {
          begin(e, { type: 'aim', launchOnUp: true });
          aimTo(p);
        }
        return;
      }
      if (s.phase !== 'edit' || s.tool === 'view') return;
      if (s.galleryOpen) s.toggleGallery(false);

      const ballHit = onBall(p);
      const id = ballHit ? null : pickDomino();

      if (s.tool === 'add') {
        const kind = s.pieceKind;
        s.commit();
        s.setGhost(null);
        if (id != null) {
          // Stack on top of the piece under the pointer; the new pieces join its group.
          const t = stackTarget(id);
          const g = t.g ?? newGroup();
          if (t.g == null) s.patchDominoes(new Map(t.baseIds.map((bid) => [bid, { g }])));
          s.addDominoes(buildKind(kind, t.x, t.z, t.r, t.top).map((d) => ({ ...d, g })), true);
          kind === 'aframe' ? sfx.aframe() : sfx.stack();
          return;
        }
        if (kind !== 'single') {
          const g = kind === 'aframe' ? newGroup() : undefined;
          s.addDominoes(buildKind(kind, p.x, p.z, s.ghostRot + kindTurn(kind)).map((d) => ({ ...d, g })), true);
          kind === 'aframe' ? sfx.aframe() : sfx.place(0.85);
          return;
        }
        const [first] = s.addDominoes([{ x: p.x, z: p.z, r: s.ghostRot }]);
        sfx.place();
        begin(e, { type: 'stroke', last: p, first, count: 1 });
        return;
      }

      if (s.tool === 'ball') {
        s.commit();
        if (!ballHit) {
          const prev = s.ball;
          s.setBall({ x: p.x, z: p.z, angle: prev?.angle ?? Math.PI, power: prev?.power ?? 0.2 });
          sfx.ballDrop();
          begin(e, { type: 'place-ball', start: p, sx: e.clientX, sy: e.clientY });
        } else {
          begin(e, { type: 'aim' });
        }
        return;
      }

      // select / move / rotate
      if (ballHit) {
        begin(e, { type: 'move-ball', start: p, base: { ...s.ball }, committed: false });
        return;
      }
      if (id != null) {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          s.toggleSelect(id);
          return;
        }
        if (!s.selected.has(id)) s.select([id]);
        const sel = S().selected;
        const base = new Map(S().dominoes.filter((d) => sel.has(d.id)).map((d) => [d.id, { x: d.x, z: d.z, r: d.r }]));
        if (s.tool === 'rotate') {
          let cx = 0, cz = 0;
          base.forEach((d) => { cx += d.x; cz += d.z; });
          begin(e, { type: 'rotate', sx: e.clientX, base, cx: cx / base.size, cz: cz / base.size, committed: false });
        } else {
          begin(e, { type: 'move', start: p, base, committed: false });
        }
        return;
      }
      begin(e, { type: 'marquee', x0: e.clientX, y0: e.clientY, additive: e.shiftKey || e.metaKey || e.ctrlKey });
    };

    const onMove = (e) => {
      if (pending && pending.ev.pointerId === e.pointerId && Math.hypot(e.clientX - pending.ev.clientX, e.clientY - pending.ev.clientY) > 8) firePending();
      const s = S();
      const d = drag.current;
      if (!d) {
        // hover feedback
        if (s.phase !== 'edit' || e.pointerType === 'touch') return;
        const p = floorAt(e);
        if (s.tool === 'add') {
          const id = pickDomino();
          s.setGhost(ghostFor(p, id));
          s.setHovered(id);
          el.style.cursor = id != null ? 'n-resize' : 'crosshair';
          return;
        }
        if (s.tool === 'view' || s.spaceHeld) { s.setHovered(null); el.style.cursor = 'grab'; return; }
        const ballHit = onBall(p);
        const id = ballHit ? null : pickDomino();
        s.setHovered(s.tool === 'ball' ? null : id);
        el.style.cursor = s.tool === 'ball' ? (ballHit ? 'grab' : 'copy') : id != null || ballHit ? (s.tool === 'rotate' ? 'ew-resize' : 'move') : 'default';
        return;
      }
      const p = floorAt(e);
      switch (d.type) {
        case 'stroke': {
          if (!p) return;
          // Paint a chain: drop a piece every SPACING along the pointer's path, facing the travel direction.
          let { last } = d;
          let dx = p.x - last.x, dz = p.z - last.z;
          let dist = Math.hypot(dx, dz);
          const add = [];
          while (dist >= SPACING) {
            const ux = dx / dist, uz = dz / dist;
            const r = Math.atan2(ux, uz);
            if (d.count === 1 && !add.length) {
              const patch = new Map([[d.first, { r }]]);
              s.patchDominoes(patch);
            }
            last = { x: last.x + ux * SPACING, z: last.z + uz * SPACING };
            add.push({ x: last.x, z: last.z, r });
            dx = p.x - last.x; dz = p.z - last.z; dist = Math.hypot(dx, dz);
          }
          if (add.length) {
            add.forEach((_, i) => setTimeout(() => sfx.place(1 + Math.random() * 0.06), i * 25));
            s.addDominoes(add);
            d.count += add.length;
            d.last = last;
          }
          break;
        }
        case 'move': {
          if (!p) return;
          const dx = p.x - d.start.x, dz = p.z - d.start.z;
          if (!d.committed) {
            if (Math.hypot(dx, dz) < 0.05) return;
            s.commit();
            d.committed = true;
          }
          const patch = new Map();
          d.base.forEach((b, id) => patch.set(id, { x: b.x + dx, z: b.z + dz }));
          s.patchDominoes(patch);
          break;
        }
        case 'rotate': {
          const a = (e.clientX - d.sx) * 0.012;
          const step = Math.round(a / 0.26);
          if (step !== d.step) { d.step = step; sfx.tick(1 + step * 0.02, 0.06); }
          if (!d.committed) {
            if (Math.abs(a) < 0.01) return;
            s.commit();
            d.committed = true;
          }
          const c = Math.cos(a), sn = Math.sin(a);
          const patch = new Map();
          d.base.forEach((b, id) => {
            const ox = b.x - d.cx, oz = b.z - d.cz;
            patch.set(id, { x: d.cx + ox * c + oz * sn, z: d.cz - ox * sn + oz * c, r: b.r + a });
          });
          s.patchDominoes(patch);
          break;
        }
        case 'marquee':
          s.setMarquee({ x0: d.x0, y0: d.y0, x1: e.clientX, y1: e.clientY });
          break;
        case 'move-ball': {
          if (!p) return;
          if (!d.committed) {
            s.commit();
            d.committed = true;
          }
          s.setBall({ ...d.base, x: d.base.x + p.x - d.start.x, z: d.base.z + p.z - d.start.z });
          break;
        }
        case 'place-ball':
          // A press-and-drag when placing the ball also aims it.
          if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) aimTo(p);
          break;
        case 'aim':
          aimTo(p);
          break;
      }
    };

    const endDrag = (e, cancelled = false) => {
      const d = drag.current;
      drag.current = null;
      setControls(true);
      if (!d) return;
      try { el.releasePointerCapture?.(e.pointerId); } catch { /* not captured */ }
      const s = S();
      if (d.type === 'marquee') {
        const m = s.marquee;
        s.setMarquee(null);
        if (cancelled) return;
        if (!m || (Math.abs(m.x1 - m.x0) < 4 && Math.abs(m.y1 - m.y0) < 4)) {
          if (!d.additive) s.clearSelection();
          return;
        }
        const r = el.getBoundingClientRect();
        const minX = Math.min(m.x0, m.x1), maxX = Math.max(m.x0, m.x1);
        const minY = Math.min(m.y0, m.y1), maxY = Math.max(m.y0, m.y1);
        const ids = [];
        for (const dom of s.dominoes) {
          tmp.set(dom.x, poseOf(dom).y, dom.z).project(camera);
          const sx = r.left + ((tmp.x + 1) / 2) * r.width;
          const sy = r.top + ((1 - tmp.y) / 2) * r.height;
          if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) ids.push(dom.id);
        }
        s.select(ids, d.additive);
      }
      if ((d.type === 'move' || d.type === 'rotate' || d.type === 'move-ball') && d.committed) sfx.drop();
      if (d.type === 'aim' && d.launchOnUp && !cancelled) s.launch();
    };

    const onUp = (e) => {
      pointers.current.delete(e.pointerId);
      if (pending && pending.ev.pointerId === e.pointerId) {
        if (e.type === 'pointercancel') clearPending();
        else firePending(); // a quick tap
      }
      endDrag(e);
    };
    const onLeave = () => {
      if (!drag.current) {
        S().setGhost(null);
        S().setHovered(null);
      }
    };
    const onContext = (e) => e.preventDefault();

    el.addEventListener('pointerdown', onDown, { capture: true });
    el.addEventListener('pointermove', onMove, { capture: true });
    el.addEventListener('pointerup', onUp, { capture: true });
    el.addEventListener('pointercancel', onUp, { capture: true });
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('contextmenu', onContext);
    return () => {
      clearPending();
      el.removeEventListener('pointerdown', onDown, { capture: true });
      el.removeEventListener('pointermove', onMove, { capture: true });
      el.removeEventListener('pointerup', onUp, { capture: true });
      el.removeEventListener('pointercancel', onUp, { capture: true });
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('contextmenu', onContext);
    };
  }, [camera, gl, controls]);

  return null;
}
