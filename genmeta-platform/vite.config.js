import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run dev`            → local app on http://localhost:5173
// `npm run build:hosted`   → one self-contained HTML file (dist-hosted/index.html)
export default defineConfig(({ mode }) => ({
  plugins: mode === 'hosted' ? [react(), viteSingleFile()] : [react()],
  define: mode === 'hosted' ? { 'import.meta.env.VITE_TARGET': JSON.stringify('artifact') } : {},
  build: mode === 'hosted' ? { outDir: 'dist-hosted', copyPublicDir: false, assetsInlineLimit: 100000000 } : {},
  server: { port: 5173, open: true },
}));
