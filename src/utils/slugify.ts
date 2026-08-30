
export function normalizeEntrySlug(entry: any): string {
  let s = (entry?.slug || entry?.id || '').trim();
  const dataSlug = entry?.data?.slug;
  if (typeof dataSlug === 'string' && dataSlug.trim() !== '') {
    s = dataSlug.trim();
  }
  
  if (s.includes('%')) {
    try {
      s = decodeURIComponent(s);
    } catch (e) {
      
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
