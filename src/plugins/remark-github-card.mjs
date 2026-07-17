/**
 * Transform ::github{repo="owner/repo"} into a GitHub card.
 * Also supports: ::github{repo="owner/repo" branch="main"}
 */
import { visit } from './visit.mjs';

const GH_RE =
  /^::github\{\s*repo\s*=\s*["']([^"']+)["'](?:\s+branch\s*=\s*["']([^"']+)["'])?\s*\}\s*$/i;

function parseRepo(raw) {
  const s = String(raw || '').trim().replace(/^https?:\/\/github\.com\//i, '');
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function makeCard(owner, repo, branch) {
  const full = `${owner}/${repo}`;
  const href = `https://github.com/${full}`;
  const img = `https://opengraph.githubassets.com/1/${full}`;

  return {
    type: 'html',
    value: [
      `<div class="gh-card not-prose" data-repo="${full}">`,
      `  <a class="gh-card-link" href="${href}" target="_blank" rel="noopener noreferrer">`,
      `    <div class="gh-card-inner">`,
      `      <div class="gh-card-head">`,
      `        <svg class="gh-card-icon" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`,
      `        <span class="gh-card-full">${full}</span>`,
      branch ? `        <span class="gh-card-branch">${branch}</span>` : '',
      `      </div>`,
      `      <img class="gh-card-og" src="${img}" alt="${full}" loading="lazy" decoding="async" />`,
      `    </div>`,
      `  </a>`,
      `</div>`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function remarkGithubCard() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index == null) return;
      if (!node.children || node.children.length !== 1) return;
      const child = node.children[0];
      if (child.type !== 'text') return;
      const m = child.value.trim().match(GH_RE);
      if (!m) return;
      const parsed = parseRepo(m[1]);
      if (!parsed) return;
      parent.children[index] = makeCard(parsed.owner, parsed.repo, m[2] || '');
    });
  };
}
