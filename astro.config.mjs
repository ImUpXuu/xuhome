import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  outDir: 'dist',
  integrations: [react(), svelte(), mdx()],
  site: 'https://upxuu.com',
  redirects: {
    '/talk': {
      destination: '/talks',
      status: 301
    }
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
