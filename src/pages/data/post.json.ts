import { getProcessedPosts, getProcessedTalks } from '../../utils/postsFetcher';
import { siteConfig } from '../../config/site';


function toPlainText(raw: string): string {
  return (raw || '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[#>*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}


function excerpt(raw: string, max = 100): string {
  const plain = toPlainText(raw);
  return plain.length <= max ? plain : plain.slice(0, max);
}


function toISO(date: string): string {
  if (!date || date === '未知时间') return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

export async function GET() {
  const posts = await getProcessedPosts();
  const talks = await getProcessedTalks();

  const postItems = posts.map((p) => ({
    type: 'post',
    title: p.title,
    url: `${siteConfig.url}/posts/${encodeURIComponent(p.slug)}`,
    date: p.date,               // 发布时间（YYYY-MM-DD HH:MM:SS）
    dateISO: toISO(p.date),      // ISO 时间
    description: p.description,
    excerpt: excerpt(p.content, 100),
  }));

  const talkItems = talks.map((t) => ({
    type: 'talk',
    title: t.title,
    url: `${siteConfig.url}/talk/${encodeURIComponent(t.slug)}`,
    date: t.date,                // 发布时间
    dateISO: toISO(t.date),      // ISO 时间
    description: excerpt(t.content, 150),
    excerpt: excerpt(t.content, 100),
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    site: siteConfig.url,
    total: postItems.length + talkItems.length,
    items: [...postItems, ...talkItems],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
