import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const parser = new MarkdownIt();

const RSS_ITEM_LIMIT = 20;

const FALLBACK_DATE = new Date('2025-01-01T00:00:00Z');

function toDate(raw: any): Date {
  if (!raw) return FALLBACK_DATE;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? FALLBACK_DATE : d;
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
      const slug = (post.data.slug || post.slug || post.id).trim();
      const body = typeof post.body === 'string' ? post.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const html = parser.render(cleaned);
      return {
        title: `【专栏】${post.data.title || '无标题文章'}`,
        pubDate: toDate(post.data.date || post.data.published),
        description: post.data.description || post.data.summary || '',
        link: `/posts/${encodeURIComponent(slug)}/`,
        content: sanitizeHtml(html, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']) }),
      };
    }),
    ...rawTalks.map((talk: any) => {
      const slug = (talk.data.slug || talk.slug || talk.id).trim();
      const body = typeof talk.body === 'string' ? talk.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const html = parser.render(cleaned);
      return {
        title: `【动态】${talk.data.title || '日常动态'}`,
        pubDate: toDate(talk.data.date || talk.data.published),
        description: (body || '').substring(0, 200).replace(/[#*`_\[\]()\-]/g, '').trim(),
        link: `/talk/${encodeURIComponent(slug)}/`,
        content: sanitizeHtml(html, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']) }),
      };
    }),
  ]
    .filter(item => item.pubDate.getTime() !== FALLBACK_DATE.getTime())
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, RSS_ITEM_LIMIT);

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || '',
    site: siteUrl,
    items,
    trailingSlash: true,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
    customData: [
      '<language>zh-CN</language>',
      `<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ].join(''),
  });
}
