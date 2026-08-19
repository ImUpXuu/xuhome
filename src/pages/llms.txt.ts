import type { APIContext } from 'astro';
import { siteConfig } from '../config/site';
import { getProcessedPosts, getProcessedTalks } from '../utils/postsFetcher';

/**
 * llms.txt —— LLM 友好的站点内容索引（https://llmstxt.org/ 标准）
 * 静态构建时自动从内容集合生成，随每次部署自动更新。
 * 访问路径：/llms.txt
 */

function stripMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*`_~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(text: string, max: number): string {
  const s = stripMarkdown(text);
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export async function GET(context: APIContext) {
  const [posts, talks] = await Promise.all([
    getProcessedPosts(),
    getProcessedTalks(),
  ]);

  const siteUrl = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, '');

  const lines: string[] = [];

  // H1：站点名
  lines.push(`# ${siteConfig.title}`);

  // 一句话简介（blockquote）
  lines.push('');
  lines.push(`> ${siteConfig.description || siteConfig.subtitle || ''}`);

  // 站点说明
  lines.push('');
  lines.push(
    `${siteConfig.title} 是 ${siteConfig.author} 的个人博客，记录技术折腾、生活随记与学习经历。` +
      '文章与说说均以 Markdown 撰写，本文件为 LLM 提供结构化内容索引；' +
      '阅读完整内容请访问对应链接。'
  );

  // 主要页面
  lines.push('');
  lines.push('## 主要页面');
  lines.push('');
  const pages = [
    ['首页', '/', '最新文章与说说'],
    ['文章归档', '/posts', '全部文章列表'],
    ['说说', '/talks', '日常动态'],
    ['关于', '/about', '关于作者'],
    ['友链', '/friends', '友情链接'],
    ['标签', '/tags', '文章标签索引'],
    ['RSS 订阅', '/rss.xml', '全文 RSS 订阅源'],
    ['站点地图', '/sitemap.xml', 'XML 站点地图'],
  ] as const;
  for (const [title, path, desc] of pages) {
    lines.push(`- [${title}](${siteUrl}${path}): ${desc}`);
  }

  // 文章列表（按时间倒序）
  const sortedPosts = [...posts].sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));
  lines.push('');
  lines.push(`## 文章（共 ${sortedPosts.length} 篇）`);
  lines.push('');
  for (const post of sortedPosts) {
    const slug = encodeURIComponent(post.slug);
    const desc = post.description
      ? snippet(post.description, 80)
      : snippet(post.content, 80);
    const date = post.date.slice(0, 10);
    lines.push(`- [${post.title}](${siteUrl}/posts/${slug}): ${date} · ${desc}`);
  }

  // 说说（最近 100 条）
  const recentTalks = talks.slice(0, 100);
  lines.push('');
  lines.push(`## 说说（最近 ${recentTalks.length} 条）`);
  lines.push('');
  for (const talk of recentTalks) {
    const slug = encodeURIComponent(talk.slug);
    const title = talk.title && talk.title !== '日常动态' ? talk.title : '说说';
    const date = (talk.date || '').slice(0, 10);
    lines.push(`- [${title}](${siteUrl}/talk/${slug}): ${date} · ${snippet(talk.content, 80)}`);
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
