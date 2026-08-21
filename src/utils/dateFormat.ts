/**
 * 日期统一规则（必须遵守）：
 * frontmatter 里写的 "2026-08-13 16:02:48" 会被 js-yaml 解析成 UTC 实例，
 * 其 UTC 字段即为作者写的北京墙钟时间。
 *
 * - beijingWallDate：返回所见即所得的日期字符串（YYYY-MM-DD），与站点展示一致
 * - toBeijingInstant：返回真实时刻的 Date（北京墙钟 → UTC instant），用于 RSS pubDate
 */

export function beijingWallDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function toBeijingInstant(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return null;
  // js-yaml 把北京墙钟误存为 UTC；减 8 小时还原真实时刻
  return new Date(d.getTime() - 8 * 60 * 60 * 1000);
}

/** RSS 用 pubDate 字符串（RFC 1123） */
export function beijingRfc2822(value: unknown): string {
  const d = toBeijingInstant(value);
  return d ? d.toUTCString() : new Date().toUTCString();
}
