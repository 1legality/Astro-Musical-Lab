// src/content/config.ts
import { z, defineCollection } from 'astro:content';

// Define a "collection" for your rhythms
const rhythmCollection = defineCollection({
  type: 'content', // 'content' means .md or .mdx files
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // We'll use this to sort the list
    order: z.number(), 
  }),
});

const pdfCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

// Export a 'collections' object
export const collections = {
  'rhythms': rhythmCollection,
  'PDF': pdfCollection,
};