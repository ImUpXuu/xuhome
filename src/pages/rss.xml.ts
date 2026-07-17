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

function formatBeijingPubDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return undefined;
  // Frontmatter dates are Beijing Time (UTC+8) but parsed by js-yaml as UTC.
  // The UTC components of d happen to match the intended Beijing time values,
  // so just format them and label as +0800.
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} +0800`;
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
      const postPubDate = formatBeijingPubDate(post.data.published || post.data.date);
      return {
        title: post.data.title,
        description: desc,
        link: permalink,
        guid: permalink,
        content: sanitizeHtml(parser.render(cleaned), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
        customData: [
          `<dc:creator><![CDATA[${author}]]></dc:creator>`,
          postPubDate ? `<pubDate>${postPubDate}</pubDate>` : '',
        ].filter(Boolean).join(''),
        sortDate: postPubDate ? new Date(postPubDate).getTime() : 0,
      };
    }),
    ...talks.map((talk) => {
      const body = typeof talk.body === 'string' ? talk.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const slug = (talk.data.slug || talk.slug || talk.id || '').trim();
      const permalink = `${siteUrl}/talk/${slug}/`;
      const talkPubDate = formatBeijingPubDate(talk.data.date);
      return {
        title: `「说说」${talk.data.title}`,
        description: body.substring(0, 200).replace(/[#*`_\[\]()\-]/g, '').trim() || '',
        link: permalink,
        guid: permalink,
        content: sanitizeHtml(parser.render(cleaned), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
        customData: [
          `<dc:creator><![CDATA[${author}]]></dc:creator>`,
          talkPubDate ? `<pubDate>${talkPubDate}</pubDate>` : '',
        ].filter(Boolean).join(''),
        sortDate: talkPubDate ? new Date(talkPubDate).getTime() : 0,
      };
    }),
  ].sort((a, b) => b.sortDate - a.sortDate)
  .map(({ sortDate, ...item }) => item);

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || '',
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
      `<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ].join(''),
  });
}
