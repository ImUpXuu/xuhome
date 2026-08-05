/**
 * 将文章正文 Markdown 渲染出的标题统一降级一级（h1→h2, h2→h3, ...）。
 * 用于避免正文内的一级标题与页面文章标题的 <h1> 冲突，保证每个页面只有一个 <h1>。
 */
export function rehypeShiftHeadings() {
  return (tree) => {
    const visit = (node, fn) => {
      if (!node || typeof node !== 'object') return;
      fn(node);
      if (Array.isArray(node.children)) node.children.forEach((c) => visit(c, fn));
    };

    visit(tree, (node) => {
      if (node.tagName && /^h[1-6]$/.test(node.tagName)) {
        const level = parseInt(node.tagName.slice(1), 10);
        const shifted = Math.min(level + 1, 6);
        node.tagName = `h${shifted}`;
      }
    });
  };
}
