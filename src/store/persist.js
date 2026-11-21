import { usePlayground } from './usePlayground.js';

// Autosave the current creation to localStorage so a refresh (or closing the tab) never loses work.
const KEY = 'dominoi:scene:v1';
const MAX_PIECES = 20000;

export function restoreScene() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) usePlayground.getState().hydrate(JSON.parse(raw));
  } catch {
    /* corrupt or unavailable storage – start fresh */
  }
}

export function startAutosave() {
  let timer = null;
  let last = null;
  return usePlayground.subscribe((s) => {
    if (s.dominoes === last?.dominoes && s.ball === last?.ball) return;
    last = { dominoes: s.dominoes, ball: s.ball };
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (!s.dominoes.length && !s.ball) return localStorage.removeItem(KEY);
        const dominoes = s.dominoes.slice(0, MAX_PIECES).map(({ id, ...d }) => d);
        localStorage.setItem(KEY, JSON.stringify({ v: 1, dominoes, ball: s.ball }));
      } catch {
        /* quota exceeded or private mode – autosave is best-effort */
      }
    }, 500);
  });
}
