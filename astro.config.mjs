import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { remarkAdmonitions } from './src/plugins/remark-admonitions.mjs';
import { remarkGithubCard } from './src/plugins/remark-github-card.mjs';
import { rehypeShiftHeadings } from './src/plugins/rehype-shift-headings.mjs';
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.mjs';


export default defineConfig({
  output: 'static',
  outDir: 'dist',
  build: {
    inlineStylesheets: 'never',
    compressHTML: true,
  },
  integrations: [react(), svelte(), mdx()],
  site: 'https://upxuu.com',
  redirects: {
    '/talk': {
      destination: '/talks',
      status: 301
    }
  },
  markdown: {
    remarkPlugins: [remarkGfm, remarkMath, remarkAdmonitions, remarkGithubCard],
    rehypePlugins: [rehypeKatex, rehypeShiftHeadings, rehypeExternalLinks],
  },
  vite: {
    plugins: [tailwindcss({
      lightningcss: {
        targets: {
          chrome: 49,
          android: 49,
          ios_saf: 10,
          safari: 10,
          firefox: 68,
          edge: 79,
        },
      },
    })],
    ssr: {
      noExternal: ['@fancyapps/ui', '@google/generative-ai']
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
