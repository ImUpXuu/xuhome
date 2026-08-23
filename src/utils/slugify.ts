/** slug 规范化：与 pages/utils/postsFetcher 的规则保持一致（frontmatter slug 优先 + 预编码恢复） */
export function normalizeEntrySlug(entry: any): string {
  let s = (entry?.slug || entry?.id || '').trim();
  const dataSlug = entry?.data?.slug;
  if (typeof dataSlug === 'string' && dataSlug.trim() !== '') {
    s = dataSlug.trim();
  }
  // Normalize pre-encoded slugs from frontmatter (e.g. from imported Wordpress data)
  if (s.includes('%')) {
    try {
      s = decodeURIComponent(s);
    } catch (e) {
      // 保留原样
    }
  }
  return s;
}

export function postPath(slugNormalized: string): string {
  return `/posts/${encodeURIComponent(slugNormalized)}/`;
}

export function talkPath(slugNormalized: string): string {
  return `/talk/${encodeURIComponent(slugNormalized)}/`;
}
