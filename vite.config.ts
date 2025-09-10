import { defineConfig } from 'vite';

export default defineConfig({
  server: {
  port: 5199,
  host: true,
  strictPort: false,
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
