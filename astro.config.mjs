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

// https://astro.build/config
export default defineConfig({
  output: 'static',
  outDir: 'dist',
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
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@fancyapps/ui', '@google/generative-ai']
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
