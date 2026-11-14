// 客户端共享的文章索引加载器。
//
// 首页曾经把同一份 135 篇文章列表分别塞进三个 island 的 props（搜索列表 + 两个日历），
// 而 props 是 HTML 属性，JSON 里的每个 " 都会被转义成 &quot;，体积直接翻倍。
// 现在统一 fetch 构建期生成的 /posts-data.json，并用 window 上的 promise 去重：
// 两个 island 各自打包也能共享同一次请求。

export interface ClientPost {
  id: string;
  slug: string;
  title: string;
  date: string;
  description: string;
  img: string;
  tags: string[];
  category: string;
}

const PROMISE_KEY = '__xuhomePostsIndex';

export function loadPosts(url = '/posts-data.json'): Promise<ClientPost[]> {
  if (typeof window === 'undefined') return Promise.resolve([]);

  const store = window as unknown as Record<string, Promise<ClientPost[]> | undefined>;
  if (!store[PROMISE_KEY]) {
    store[PROMISE_KEY] = fetch(url, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`posts index ${res.status}`))))
      .then((data: unknown) => (Array.isArray(data) ? (data as ClientPost[]) : []));
  }

  return store[PROMISE_KEY] as Promise<ClientPost[]>;
}
