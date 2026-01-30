import { defineConfig } from 'vite';

export default defineConfig({
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
      }
      ,
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
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Group heavy libraries into dedicated chunks
          if (/pdfjs-dist[\\/]/.test(id) || /react-pdf[\\/]/.test(id)) return 'vendor-pdf';
          if (/jspdf[\\/]/.test(id) || /svg2pdf\.js/.test(id) || /html2canvas/.test(id)) return 'vendor-pdf-tools';
          if (/xlsx[\\/]/.test(id)) return 'vendor-xlsx';
          if (/katex[\\/]/.test(id)) return 'vendor-katex';
          if (/mermaid[\\/]/.test(id) || /cytoscape/.test(id) || /dagre/.test(id)) return 'vendor-diagrams';
          if (/tesseract\.js[\\/]/.test(id)) return 'vendor-ocr';
          if (/@zxing[\\/]browser[\\/]/.test(id) || /jsqr/.test(id)) return 'vendor-qr';
          if (/react[\\/]/.test(id)) return 'vendor-react';
          return 'vendor';
        }
      }
    }
  }
});
