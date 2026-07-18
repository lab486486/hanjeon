// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://hanjeon.net',
  output: 'static',
  build: {
    format: 'directory',
  },
});
