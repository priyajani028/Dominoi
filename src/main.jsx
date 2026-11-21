import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { restoreScene, startAutosave } from './store/persist.js';
import { unlockAudio } from './lib/sound.js';
import './index.css';

restoreScene();
startAutosave();

// iOS/Safari only start Web Audio from a completed gesture; unlock on the first one we see.
for (const type of ['pointerup', 'touchend', 'keydown']) {
  window.addEventListener(type, unlockAudio, { passive: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
