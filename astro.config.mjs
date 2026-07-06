import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

function rehypeImageCaption() {
  return (tree) => {
    function visit(node, parent) {
      if (node.type !== 'element' || !parent) return;
      if (node.tagName === 'p') {
        const imgs = node.children.filter(
          (c) => c.type === 'element' && c.tagName === 'img',
        );
        const visible = node.children.filter(
          (c) => c.type !== 'text' || (c.value && c.value.trim()),
        );
        if (imgs.length === 1 && visible.length === 1) {
          const alt = imgs[0].properties?.alt || '';
          if (!alt) return;
          const idx = parent.children.indexOf(node);
          if (idx === -1) return;
          parent.children.splice(idx, 1, {
            type: 'element',
            tagName: 'figure',
            properties: {},
            children: [
              imgs[0],
              {
                type: 'element',
                tagName: 'figcaption',
                properties: {},
                children: [{ type: 'text', value: alt }],
              },
            ],
          });
        }
      } else if (node.children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          visit(node.children[i], node);
        }
      }
    }
    for (const child of tree.children) {
      visit(child);
    }
  };
}

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  outDir: 'dist',
  integrations: [react(), svelte(), mdx()],
  markdown: {
    rehypePlugins: [rehypeImageCaption],
  },
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
