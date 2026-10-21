import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolvePersonalPreview } from './demo/preview';

export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [react(), {
    name: 'opt-in-personal-demo',
    resolveId(id) { if (id === 'virtual:skyline-preview') return '\0virtual:skyline-preview'; },
    load(id) {
      if (id !== '\0virtual:skyline-preview') return;
      const data = resolvePersonalPreview(process.env.SKYLINE_DEMO_PERSONAL === '1', () =>
        JSON.parse(readFileSync(resolve('.local/contributions.json'), 'utf8')));
      return `export default ${JSON.stringify(data)};`;
    },
  }],
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
  server: {
    port: 4180,
    strictPort: true,
  },
});
