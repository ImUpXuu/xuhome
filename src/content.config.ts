import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// frontmatter 校验：字段名写错（未知字段）或类型不对，构建时会明确报错并指出
// 是哪篇文章的哪个字段，不再像 z.any() 时代那样静默通过。
// 已知字段全部设为可缺省可空（nullish）：存量文章字段本就不齐（例如
// seed-file.md 没有 frontmatter、个别说说没有标题，还有 `slug:` 这种写了
// 字段名却留空的值——YAML 会解析成 null），站点代码对缺失/空字段已有兜底
// （无标题显示「无标题文章」、无日期显示「未知时间」），设为必填会误伤已上线文章。
// 类型按存量文章的实际写法放宽：tags/keywords/categories 有数组和逗号字符串两种
// 写法，draft 有布尔和字符串两种写法，日期统一用 coerce 接受 Date 与字符串。
const postsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().nullish(),
    published: z.coerce.date().nullish(),
    date: z.coerce.date().nullish(),
    updated: z.coerce.date().nullish(),
    description: z.string().nullish(),
    summary: z.string().nullish(),
    keywords: z.union([z.array(z.string()), z.string()]).nullish(),
    keyword: z.string().nullish(),
    tags: z.union([z.array(z.string()), z.string()]).nullish(),
    category: z.string().nullish(),
    categories: z.union([z.array(z.string()), z.string()]).nullish(),
    slug: z.string().nullish(),
    image: z.string().nullish(),
    img: z.string().nullish(),
    cover: z.string().nullish(),
    draft: z.union([z.boolean(), z.string()]).nullish(),
    lang: z.string().nullish(),
    isMourning: z.boolean().nullish(),
    sticky: z.number().nullish(),
  }).strict(),
});

const talksCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/talks" }),
  schema: z.object({
    title: z.string().nullish(),
    date: z.coerce.date().nullish(),
    tags: z.union([z.array(z.string()), z.string()]).nullish(),
    location: z.string().nullish(),
    weather: z.string().nullish(),
    mood: z.string().nullish(),
    device: z.string().nullish(),
  }).strict()
});

export const collections = {
  posts: postsCollection,
  talks: talksCollection
};
