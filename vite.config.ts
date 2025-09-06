import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    open: false
  },
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
