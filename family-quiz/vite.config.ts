import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Полностью автономная сборка: весь JS и CSS встраивается в один dist/index.html,
// который открывается двойным кликом (file://) без Node, сервера и интернета.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
});
