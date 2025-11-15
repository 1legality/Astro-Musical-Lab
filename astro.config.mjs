// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'lab.malandry.com',
  trailingSlash: 'never',
  integrations: [mdx(), react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
