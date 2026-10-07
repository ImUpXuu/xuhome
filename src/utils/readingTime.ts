/**
 * 阅读时长估算。
 * 中文没有空格分词，按空白 split 会把整段算成 1 个词（中文文章恒显示 1 分钟）。
 * 规则：CJK 字符按 300 字/分钟，其余按 200 词/分钟，两者相加。
 */
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/g;

export function calculateReadingTime(content: string): number {
  if (!content) return 1;
  const cjkChars = (content.match(CJK_RE) || []).length;
  const latinWords = content
    .replace(CJK_RE, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = cjkChars / 300 + latinWords / 200;
  return Math.max(1, Math.ceil(minutes));
}
