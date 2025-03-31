import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  compilerOptions: {
    customElement: true, // Enable Web Components
  },
  preprocess: vitePreprocess(),
};
