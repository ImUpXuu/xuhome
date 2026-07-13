export interface TalkEntry {
  id: string;
  slug: string;
  title: string;
  date: string;
  content: string;
  tags?: string[];
  location?: string;
  weather?: string;
  mood?: string;
  device?: string;
}

export function getAllTalks(): TalkEntry[] {
  // @ts-ignore
  let talks: TalkEntry[] = typeof window !== 'undefined' && window.__INITIAL_DATA__?.talks 
  // @ts-ignore
    ? window.__INITIAL_DATA__.talks 
    : [];

  if (talks.length === 0) {
    // Return dummy data if no talks found
    const dummyTags = ['技术', '生活', '随笔'];
    talks = Array.from({ length: 15 }).map((_, i) => ({
      id: `dummy-${i}`,
      slug: `dummy-${i}`,
      title: `测试动态 ${15 - i}`,
      date: `2026-05-${String(30 - i).padStart(2, '0')}T14:${String(i * 3 + 10).padStart(2, '0')}:00.000Z`,
      content: `这是一条测试动态内容 ${i}。用于UI展示，无实际内容。\n\n![Image 1](https://picsum.photos/seed/${i}1/800/600)\n![Image 2](https://picsum.photos/seed/${i}2/800/600)`,
      tags: [dummyTags[i % 3]],
      location: i % 2 === 0 ? '成都市 · 春熙路' : '',
      weather: i % 3 === 0 ? '晴天 ☀️' : (i % 3 === 1 ? '多云 ☁️' : ''),
      mood: i % 4 === 0 ? '开心 😁' : '',
      device: i % 2 === 0 ? 'iPhone 15 Pro' : 'MacBook Pro'
    }));
  }
  
  talks.sort((a, b) => {
    const da = a.date && a.date !== '未知时间' ? new Date(a.date).getTime() : 0;
    const db = b.date && b.date !== '未知时间' ? new Date(b.date).getTime() : 0;
    return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
  });
  return talks;
}

export function getTalkBySlug(slug: string): TalkEntry | undefined {
  return getAllTalks().find(t => t.slug === slug);
}

