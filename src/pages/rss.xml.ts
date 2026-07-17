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

function beijingRfc2822(value: unknown): string {
  if (!value) return new Date().toUTCString();
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return new Date().toUTCString();
  // Frontmatter dates are Beijing Time (UTC+8) but parsed by js-yaml as UTC.
  // Subtract 8h to get correct UTC moment, then format as GMT.
  const utc = new Date(d.getTime() - 8 * 60 * 60 * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[utc.getUTCDay()]}, ${String(utc.getUTCDate()).padStart(2, '0')} ${months[utc.getUTCMonth()]} ${utc.getUTCFullYear()} ${String(utc.getUTCHours()).padStart(2, '0')}:${String(utc.getUTCMinutes()).padStart(2, '0')}:${String(utc.getUTCSeconds()).padStart(2, '0')} GMT`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderItem(title: string, url: string, desc: string, pubDate: string, content: string, author: string): string {
  return [
    '  <item>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(url)}</link>`,
    `    <guid>${escapeXml(url)}</guid>`,
    `    <description>${escapeXml(desc)}</description>`,
    `    <pubDate>${pubDate}</pubDate>`,
    `    <dc:creator><![CDATA[${author}]]></dc:creator>`,
    `    <content:encoded><![CDATA[${content}]]></content:encoded>`,
    '  </item>',
  ].join('\n');
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
      const url = `${siteUrl}/posts/${slug}/`;
      const pubDate = beijingRfc2822(post.data.published || post.data.date);
      const content = sanitizeHtml(parser.render(cleaned), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      });
      return {
        pubDate,
        sortTime: new Date(pubDate).getTime(),
        html: renderItem(post.data.title, url, desc, pubDate, content, author),
      };
    }),
    ...talks.map((talk) => {
      const body = typeof talk.body === 'string' ? talk.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const slug = (talk.data.slug || talk.slug || talk.id || '').trim();
      const url = `${siteUrl}/talk/${slug}/`;
      const pubDate = beijingRfc2822(talk.data.date);
      const desc = body.substring(0, 200).replace(/[#*`_\[\]()\-]/g, '').trim() || '';
      const content = sanitizeHtml(parser.render(cleaned), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      });
      return {
        pubDate,
        sortTime: new Date(pubDate).getTime(),
        html: renderItem(`「说说」${talk.data.title}`, url, desc, pubDate, content, author),
      };
    }),
  ]
    .sort((a, b) => b.sortTime - a.sortTime)
    .map((item) => item.html)
    .join('\n');

  const now = new Date();
  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"',
    '  xmlns:atom="http://www.w3.org/2005/Atom"',
    '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/"',
    '>',
    '  <channel>',
    `    <title>${escapeXml(siteConfig.title)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(siteConfig.subtitle || '')}</description>`,
    `    <language>zh-CN</language>`,
    `    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return new Response(rss, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
