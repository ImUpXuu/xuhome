/**
 * 全站统一的字数统计口径。
 *
 * 页脚和建站统计页曾各算一套（页脚数字符、统计页数中文字+英文词），
 * 同一个站出现两个"总字数"。现在都走这里，改口径只改一处。
 *
 * 口径：正文去掉 frontmatter、图片语法与全部空白后的字符数。
 * 这是中文语境下"多少字"的常规理解，也是页脚一直在显示的那个数。
 */

/**
 * 去掉 frontmatter（getCollection 的 body 已不含，直接读文件时需要）。
 *
 * 先剥 BOM：src/content/posts/seed-file.md 带 UTF-8 BOM，`^---` 会因为
 * 前面多一个 U+FEFF 而匹配不上，整段 frontmatter 被算进字数（多 213 字），
 * 于是页脚（走 Astro getCollection，BOM 已处理）和统计页又对不上。
 */
export function stripFrontmatter(raw) {
  const s = String(raw || '').replace(/^\uFEFF/, '');
  return s.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '');
}

/** 统计正文字数（不去 frontmatter，供已拿到 body 的调用方使用） */
export function countBodyChars(body) {
  return String(body || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/\s+/g, '')
    .length;
}

/** 从完整 Markdown 文件内容统计字数（自动去 frontmatter） */
export function countMarkdownChars(raw) {
  return countBodyChars(stripFrontmatter(raw));
}
