import { marked } from 'marked';
import { siteConfig } from '../config/site';
import { getCollection } from 'astro:content';

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

function escapeCdata(html: string): string {
  return html.replace(/\]\]>/g, ']]>]]&gt;<![CDATA[');
}

function formatRFC822(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return new Date().toUTCString();
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[d.getUTCDay()];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const monthName = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  
  return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds} GMT`;
}

export async function GET(context: any) {
  const rawPosts = await getCollection('posts');
  const rawTalks = await getCollection('talks');
  
  // Normalize domain (remove trailing slash if any to prevent double slashes)
  const siteUrl = context.site ? context.site.toString() : 'https://upxuu.com';
  const domain = siteUrl.replace(/\/$/, '');

  const processedPosts = rawPosts.map((post: any) => {
    const data = post.data;
    let parsedDate = '1970-01-01T00:00:00.000Z';
    const rawDate = data.date || data.published;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d.toISOString();
      }
    }

    let customSlug = post.slug || post.id;
    if (data.slug && typeof data.slug === 'string' && data.slug.trim() !== '') {
      customSlug = data.slug.trim();
    }

    const postBody = post.body || '';

    return {
      title: data.title || '无标题文章',
      link: `${domain}/posts/${customSlug}`,
      guid: `${domain}/posts/${customSlug}`,
      description: data.description || data.summary || postBody.substring(0, 150).replace(/[#*`_\[\]()\-]/g, '').trim(),
      pubDate: formatRFC822(parsedDate),
      markdownContent: postBody,
    };
  });

  const processedTalks = rawTalks.map((talk: any) => {
    const data = talk.data;
    let parsedDate = '1970-01-01T00:00:00.000Z';
    if (data.date) {
      const d = new Date(data.date);
      if (!isNaN(d.getTime())) {
        parsedDate = d.toISOString();
      }
    }

    let customSlug = talk.slug || talk.id;
    if (data.slug && typeof data.slug === 'string' && data.slug.trim() !== '') {
      customSlug = data.slug.trim();
    }

    const talkBody = talk.body || '';

    return {
      title: data.title || '日常动态',
      link: `${domain}/talk/${customSlug}`,
      guid: `${domain}/talk/${customSlug}`,
      description: talkBody.substring(0, 150).replace(/[#*`_\[\]()\-]/g, '').trim(),
      pubDate: formatRFC822(parsedDate),
      markdownContent: talkBody,
    };
  });

  const feedItems = [
    ...processedPosts,
    ...processedTalks
  ].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const itemsWithHtml = await Promise.all(
    feedItems.map(async item => {
      let html = '';
      try {
        html = await marked.parse(item.markdownContent);
      } catch (err) {
        html = item.markdownContent;
      }
      return {
        ...item,
        htmlContent: html.trim()
      };
    })
  );

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <description>${escapeXml(siteConfig.subtitle || '')}</description>
    <link>${escapeXml(domain)}/</link>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(domain)}/rss.xml" rel="self" type="application/rss+xml"/>
    ${itemsWithHtml.map(item => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <content:encoded><![CDATA[${escapeCdata(item.htmlContent)}]]></content:encoded>
    </item>`).join('').trim()}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
