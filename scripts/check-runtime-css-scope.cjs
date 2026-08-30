// 审计所有 .astro 页面：运行时 innerHTML 注入的 class 是否都在 is:global 块里定义。
// Astro 给作用域样式加 data-astro-cid-*，只匹配构建时存在的元素；
// 运行时注入的节点没有该属性，写在作用域块里的样式会整体失效（本地 harness 测不出来）。
const fs = require('fs');
const path = require('path');

const ROOT = 'G:/project/xuhome/src';
const files = [];
(function walk(dir) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, n.name);
    if (n.isDirectory()) walk(p);
    else if (n.name.endsWith('.astro')) files.push(p);
  }
})(ROOT);

let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const scripts = [...src.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).join('\n');
  if (!/innerHTML/.test(scripts)) continue;

  const runtime = new Set();
  for (const m of scripts.matchAll(/class="([^"]+)"/g)) {
    m[1].split(/\s+/).forEach((c) => c && !c.includes('$') && runtime.add(c));
  }
  if (!runtime.size) continue;

  const scoped = new Set();
  const global = new Set();
  for (const b of src.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
    const bucket = /is:global/.test(b[1]) ? global : scoped;
    for (const m of b[2].matchAll(/\.([a-zA-Z][\w-]*)/g)) bucket.add(m[1]);
  }

  const broken = [...runtime].filter((c) => !global.has(c) && scoped.has(c));
  if (broken.length) {
    bad++;
    console.log('FAIL', path.relative(ROOT, f));
    console.log('  只在 scoped style 里定义，运行时注入后样式会丢:', broken.join(' '));
  } else {
    console.log('ok  ', path.relative(ROOT, f), `(${runtime.size} runtime classes)`);
  }
}
console.log(bad ? `\n${bad} file(s) with scoping bugs` : '\nall clear');
process.exit(bad ? 1 : 0);
