import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4010',
        changeOrigin: true,
        secure: false,
      },
      '/otel': {
        target: 'http://localhost:4010',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    chunkSizeWarningLimit: 5000,
    // Disable manual chunks to avoid initialization order issues
    rollupOptions: {
      output: {
        // Let Vite handle chunking automatically
      }
    }
  }
});
