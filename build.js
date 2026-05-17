import { build } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  console.log('[DuLish Build] Starting multi-target build...');

  // 1. Build popup
  console.log('\n[DuLish Build] 1/3 Building Popup...');
  await build({
    configFile: false,
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'popup.js',
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
    },
  });

  // 2. Build contentScript
  console.log('\n[DuLish Build] 2/3 Building Content Script...');
  await build({
    configFile: false,
    build: {
      lib: {
        entry: resolve(__dirname, 'src/extension/contentScript.ts'),
        name: 'content',
        formats: ['iife'],
        fileName: () => 'extension/contentScript.js',
      },
      outDir: 'dist',
      emptyOutDir: false,
      minify: false, // Maintain readability for debugging
    },
  });

  // 3. Build background worker
  console.log('\n[DuLish Build] 3/3 Building Background Worker...');
  await build({
    configFile: false,
    build: {
      lib: {
        entry: resolve(__dirname, 'src/extension/background.ts'),
        name: 'background',
        formats: ['iife'],
        fileName: () => 'extension/background.js',
      },
      outDir: 'dist',
      emptyOutDir: false,
      minify: false, // Maintain readability for debugging
    },
  });

  console.log('\n[DuLish Build] Build completed successfully! Standalone bundles generated in dist/');
})();
