export interface MomentItem {
  id: string;
  title: string;
  link: string;
  description: string;
  author: string;
  authorUrl: string;
  avatar: string;
  publishedAt: string;
  source: string;
  sourceUrl: string;
}

export interface MomentsResult {
  items: MomentItem[];
  generatedAt: string;
}

interface RawMoment {
  id?: unknown;
  title?: unknown;
  link?: unknown;
  description?: unknown;
  content?: unknown;
  author?: unknown;
  authorUrl?: unknown;
  avatar?: unknown;
  publishedAt?: unknown;
  source?: unknown;
  sourceUrl?: unknown;
}

interface MomentCache {
  promise: Promise<MomentsResult>;
  createdAt: number;
}

const CACHE_KEY = '__xuhomeMomentsFeed';
const CACHE_TTL = 5 * 60 * 1000;
export const MOMENTS_WINDOW_DAYS = 15;

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function httpUrl(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function plainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMoment(raw: RawMoment, index: number, cutoff: number, now: number): MomentItem | null {
  const link = httpUrl(raw.link);
  const publishedAt = text(raw.publishedAt);
  const timestamp = Date.parse(publishedAt);
  // Filter again in the browser: an old CDN response must never expand the 15-day window.
  if (!link || !publishedAt || !Number.isFinite(timestamp) || timestamp < cutoff || timestamp > now + 5 * 60 * 1000) {
    return null;
  }

  const source = text(raw.author, text(raw.source, '独立博客朋友'));
  const sourceUrl = httpUrl(raw.authorUrl) || httpUrl(raw.sourceUrl) || new URL(link).origin;
  const rawDescription = text(raw.description) || plainText(text(raw.content));
  const description = rawDescription.length > 240 ? `${rawDescription.slice(0, 240)}…` : rawDescription;

  return {
    id: text(raw.id, `${link}:${publishedAt}:${index}`),
    title: text(raw.title, '无题'),
    link,
    description,
    author: source,
    authorUrl: sourceUrl,
    avatar: httpUrl(raw.avatar),
    publishedAt: new Date(timestamp).toISOString(),
    source,
    sourceUrl,
  };
}

export function loadMoments(
  url = 'https://friend.upxuu.com/moments.json',
  force = false,
): Promise<MomentsResult> {
  if (typeof window === 'undefined') return Promise.resolve({ items: [], generatedAt: '' });

  const store = window as unknown as Record<string, MomentCache | undefined>;
  const cached = store[CACHE_KEY];
  if (!force && cached && Date.now() - cached.createdAt < CACHE_TTL) return cached.promise;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const promise = fetch(url, {
    mode: 'cors',
    headers: { Accept: 'application/json' },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`朋友圈接口返回 ${response.status}`);
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) {
        throw new Error('朋友圈接口格式不正确');
      }

      const now = Date.now();
      const cutoff = now - MOMENTS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const seen = new Set<string>();
      const items = (data as { items: RawMoment[] }).items
        .filter((item): item is RawMoment => !!item && typeof item === 'object')
        .map((item, index) => normalizeMoment(item, index, cutoff, now))
        .filter((item): item is MomentItem => {
          if (!item) return false;
          const key = item.id || item.link;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

      const generatedAt = text((data as { generatedAt?: unknown }).generatedAt);
      return { items, generatedAt };
    })
    .finally(() => window.clearTimeout(timeout));

  store[CACHE_KEY] = { promise, createdAt: Date.now() };
  promise.catch(() => {
    if (store[CACHE_KEY]?.promise === promise) delete store[CACHE_KEY];
  });
  return promise;
}
