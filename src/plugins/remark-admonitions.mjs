/**
 * GitHub-style alerts: > [!NOTE] / > [!WARNING] ...
 * Container style: :::note ... :::
 */
import { visit } from './visit.mjs';

const TYPE_MAP = {
  note: 'note',
  info: 'info',
  tip: 'tip',
  hint: 'tip',
  important: 'important',
  warning: 'warning',
  warn: 'warning',
  caution: 'caution',
  danger: 'danger',
  error: 'danger',
  success: 'success',
  check: 'success',
  // Chinese aliases
  提示: 'tip',
  注意: 'warning',
  警告: 'warning',
  危险: 'danger',
  信息: 'info',
  成功: 'success',
};

const TITLE_MAP = {
  note: 'Note',
  info: 'Info',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
  danger: 'Danger',
  success: 'Success',
};

const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER|INFO|SUCCESS|HINT|WARN|ERROR|CHECK|提示|注意|警告|危险|信息|成功)\]\s*(.*)$/i;

function normalizeType(raw) {
  const key = String(raw || '').toLowerCase();
  return TYPE_MAP[key] || TYPE_MAP[raw] || 'note';
}

function makeAdmonition(type, title, children) {
  return {
    type: 'admonition',
    data: {
      hName: 'div',
      hProperties: {
        className: ['admonition', `admonition-${type}`],
      },
    },
    children: [
      {
        type: 'paragraph',
        data: {
          hName: 'p',
          hProperties: { className: ['admonition-title'] },
        },
        children: [{ type: 'text', value: title || TITLE_MAP[type] || type }],
      },
      ...children,
    ],
  };
}

function extractAlertMeta(node) {
  if (!node?.children?.length) return null;
  const first = node.children[0];
  if (first.type !== 'paragraph' || !first.children?.length) return null;
  const t = first.children[0];
  if (t.type !== 'text') return null;
  const m = t.value.match(ALERT_RE);
  if (!m) return null;
  const type = normalizeType(m[1]);
  const rest = m[2] || '';
  const title = rest.trim() || TITLE_MAP[type] || type;
  // strip marker from first paragraph
  if (rest.trim()) {
    t.value = rest;
  } else if (first.children.length === 1) {
    node.children.shift();
  } else {
    first.children.shift();
  }
  return { type, title };
}

export function remarkAdmonitions() {
  return (tree) => {
    // 1) GitHub-style blockquote alerts
    visit(tree, 'blockquote', (node, index, parent) => {
      if (!parent || index == null) return;
      const meta = extractAlertMeta(node);
      if (!meta) return;
      parent.children[index] = makeAdmonition(meta.type, meta.title, node.children);
    });

    // 2) :::type ... ::: containers as raw paragraphs sequence
    // Handles paragraphs starting with :::type and ending with :::
    const children = tree.children || [];
    const out = [];
    let i = 0;
    while (i < children.length) {
      const node = children[i];
      if (
        node.type === 'paragraph' &&
        node.children?.length === 1 &&
        node.children[0].type === 'text'
      ) {
        const open = node.children[0].value.match(/^:::(\w+)\s*(.*)$/);
        if (open) {
          const type = normalizeType(open[1]);
          const title = open[2]?.trim() || TITLE_MAP[type] || type;
          const body = [];
          let j = i + 1;
          let closed = false;
          while (j < children.length) {
            const n = children[j];
            if (
              n.type === 'paragraph' &&
              n.children?.length === 1 &&
              n.children[0].type === 'text' &&
              n.children[0].value.trim() === ':::'
            ) {
              closed = true;
              break;
            }
            body.push(n);
            j++;
          }
          if (closed) {
            out.push(makeAdmonition(type, title, body));
            i = j + 1;
            continue;
          }
        }
      }
      out.push(node);
      i++;
    }
    tree.children = out;
  };
}
