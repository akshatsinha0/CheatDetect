import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({
    compilerOptions: {
      customElement: true
    }
  })],
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'SvelteWebComponent',
      fileName: 'bundle',
      formats: ['iife']
    },
    outDir: 'public/build', // Ensure output goes to the correct folder
  },
  server: {
    mimeTypes: { 'application/javascript': ['js'] } // Fix MIME issue
  }
});
