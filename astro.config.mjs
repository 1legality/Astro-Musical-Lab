// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://1legality.github.io',
  base: '/Astro-Musical-Lab',
  trailingSlash: 'never',
  integrations: [mdx(), react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
