import { getCollection } from 'astro:content';
import { normalizeEntrySlug, postPath, talkPath } from '../utils/slugify';
import { beijingWallDate } from '../utils/dateFormat';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET(context: any) {
  const rawPosts = await getCollection('posts');
  const rawTalks = await getCollection('talks');
  
  // Normalize domain of the site (remove trailing slash)
  const siteUrl = context.site ? context.site.toString() : 'https://upxuu.com';
  const domain = siteUrl.replace(/\/$/, '');

  const urls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string | null }> = [
    { loc: `${domain}`, priority: '1.0', changefreq: 'daily' },
    { loc: `${domain}/about`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${domain}/talks`, priority: '0.8', changefreq: 'daily' },
    { loc: `${domain}/friends`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${domain}/links`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${domain}/posts`, priority: '0.5', changefreq: 'weekly' },
    { loc: `${domain}/privacy`, priority: '0.2', changefreq: 'monthly' },
  ];

  rawPosts.forEach((post: any) => {
    const customSlug = normalizeEntrySlug(post);
    const lastmod = beijingWallDate(post.data.published || post.data.date) || null;
    urls.push({
      loc: `${domain}${postPath(customSlug)}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod
    });
  });

  rawTalks.forEach((talk: any) => {
    const customSlug = normalizeEntrySlug(talk);
    const lastmod = beijingWallDate(talk.data.date) || null;
    urls.push({
      loc: `${domain}${talkPath(customSlug)}`,
      priority: '0.6',
      changefreq: 'weekly',
      lastmod
    });
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : ''}
    <changefreq>${escapeXml(url.changefreq)}</changefreq>
    <priority>${escapeXml(url.priority)}</priority>
  </url>
  `).join('').trim()}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
