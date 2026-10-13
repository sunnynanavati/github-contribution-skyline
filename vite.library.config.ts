import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        react: 'src/react/index.ts',
        element: 'src/element/index.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    emptyOutDir: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return;
        warn(warning);
      },
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Rollup strips source-level directives; retain the React client boundary.
        banner: (chunk) => chunk.name === 'react' ? "'use client';" : '',
      },
    },
  },
});
