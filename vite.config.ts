import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/extension/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'extension/contentScript.js';
          if (chunk.name === 'popup') return 'popup.js';
          return '[name].js';
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
