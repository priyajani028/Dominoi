import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import Toolbar, { KindPicker } from './ui/Toolbar.jsx';
import TopBar from './ui/TopBar.jsx';
import PlayDock from './ui/PlayDock.jsx';
import Gallery from './ui/Gallery.jsx';
import { Marquee, Toast, ToolHint, HelpSheet } from './ui/Overlays.jsx';
import ErrorBoundary, { Fallback } from './ui/ErrorBoundary.jsx';
import { hasWebGL } from './lib/webgl.js';
import { useKeyboard } from './ui/useKeyboard.js';
import { usePlayground } from './store/usePlayground.js';
import { QUALITY } from './lib/quality.js';

// The 3D scene (three.js, physics, post-processing) is its own chunk so the UI shell paints first.
const Scene = lazy(() => import('./scene/Scene.jsx'));

export default function App() {
  const [help, setHelp] = useState(false);
  const toggleHelp = useCallback(() => setHelp((v) => !v), []);
  useKeyboard({ onHelp: toggleHelp });
  const phase = usePlayground((s) => s.phase);
  const ready = usePlayground((s) => s.ready);
  const [dpr, setDpr] = useState(QUALITY.maxDpr);
  const [webgl] = useState(hasWebGL);

  // Fade out the static splash from index.html once the first frame is on screen.
  useEffect(() => {
    if (!ready) return;
    const el = document.getElementById('splash');
    if (!el) return;
    el.classList.add('is-gone');
    const t = setTimeout(() => el.remove(), 700);
    return () => clearTimeout(t);
  }, [ready]);

  if (!webgl) {
    document.getElementById('splash')?.remove();
    return (
      <Fallback
        title="Dominoi needs WebGL"
        body="Your browser or device has 3D graphics turned off. Try a recent Chrome, Safari, Edge or Firefox, or enable hardware acceleration."
      />
    );
  }

  return (
    <div className={`app phase-${phase}`}>
      <ErrorBoundary>
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={dpr}
          camera={{ position: [0, 19, 15], fov: 35, near: 0.1, far: 400 }}
          gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
        >
          {/* Drop resolution if the frame rate sags; restore it when there's headroom. */}
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(QUALITY.maxDpr)}
            flipflops={3}
            onFallback={() => setDpr(1)}
          />
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      <TopBar onHelp={toggleHelp} />
      <ToolHint />
      <KindPicker />
      <Toolbar />
      <PlayDock />
      <Gallery />
      <Marquee />
      <Toast />
      <HelpSheet open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
