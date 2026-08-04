import { getProcessedPosts, getProcessedTalks } from '../../utils/postsFetcher';
import { siteConfig } from '../../config/site';

/** 将 Markdown 正文转为纯文本，去掉图片、链接、标题符号等，便于 AI 读取 */
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

/** 截取前 N 个字符 */
function excerpt(raw: string, max = 100): string {
  const plain = toPlainText(raw);
  return plain.length <= max ? plain : plain.slice(0, max);
}

export async function GET() {
  const posts = await getProcessedPosts();
  const talks = await getProcessedTalks();

  const postItems = posts.map((p) => ({
    type: 'post',
    title: p.title,
    url: `${siteConfig.url}/posts/${encodeURIComponent(p.slug)}`,
    description: p.description,
    excerpt: excerpt(p.content, 100),
  }));

  const talkItems = talks.map((t) => ({
    type: 'talk',
    title: t.title,
    url: `${siteConfig.url}/talk/${encodeURIComponent(t.slug)}`,
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
