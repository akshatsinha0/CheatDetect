import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,svelte}"], languageOptions: { globals: globals.browser } },
  { files: ["**/*.{js,mjs,cjs,svelte}"], plugins: { js, svelte: require("eslint-plugin-svelte") } },
  { files: ["**/*.svelte"], extends: ["plugin:svelte/recommended"] },
  { files: ["**/*.{js,mjs,cjs}"], extends: ["js/recommended"] },
]);
