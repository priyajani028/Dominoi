# Dominoi — a 3D domino playground

An infinite white tabletop where you stand up, stack and lean dominoes, shape them into patterns, and knock them down with a glossy red ball. Every collision comes from the physics engine (Rapier). Nothing is a scripted animation.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run verify     # headless physics check: every template must fully topple
npm run lint       # ESLint (React hooks rules)
npm run preview    # serve the production build locally
```

## Deploying

It's a static site — `npm run build` produces `dist/`, which any static host can serve. Config is included for:

- **Vercel** — import the repo; `vercel.json` sets the build, long-term caching for hashed assets, and security headers.
- **Netlify** — import the repo; `netlify.toml` does the same.
- **Cloudflare Pages** — build command `npm run build`, output `dist`; headers come from `public/_headers`.
- **GitHub Pages / any sub-path** — build with `npx vite build --base=/your-repo/`.

Requires Node 20.19+ to build. After deploying, replace the relative `og:image` in `index.html` with the absolute URL (`https://your-domain/og-image.png`) so link previews show the image on every platform.

## Production notes

- **Loading** — a static splash (in `index.html`) shows instantly; the 3D engine loads as a separate lazy chunk and the splash fades after the first frame. Total download is ~1.4 MB gzipped, most of it Rapier's WebAssembly physics engine; it's cached after the first visit.
- **Phones & tablets** — responsive layout for portrait, landscape and notched screens (safe areas). Touch: tap/drag with the active tool, two fingers to pan and pinch-zoom, the Orbit tool to rotate. A short delay on touch start prevents pinches from dropping stray pieces.
- **Performance tiers** — touch / small / low-core devices get a lighter pipeline (max 1.5× pixel ratio, 1024 px shadows, cheaper ambient occlusion), and resolution drops automatically if the frame rate sags.
- **Autosave** — the arrangement is saved to `localStorage` and restored on reload.
- **Resilience** — friendly screens if WebGL is unavailable or the 3D view crashes (with reload; work is preserved).
- **PWA basics** — web manifest and icons, so it can be added to a home screen.
- **Sound on iOS** — Web Audio is unlocked on the first tap; iPhones in silent mode mute web audio.

## Using it

| Tool | What it does |
|---|---|
| **Orbit (H)** | Left-drag orbits. Also: right-drag anywhere, or hold Space and drag |
| **Add (A)** | Pick a piece type — **1 Single**, **2 A-frame** (two dominoes leaning into a ^), **3 Flat** (lying down, a roof or bridge). Click the floor to place; with Single, drag to draw a whole chain. **Click an existing piece to stack on top of it** — towers, card-house A-frame → flat → A-frame, a domino balanced on a peak. Q / E turn the next piece |
| **Select (V)** | Click a piece or box-drag to select it. Shift adds to the selection; drag selected pieces to move them |
| **Move (M)** | Drag any piece to move the whole selection |
| **Rotate (R)** | Drag a piece sideways to rotate the selection around its centre. Q / E rotate in 15° steps (hold Shift for 5°) |
| **Ball (B)** | Click to place the ball; drag from it to set direction and power |
| **Templates (T)** | 13 patterns, including *Towers & Peaks* (stacked pieces and A-frame mountains). *Replace* swaps out the scene; *Add to scene* places the pattern beside your work and selects it so you can drag it into place |

Stacked pieces and A-frames form a group: they select, move, duplicate and delete together.

**Sound** is synthesised live with Web Audio (no audio files): placing, stacking, aiming the ball (a ratchet that rises with power), launch, the ball's roll, every domino strike and landing, and a chime when it all settles. Toggle it with the speaker button (remembered between visits).

Other keys: ⌘/Ctrl D duplicate, Delete removes, ⌘/Ctrl A selects everything, Esc deselects, ⌘Z / ⇧⌘Z undo and redo, F frames everything, Enter plays.
Camera: scroll to zoom (it zooms toward the cursor), Shift + right-drag or middle-drag to pan. On touch screens, pinch or use two fingers.

**Play** locks editing and builds a physics world from your arrangement. Drag from the ball and release to launch it, or press **Launch**. When everything settles you can **Replay** the same run as often as you like, or **Rebuild** to go back to editing. The simulation never changes your saved layout. If you press Play without placing a ball, one is set up automatically, aimed at your first domino.

## Architecture

```
src/
  lib/
    constants.js       domino size, spacing, ball, gravity
    physicsParams.js   friction, density, damping (shared by the app and the verify script)
    paths.js           turtle paths, parametric curves, arc-length sampling, rounded polylines
    templates.js       the 13 pattern generators (each returns dominoes + a pre-aimed ball)
    pieces.js          piece poses: single / A-frame / flat, stacking heights, quaternions
    sound.js           procedural Web Audio sound effects
    quality.js         device performance tier
    webgl.js           WebGL support check
  store/
    usePlayground.js   Zustand store: arrangement, selection, tools, undo/redo, simulation phases
    persist.js         localStorage autosave / restore
  scene/
    Scene.jsx          lights, environment, floor, camera controls, physics root, post-processing
    EditDominoes.jsx   editable dominoes drawn as one InstancedMesh (selection and hover tints)
    SimWorld.jsx       physics run: InstancedRigidBodies + ball, launching, finish detection
    Controller.jsx     all pointer interaction (paint, pick, move, rotate, marquee, ball aim)
    Helpers.jsx        editable ball, placement ghost, aim indicator
    CameraRig.jsx      smooth camera framing
    assets.js          bevelled domino geometry with an engraved divider line, materials
  ui/                  toolbar, top bar, play dock, template gallery, onboarding, help, keyboard
scripts/
  verify-templates.mjs runs every template through Rapier headlessly and checks that every piece falls
```

Notes:
- Dominoes are 1 unit tall and stand 0.5 units apart. Gravity is scaled to −30 so the pieces fall quickly, the way small real dominoes do.
- In edit mode, all dominoes are drawn by a single instanced mesh. Each run builds a new physics world from the saved arrangement (keyed by run id), so replays always start from exactly the same layout.
- Every piece starts the simulation asleep, so stacks and A-frames rest exactly as built until something touches them; then the whole cluster wakes and real physics takes over.
- Heart and Infinity start at a "fork" piece that sets off two branches at once. A chain can't reliably cross its own path, so these shapes avoid crossings entirely.
