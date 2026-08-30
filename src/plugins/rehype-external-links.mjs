
export function rehypeExternalLinks() {
  return (tree) => {
    const visit = (node, fn) => {
      if (!node || typeof node !== 'object') return;
      fn(node);
      if (Array.isArray(node.children)) node.children.forEach((c) => visit(c, fn));
    };

    visit(tree, (node) => {
      if (node.tagName !== 'a') return;
      const props = node.properties || {};
      const href = props.href || '';
      
      if (!/^https?:\/\//i.test(href)) return;
      
      try {
        const host = new URL(href).hostname;
        if (host === 'upxuu.com' || host.endsWith('.upxuu.com')) return;
      } catch {
        return;
      }
      props.target = '_blank';
      const rel = (props.rel || '').split(/\s+/).filter(Boolean);
      if (!rel.includes('noopener')) rel.push('noopener');
      if (!rel.includes('noreferrer')) rel.push('noreferrer');
      props.rel = rel.join(' ');
      node.properties = props;
    });
  };
}