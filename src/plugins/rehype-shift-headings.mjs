
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
