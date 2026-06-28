import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.any(),
});

const talksCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/talks" }),
  schema: z.any()
});

export const collections = {
  posts: postsCollection,
  talks: talksCollection
};

