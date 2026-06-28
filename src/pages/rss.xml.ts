import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import type { APIContext } from 'astro';

const parser = new MarkdownIt();

function stripInvalidXmlChars(str: string): string {
  return str.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
    '',
  );
}

export async function GET(context: APIContext) {
  const [posts, talks] = await Promise.all([
    getCollection('posts'),
    getCollection('talks'),
  ]);

  const siteUrl = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, '');

  const items = [
    ...posts.map((post) => {
      const body = typeof post.body === 'string' ? post.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const slug = (post.data.slug || post.slug || post.id || '').trim();
      return {
        title: post.data.title,
        pubDate: post.data.published || post.data.date,
        description: post.data.description || '',
        link: `${siteUrl}/posts/${slug}/`,
        content: sanitizeHtml(parser.render(cleaned), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
      };
    }),
    ...talks.map((talk) => {
      const body = typeof talk.body === 'string' ? talk.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const slug = (talk.data.slug || talk.slug || talk.id || '').trim();
      return {
        title: talk.data.title,
        pubDate: talk.data.date,
        description: body.substring(0, 200).replace(/[#*`_\[\]()\-]/g, '').trim() || '',
        link: `${siteUrl}/talk/${slug}/`,
        content: sanitizeHtml(parser.render(cleaned), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
      };
    }),
  ].sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || '',
    site: siteUrl,
    items,
    trailingSlash: false,
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
