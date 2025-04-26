import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
      },
    },
  },
});
