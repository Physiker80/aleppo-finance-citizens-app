import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
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
