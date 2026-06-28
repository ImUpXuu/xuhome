export interface PostEntry {
  id: string;
  slug: string;
  title: string;
  date: string;
  content: string;
  description?: string;
  img?: string;
  tags?: string[];
  category?: string;
}

export function getAllPosts(): PostEntry[] {
  // @ts-ignore
  let posts: PostEntry[] = typeof window !== 'undefined' && window.__INITIAL_DATA__?.posts 
  // @ts-ignore
    ? window.__INITIAL_DATA__.posts 
    : [];

  if (posts.length === 0) {
    // Return dummy data if no posts found or during SSR
    posts = Array.from({ length: 5 }).map((_, i) => ({
      id: `dummy-post-${i}`,
      slug: `dummy-post-${i}`,
      title: `测试文章 ${5 - i}`,
      date: `2026-06-${String(10 - i).padStart(2, '0')}T00:00:00.000Z`,
      content: `这是一条测试文章内容 ${i}。\n\n## 副标题\n测试正文内容，描述如何使用该系统。\n`,
      description: `这是测试文章 ${5 - i} 的描述信息，简要说明文章内容。`,
      img: i % 2 === 0 ? `https://picsum.photos/seed/post${i}/800/400` : '',
      tags: ['Astro', 'React'],
      category: '前端开发'
    }));
  }
  
  posts.sort((a, b) => {
    const da = a.date && a.date !== '未知时间' ? new Date(a.date).getTime() : 0;
    const db = b.date && b.date !== '未知时间' ? new Date(b.date).getTime() : 0;
    return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
  });
  return posts;
}

export function getPostBySlug(slug: string): PostEntry | undefined {
  return getAllPosts().find(t => t.slug === slug);
}

