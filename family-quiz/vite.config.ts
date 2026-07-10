import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — собранное приложение можно открывать с любого статического
// хостинга или просто из папки, без сервера и интернета.
export default defineConfig({
  plugins: [react()],
  base: './',
});
