import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    // The 3D engine (three.js + Rapier, which ships its physics as inlined WebAssembly) is loaded
    // lazily behind the splash screen as one cacheable chunk; it is large by nature.
    chunkSizeWarningLimit: 4500,
  },
});
