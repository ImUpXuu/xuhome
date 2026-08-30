import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';
import { beijingWallDate } from '../utils/dateFormat';



function slugOf(entry: any): string {
  return (entry.data.slug || entry.slug || entry.id || '').trim();
}

export async function GET(context: APIContext) {
  const [posts, talks] = await Promise.all([
    getCollection('posts'),
    getCollection('talks'),
  ]);

  const siteUrl = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, '');

  const lines: string[] = [];

  lines.push(`# ${siteConfig.title} · 全文`);
  lines.push('');
  lines.push(`> ${siteConfig.description || siteConfig.subtitle || ''}`);
  lines.push('');
  lines.push(
    `本文件为 ${siteConfig.title} 的全部内容全文（Markdown 格式），` +
      `共 ${posts.length} 篇文章、${talks.length} 条说说，按时间倒序排列。` +
      `索引版见 ${siteUrl}/llms.txt`
  );

  const beijingDate = (value: unknown): string => beijingWallDate(value);

  
  lines.push('');
  lines.push(`## 文章（${posts.length} 篇）`);
  lines.push('');

  const sortedPosts = [...posts].sort((a: any, b: any) => {
    const ta = new Date(a.data.published || a.data.date || 0).getTime();
    const tb = new Date(b.data.published || b.data.date || 0).getTime();
    return tb - ta;
  });

  for (const post of sortedPosts as any[]) {
    const title = post.data.title || '未命名文章';
    const slug = encodeURIComponent(slugOf(post));
    const date = beijingDate(post.data.published || post.data.date);
    const body = typeof post.body === 'string' ? post.body.trim() : '';

    lines.push('---');
    lines.push('');
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`> ${date ? date + ' · ' : ''}[原文链接](${siteUrl}/posts/${slug})`);
    lines.push('');
    lines.push(body || '（本文无正文内容）');
    lines.push('');
  }

  
  lines.push('');
  lines.push(`## 说说（${talks.length} 条）`);
  lines.push('');

  const sortedTalks = [...talks].sort((a: any, b: any) => {
    const ta = new Date(a.data.date || 0).getTime();
    const tb = new Date(b.data.date || 0).getTime();
    return tb - ta;
  });

  for (const talk of sortedTalks as any[]) {
    const title = (talk.data.title && talk.data.title !== '日常动态' ? talk.data.title : '说说') as string;
    const slug = encodeURIComponent(slugOf(talk));
    const date = beijingDate(talk.data.date);
    const body = typeof talk.body === 'string' ? talk.body.trim() : '';

    lines.push('---');
    lines.push('');
    lines.push(`## ${title}`);
    lines.push('');
    lines.push(`> ${date ? date + ' · ' : ''}[原文链接](${siteUrl}/talk/${slug})`);
    lines.push('');
    lines.push(body || '（本条说说无文字内容）');
    lines.push('');
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
