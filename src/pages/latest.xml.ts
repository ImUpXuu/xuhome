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

function stripMarkdown(md: string): string {
  return md
    .replace(/[#*`_\[\]()\->|~]/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(context: APIContext) {
  const [posts, talks] = await Promise.all([
    getCollection('posts'),
    getCollection('talks'),
  ]);

  const siteUrl = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, '');
  const author = siteConfig.author;

  const items = [
    ...posts.map((post) => {
      const body = typeof post.body === 'string' ? post.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const slug = (post.data.slug || post.slug || post.id || '').trim();
      const desc = post.data.description || stripMarkdown(body).substring(0, 50);
      const permalink = `${siteUrl}/posts/${slug}/`;
      return {
        title: post.data.title,
        pubDate: post.data.published || post.data.date,
        description: desc,
        link: permalink,
        guid: permalink,
        content: sanitizeHtml(parser.render(cleaned), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
        customData: `<dc:creator><![CDATA[${author}]]></dc:creator>`,
      };
    }),
    ...talks.map((talk) => {
      const body = typeof talk.body === 'string' ? talk.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const slug = (talk.data.slug || talk.slug || talk.id || '').trim();
      const permalink = `${siteUrl}/talk/${slug}/`;
      return {
        title: `「说说」${talk.data.title}`,
        pubDate: talk.data.date,
        description: body.substring(0, 200).replace(/[#*`_\[\]()\-]/g, '').trim() || '',
        link: permalink,
        guid: permalink,
        content: sanitizeHtml(parser.render(cleaned), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
        customData: `<dc:creator><![CDATA[${author}]]></dc:creator>`,
      };
    }),
  ]
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    })
    .slice(0, 10);

  return rss({
    title: `${siteConfig.title} - 最新`,
    description: `${siteConfig.title} 最新文章与说说 RSS`,
    site: siteUrl,
    items,
    trailingSlash: false,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      content: 'http://purl.org/rss/1.0/modules/content/',
      dc: 'http://purl.org/dc/elements/1.1/',
    },
    customData: [
      '<language>zh-CN</language>',
      `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      `<atom:link href="${siteUrl}/latest.xml" rel="self" type="application/rss+xml"/>`,
    ].join(''),
  });
}