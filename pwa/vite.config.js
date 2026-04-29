import { defineConfig } from 'vite';
export default defineConfig({
  root: '.',
  base: process.env.GITHUB_ACTIONS ? '/habit-tracker/' : '/',
  build: { outDir: 'dist' },
  server: { port: 5173 }
});
