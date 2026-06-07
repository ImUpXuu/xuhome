import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';

function toDate(raw: any): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function GET(context: any) {
  const rawPosts = await getCollection('posts');
  const rawTalks = await getCollection('talks');

  const siteUrl = (context.site ? context.site.toString().replace(/\/$/, '') : siteConfig.url);

  const items = [
    ...rawPosts.map((post: any) => {
      const data = post.data;
      const slug = (data.slug || post.slug || post.id).trim();
      return {
        title: data.title || '无标题文章',
        pubDate: toDate(data.date || data.published),
        description: data.description || data.summary || '',
        link: `/posts/${slug}`,
      };
    }),
    ...rawTalks.map((talk: any) => {
      const data = talk.data;
      const slug = (data.slug || talk.slug || talk.id).trim();
      return {
        title: data.title || '日常动态',
        pubDate: toDate(data.date),
        description: (talk.body || '').substring(0, 200).replace(/[#*`_\[\]()\-]/g, '').trim(),
        link: `/talk/${slug}`,
      };
    }),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || '',
    site: siteUrl,
    items,
    trailingSlash: false,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: [
      '<language>zh-CN</language>',
      `<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ].join(''),
  });
}
