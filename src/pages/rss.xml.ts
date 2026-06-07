import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const parser = new MarkdownIt();

function toDate(raw: any): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function stripInvalidXmlChars(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g, '');
}

export async function GET(context: any) {
  const rawPosts = await getCollection('posts');
  const rawTalks = await getCollection('talks');

  const siteUrl = (context.site ? context.site.toString().replace(/\/$/, '') : siteConfig.url);

  const items = [
    ...rawPosts.map((post: any) => {
      const data = post.data;
      const slug = (data.slug || post.slug || post.id).trim();
      const body = typeof post.body === 'string' ? post.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const html = parser.render(cleaned);
      return {
        title: data.title || '无标题文章',
        pubDate: toDate(data.date || data.published),
        description: data.description || data.summary || '',
        link: `/posts/${slug}`,
        content: sanitizeHtml(html, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']) }),
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
