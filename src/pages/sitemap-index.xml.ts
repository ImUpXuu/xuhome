export async function GET(context: any) {
  const siteUrl = context.site ? context.site.toString() : 'https://upxuu.com';
  const domain = siteUrl.replace(/\/$/, '');

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${domain}/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

  return new Response(sitemapIndex, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
