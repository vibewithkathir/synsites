import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        payment: resolve(__dirname, 'payment.html'),
        quote: resolve(__dirname, 'quote.html'),
      },
    },
  },
});
