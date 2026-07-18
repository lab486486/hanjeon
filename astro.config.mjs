// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://hanjeon.net',
  output: 'static',
  build: {
    format: 'directory',
    // Avoid /_astro/* — that path was edge-cached as HTML on the custom domain
    assets: 'assets',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});
