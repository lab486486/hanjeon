// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function tagStats() {
  return {
    name: 'tag-stats',
    hooks: {
      'astro:build:start': () => {
        execFileSync(process.execPath, [path.join(rootDir, 'scripts/generate-tag-stats.mjs')], {
          stdio: 'inherit',
        });
      },
    },
  };
}

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
    tagStats(),
  ],
});
