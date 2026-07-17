/** Minimal tree walk (no unist-util-visit dep) */
export function visit(tree, type, visitor) {
  function walk(node, index, parent) {
    if (!node || typeof node !== 'object') return;
    if (node.type === type) visitor(node, index, parent);
    const kids = node.children;
    if (!Array.isArray(kids)) return;
    for (let i = 0; i < kids.length; i++) walk(kids[i], i, node);
  }
  walk(tree, undefined, undefined);
}
